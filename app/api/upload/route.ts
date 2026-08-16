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
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

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

  if (!BLOB_TOKEN && !CAN_WRITE_FILES) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình kho lưu trữ file. Vào Vercel → Storage → tạo/kết nối một Blob store cho project này (biến BLOB_READ_WRITE_TOKEN), rồi deploy lại.",
      },
      { status: 503 },
    );
  }

  let blobUrl = "";
  let blobPathname = "";

  try {
    if (BLOB_TOKEN) {
      const blob = await put(file.name, file, {
        access: "public",
        addRandomSuffix: true,
        token: BLOB_TOKEN,
      });
      blobUrl = blob.url;
      blobPathname = blob.pathname;
    } else {
      const local = await saveUploadedFileLocally(file);
      blobUrl = local.url;
      blobPathname = local.pathname;
    }
  } catch (error) {
    // Never fall back to the disk on a read-only host: that is what produced the
    // EROFS 500s instead of a usable error message.
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[upload] failed", { name: file.name, size: file.size, usingBlob: Boolean(BLOB_TOKEN), reason });
    return NextResponse.json(
      { error: `Tải lên thất bại: ${reason}` },
      { status: 502 },
    );
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

  return NextResponse.json({ ok: true, mode: BLOB_TOKEN ? "blob" : "local" });
}
