import { neon } from "@neondatabase/serverless";

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!sql) {
    return Promise.resolve();
  }

  if (!schemaReady) {
    schemaReady = Promise.all([
      sql`
        CREATE TABLE IF NOT EXISTS media_meta (
          filename TEXT PRIMARY KEY,
          caption TEXT,
          sort_order INTEGER,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS uploaded_media (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL,
          pathname TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('image', 'video')),
          caption TEXT,
          sort_order INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `,
    ]).then(() => undefined);
  }
  return schemaReady;
}

export type MediaMeta = {
  filename: string;
  caption: string | null;
  sort_order: number | null;
};

export async function getAllMediaMeta(): Promise<Map<string, MediaMeta>> {
  if (!sql) return new Map();
  await ensureSchema();
  const rows = (await sql`SELECT filename, caption, sort_order FROM media_meta`) as MediaMeta[];
  return new Map(rows.map((row) => [row.filename, row]));
}

export async function upsertMediaMeta(filename: string, caption: string, sortOrder: number | null) {
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO media_meta (filename, caption, sort_order, updated_at)
    VALUES (${filename}, ${caption}, ${sortOrder}, now())
    ON CONFLICT (filename)
    DO UPDATE SET caption = ${caption}, sort_order = ${sortOrder}, updated_at = now()
  `;
}

export type UploadedMedia = {
  id: number;
  url: string;
  pathname: string;
  type: "image" | "video";
  caption: string | null;
  sort_order: number | null;
};

export async function getAllUploadedMedia(): Promise<UploadedMedia[]> {
  if (!sql) return [];
  await ensureSchema();
  return (await sql`
    SELECT id, url, pathname, type, caption, sort_order
    FROM uploaded_media
    ORDER BY created_at ASC
  `) as UploadedMedia[];
}

export async function insertUploadedMedia(url: string, pathname: string, type: "image" | "video") {
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`
    INSERT INTO uploaded_media (url, pathname, type)
    VALUES (${url}, ${pathname}, ${type})
    RETURNING id, url, pathname, type, caption, sort_order
  `) as UploadedMedia[];
  return rows[0];
}

export async function updateUploadedMediaMeta(id: number, caption: string, sortOrder: number | null) {
  if (!sql) return;
  await ensureSchema();
  await sql`
    UPDATE uploaded_media
    SET caption = ${caption}, sort_order = ${sortOrder}
    WHERE id = ${id}
  `;
}

export async function deleteUploadedMediaRow(id: number): Promise<string | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`DELETE FROM uploaded_media WHERE id = ${id} RETURNING url`) as { url: string }[];
  return rows[0]?.url ?? null;
}

export async function deleteMediaMeta(filename: string) {
  if (!sql) return;
  await ensureSchema();
  await sql`DELETE FROM media_meta WHERE filename = ${filename}`;
}
