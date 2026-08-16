import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { insertUploadedMedia } from "@/lib/db";

const ALLOWED_PREFIXES = ["image/", "video/"];
const MAX_BYTES = 4 * 1024 * 1024;

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
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN);

  let blobUrl = "";
  let blobPathname = "";

  try {
    if (hasBlobToken) {
      const blob = await put(file.name, file, { access: "public", addRandomSuffix: true });
      blobUrl = blob.url;
      blobPathname = blob.pathname;
    } else {
      const local = await saveUploadedFileLocally(file);
      blobUrl = local.url;
      blobPathname = local.pathname;
    }
  } catch (error) {
    const local = await saveUploadedFileLocally(file);
    blobUrl = local.url;
    blobPathname = local.pathname;
  }

  if (process.env.DATABASE_URL) {
    await insertUploadedMedia(blobUrl, blobPathname, type);
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true, mode: hasBlobToken ? "blob" : "local" });
}
