"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { isValidAdminSession } from "@/lib/auth";
import {
  upsertMediaMeta,
  insertUploadedMedia,
  updateUploadedMediaMeta,
  deleteUploadedMediaRow,
} from "@/lib/db";

async function requireAdmin() {
  const store = await cookies();
  if (!isValidAdminSession(store.get("admin_auth")?.value)) {
    throw new Error("Unauthorized");
  }
}

function parseSortOrder(raw: FormDataEntryValue | null): number | null {
  return typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
}

export async function login(formData: FormData) {
  const password = formData.get("password");
  if (typeof password === "string" && Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD) {
    const store = await cookies();
    store.set("admin_auth", password, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  revalidatePath("/admin");
}

export async function logout() {
  const store = await cookies();
  store.delete("admin_auth");
  revalidatePath("/admin");
}

export async function saveMeta(formData: FormData) {
  await requireAdmin();

  const filename = formData.get("filename");
  const caption = formData.get("caption");
  if (typeof filename !== "string" || !filename) return;

  await upsertMediaMeta(filename, typeof caption === "string" ? caption : "", parseSortOrder(formData.get("sortOrder")));
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function recordUpload(url: string, pathname: string, contentType: string) {
  // Public: the homepage upload form lets anyone with the link add photos,
  // while editing captions/order and deleting stay behind admin login.
  const type = contentType.startsWith("video/") ? "video" : "image";
  await insertUploadedMedia(url, pathname, type);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveUploadedMeta(formData: FormData) {
  await requireAdmin();

  const idRaw = formData.get("id");
  const caption = formData.get("caption");
  const id = typeof idRaw === "string" ? Number(idRaw) : NaN;
  if (!Number.isFinite(id)) return;

  await updateUploadedMediaMeta(id, typeof caption === "string" ? caption : "", parseSortOrder(formData.get("sortOrder")));
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteUploaded(formData: FormData) {
  await requireAdmin();

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? Number(idRaw) : NaN;
  if (!Number.isFinite(id)) return;

  const url = await deleteUploadedMediaRow(id);
  if (url) {
    await del(url);
  }
  revalidatePath("/");
  revalidatePath("/admin");
}
