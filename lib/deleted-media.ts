import fs from "fs";
import path from "path";

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

const STORAGE_DIR = path.join(process.cwd(), ".deleted-media");
const STORAGE_FILE = path.join(STORAGE_DIR, "index.json");

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, "[]", "utf8");
  }
}

export function getDeletedMedia(): DeletedMediaItem[] {
  ensureStorage();

  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeletedMedia(items: DeletedMediaItem[]) {
  ensureStorage();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(items, null, 2), "utf8");
}

export function addDeletedMedia(item: DeletedMediaItem) {
  const items = getDeletedMedia();
  const next = [item, ...items.filter((entry) => entry.key !== item.key)];
  saveDeletedMedia(next);
}

export function removeDeletedMedia(key: string) {
  const filtered = getDeletedMedia().filter((item) => item.key !== key);
  saveDeletedMedia(filtered);
}

export function restoreDeletedLocalFile(item: DeletedMediaItem): boolean {
  if (!item.backupPath || !item.filename) return false;

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
