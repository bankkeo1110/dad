"use server";

import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isValidAdminSession } from "@/lib/auth";
import {
  upsertMediaMeta,
  updateUploadedMediaMeta,
  deleteUploadedMediaRow,
  deleteMediaMeta,
  insertUploadedMedia,
  getAllUploadedMedia,
  getAllMediaMeta,
} from "@/lib/db";
import {
  CAN_WRITE_FILES,
  addDeletedMedia,
  getDeletedMedia,
  removeDeletedMedia,
  restoreDeletedLocalFile,
} from "@/lib/deleted-media";

const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v"];

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

  const rows = await getAllUploadedMedia();
  const row = rows.find((item) => item.id === id);
  if (row) {
    await addDeletedMedia({
      id: `blob:${id}`,
      key: `blob:${id}`,
      source: "blob",
      type: row.type,
      name: row.caption ?? row.pathname,
      src: row.url,
      pathname: row.pathname,
      url: row.url,
      deletedAt: new Date().toISOString(),
    });
  }

  // The blob itself is kept so "Restore" can bring the item back; deleting it here
  // would leave the restored row pointing at a dead URL.
  await deleteUploadedMediaRow(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function removeMediaItem(formData: FormData) {
  const itemKey = formData.get("key");
  if (typeof itemKey !== "string" || !itemKey) return;

  if (itemKey.startsWith("local:")) {
    const filename = itemKey.slice("local:".length);
    if (!filename) return;

    const lower = filename.toLowerCase();
    const meta = await getAllMediaMeta();
    const filePath = path.join(process.cwd(), "public", "media", filename);
    let backupPath: string | undefined;

    // Only a writable host can move the file aside; elsewhere the deleted record
    // itself hides the file from the gallery.
    if (CAN_WRITE_FILES && fs.existsSync(filePath)) {
      const backupDir = path.join(process.cwd(), ".deleted-media", "backups");
      backupPath = path.join(backupDir, `${Date.now()}-${filename}`);
      fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(filePath, backupPath);
    }

    await addDeletedMedia({
      id: itemKey,
      key: itemKey,
      source: "local",
      type: VIDEO_EXT.some((ext) => lower.endsWith(ext)) ? "video" : "image",
      name: meta.get(filename)?.caption ?? "",
      src: `/media/${filename}`,
      filename,
      backupPath,
      deletedAt: new Date().toISOString(),
    });

    if (backupPath) {
      await fs.promises.unlink(filePath);
    }
    await deleteMediaMeta(filename);
  }

  if (itemKey.startsWith("blob:")) {
    const id = Number(itemKey.slice("blob:".length));
    if (!Number.isFinite(id)) return;

    const rows = await getAllUploadedMedia();
    const row = rows.find((item) => item.id === id);
    if (row) {
      await addDeletedMedia({
        id: itemKey,
        key: itemKey,
        source: "blob",
        type: row.type,
        name: row.caption ?? row.pathname,
        src: row.url,
        pathname: row.pathname,
        url: row.url,
        deletedAt: new Date().toISOString(),
      });
    }

    // Keep the blob so "Restore" works — see deleteUploaded.
    await deleteUploadedMediaRow(id);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function restoreDeleted(formData: FormData) {
  await requireAdmin();

  const key = formData.get("key");
  if (typeof key !== "string" || !key) return;

  const deleted = (await getDeletedMedia()).find((item) => item.key === key);
  if (!deleted) return;

  if (deleted.source === "local" && deleted.filename) {
    // On a writable host the file was moved to a backup and has to be copied back.
    // On a read-only host it never left public/media, so dropping the deleted
    // record below is all it takes to un-hide it.
    restoreDeletedLocalFile(deleted);
    if (deleted.name) {
      await upsertMediaMeta(deleted.filename, deleted.name, null);
    }
  }

  if (deleted.source === "blob" && deleted.url && deleted.pathname && deleted.type) {
    const inserted = await insertUploadedMedia(deleted.url, deleted.pathname, deleted.type);
    if (inserted) {
      await updateUploadedMediaMeta(inserted.id, deleted.name ?? "", null);
    }
  }

  await removeDeletedMedia(key);
  revalidatePath("/");
  revalidatePath("/admin");
}
