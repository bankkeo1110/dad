import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { insertUploadedMedia } from "@/lib/db";

const ALLOWED_PREFIXES = ["image/", "video/"];
const MAX_BYTES = 4 * 1024 * 1024;

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

  const blob = await put(file.name, file, { access: "public", addRandomSuffix: true });
  const type = file.type.startsWith("video/") ? "video" : "image";
  await insertUploadedMedia(blob.url, blob.pathname, type);

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}
