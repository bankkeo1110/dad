import fs from "fs";
import path from "path";
import { getAllMediaMeta } from "@/lib/db";

export type MediaItem = {
  filename: string;
  src: string;
  type: "image" | "video";
  name: string;
  sortOrder: number | null;
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);

const MEDIA_DIR = path.join(process.cwd(), "public", "media");

function prettyName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function listMediaFiles(): { filename: string; type: "image" | "video" }[] {
  if (!fs.existsSync(MEDIA_DIR)) return [];

  return fs
    .readdirSync(MEDIA_DIR)
    .filter((file) => !file.startsWith("."))
    .map((file) => {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXT.has(ext)) return { filename: file, type: "image" as const };
      if (VIDEO_EXT.has(ext)) return { filename: file, type: "video" as const };
      return null;
    })
    .filter((item): item is { filename: string; type: "image" | "video" } => item !== null);
}

export async function getMediaItems(): Promise<MediaItem[]> {
  const files = listMediaFiles();
  const meta = await getAllMediaMeta();

  const items: MediaItem[] = files.map(({ filename, type }) => {
    const row = meta.get(filename);
    return {
      filename,
      src: `/media/${filename}`,
      type,
      name: row?.caption?.trim() || prettyName(filename),
      sortOrder: row?.sort_order ?? null,
    };
  });

  return items.sort((a, b) => {
    if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    return a.name.localeCompare(b.name, "vi");
  });
}

export function listMediaFilenames(): { filename: string; type: "image" | "video" }[] {
  return listMediaFiles();
}
