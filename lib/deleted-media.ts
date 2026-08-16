import fs from "fs";
import path from "path";
import {
  sql,
  getDeletedMediaRows,
  insertDeletedMediaRow,
  deleteDeletedMediaRow,
  type DeletedMediaRow,
} from "@/lib/db";

export type DeletedMediaItem = {
  id: string;
  key: string;
  source: "local" | "blob";
  type: "image" | "video";
  name: string;
  src: string;
  filename?: string;
  pathname?: string;
  url?: string;
  backupPath?: string;
  deletedAt: string;
};

// Vercel's function filesystem is read-only apart from /tmp (which is wiped between
// invocations), so the JSON-file store only works when running on a real disk.
export const CAN_WRITE_FILES = !process.env.VERCEL;

const STORAGE_DIR = path.join(process.cwd(), ".deleted-media");
const STORAGE_FILE = path.join(STORAGE_DIR, "index.json");

function rowToItem(row: DeletedMediaRow): DeletedMediaItem {
  return {
    id: row.key,
    key: row.key,
    source: row.source,
    type: row.type,
    name: row.name ?? "",
    src: row.src ?? row.url ?? "",
    filename: row.filename ?? undefined,
    pathname: row.pathname ?? undefined,
    url: row.url ?? undefined,
    backupPath: row.backup_path ?? undefined,
    deletedAt: new Date(row.deleted_at).toISOString(),
  };
}

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, "[]", "utf8");
  }
}

function readFileStore(): DeletedMediaItem[] {
  try {
    ensureStorage();
    const parsed = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileStore(items: DeletedMediaItem[]) {
  try {
    ensureStorage();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(items, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function getDeletedMedia(): Promise<DeletedMediaItem[]> {
  if (sql) return (await getDeletedMediaRows()).map(rowToItem);
  if (CAN_WRITE_FILES) return readFileStore();
  return [];
}

export async function addDeletedMedia(item: DeletedMediaItem) {
  if (sql) {
    const stored = await insertDeletedMediaRow({
      key: item.key,
      source: item.source,
      type: item.type,
      name: item.name,
      src: item.src,
      filename: item.filename ?? null,
      pathname: item.pathname ?? null,
      url: item.url ?? null,
      backup_path: item.backupPath ?? null,
    });
    if (stored) return true;
  }

  if (!CAN_WRITE_FILES) return false;
  return writeFileStore([item, ...readFileStore().filter((entry) => entry.key !== item.key)]);
}

export async function removeDeletedMedia(key: string) {
  if (sql) {
    const removed = await deleteDeletedMediaRow(key);
    if (removed) return true;
  }

  if (!CAN_WRITE_FILES) return false;
  return writeFileStore(readFileStore().filter((item) => item.key !== key));
}

export function restoreDeletedLocalFile(item: DeletedMediaItem): boolean {
  if (!CAN_WRITE_FILES || !item.backupPath || !item.filename) return false;

  const targetPath = path.join(process.cwd(), "public", "media", item.filename);
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(item.backupPath, targetPath);
    if (fs.existsSync(item.backupPath)) {
      fs.unlinkSync(item.backupPath);
    }
    return true;
  } catch {
    return false;
  }
}
