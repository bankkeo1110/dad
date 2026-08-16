import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { insertUploadedMedia } from "@/lib/db";

const ALLOWED_PREFIXES = ["image/", "video/"];
const MAX_BYTES = 4 * 1024 * 1024;

// On Vercel the deployment filesystem is read-only (only /tmp is writable, and it is
// wiped between invocations), so uploads must go to Blob storage there. The local disk
// path exists purely so `next dev` works without a Blob store.
const CAN_WRITE_FILES = !process.env.VERCEL;

// Vercel names the read-write token BLOB_READ_WRITE_TOKEN only for the first store
// connected to a project; additional stores get a prefixed name (DAD_READ_WRITE_TOKEN
// and so on) that cannot be renamed. Discover the token by shape instead, so the
// gallery keeps working whichever store is attached.
function blobTokenCandidates(): { name: string; token: string }[] {
  const found = Object.entries(process.env)
    .filter(
      ([name, value]) =>
        name.endsWith("READ_WRITE_TOKEN") && typeof value === "string" && value.startsWith("vercel_blob_rw_"),
    )
    .map(([name, value]) => ({ name, token: value as string }));

  // Prefer the canonical name, then stay deterministic across invocations.
  return found.sort((a, b) => {
    if (a.name === "BLOB_READ_WRITE_TOKEN") return -1;
    if (b.name === "BLOB_READ_WRITE_TOKEN") return 1;
    return a.name.localeCompare(b.name);
  });
}

function sanitizeUploadName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|]+/g, "")
    .slice(0, 200) || "upload-file";
}

async function saveUploadedFileLocally(file: File) {
  const uploadsDir = path.join(process.cwd(), "public", "media");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const sanitized = sanitizeUploadName(`${Date.now()}-${file.name}`);
  const targetPath = path.join(uploadsDir, sanitized);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(targetPath, buffer);

  return {
    url: `/media/${sanitized}`,
    pathname: sanitized,
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Không có file nào được gửi lên." }, { status: 400 });
  }
  if (!ALLOWED_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    return NextResponse.json({ error: "Chỉ chấp nhận file ảnh hoặc video." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB) — tối đa ${MAX_BYTES / 1024 / 1024}MB qua web.` },
      { status: 400 },
    );
  }

  const type = file.type.startsWith("video/") ? "video" : "image";
  const candidates = blobTokenCandidates();

  if (candidates.length === 0 && !CAN_WRITE_FILES) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình kho lưu trữ file. Vào Vercel → Storage → kết nối một Blob store (access: public) cho project này, rồi deploy lại.",
      },
      { status: 503 },
    );
  }

  let blobUrl = "";
  let blobPathname = "";

  if (candidates.length > 0) {
    // A private store rejects access: 'public', so try each connected store rather
    // than assuming the first one is the public gallery store.
    const failures: string[] = [];

    for (const { name, token } of candidates) {
      try {
        const blob = await put(file.name, file, { access: "public", addRandomSuffix: true, token });
        blobUrl = blob.url;
        blobPathname = blob.pathname;
        console.log("[upload] stored via", name, blob.pathname);
        break;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error("[upload] blob put failed", { tokenName: name, file: file.name, reason });
        failures.push(`${name}: ${reason}`);
      }
    }

    if (!blobUrl) {
      // Never fall back to the disk on a read-only host: that is what produced the
      // EROFS 500s instead of a usable error message.
      return NextResponse.json({ error: `Tải lên thất bại: ${failures.join(" | ")}` }, { status: 502 });
    }
  } else {
    try {
      const local = await saveUploadedFileLocally(file);
      blobUrl = local.url;
      blobPathname = local.pathname;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: `Tải lên thất bại: ${reason}` }, { status: 502 });
    }
  }

  if (process.env.DATABASE_URL) {
    const inserted = await insertUploadedMedia(blobUrl, blobPathname, type);
    if (!inserted) {
      console.error("[upload] stored file but failed to record it in the database", { url: blobUrl });
      return NextResponse.json(
        { error: "Đã tải file lên nhưng không lưu được vào cơ sở dữ liệu. Vui lòng kiểm tra DATABASE_URL." },
        { status: 500 },
      );
    }
  } else if (!CAN_WRITE_FILES) {
    return NextResponse.json(
      { error: "Chưa cấu hình DATABASE_URL nên file tải lên sẽ không hiển thị được trong thư viện." },
      { status: 503 },
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true, mode: candidates.length > 0 ? "blob" : "local" });
}
