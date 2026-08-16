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
      sql`
        CREATE TABLE IF NOT EXISTS deleted_media (
          key TEXT PRIMARY KEY,
          source TEXT NOT NULL CHECK (source IN ('local', 'blob')),
          type TEXT NOT NULL CHECK (type IN ('image', 'video')),
          name TEXT,
          src TEXT,
          filename TEXT,
          pathname TEXT,
          url TEXT,
          backup_path TEXT,
          deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `,
    ]).then(() => undefined).catch(() => {
      schemaReady = null;
      return undefined;
    });
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
  try {
    await ensureSchema();
    const rows = (await sql`SELECT filename, caption, sort_order FROM media_meta`) as MediaMeta[];
    return new Map(rows.map((row) => [row.filename, row]));
  } catch {
    return new Map();
  }
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
  try {
    await ensureSchema();
    return (await sql`
      SELECT id, url, pathname, type, caption, sort_order
      FROM uploaded_media
      ORDER BY created_at ASC
    `) as UploadedMedia[];
  } catch {
    return [];
  }
}

export async function insertUploadedMedia(url: string, pathname: string, type: "image" | "video") {
  if (!sql) return null;
  try {
    await ensureSchema();
    const rows = (await sql`
      INSERT INTO uploaded_media (url, pathname, type)
      VALUES (${url}, ${pathname}, ${type})
      RETURNING id, url, pathname, type, caption, sort_order
    `) as UploadedMedia[];
    return rows[0];
  } catch {
    return null;
  }
}

export async function updateUploadedMediaMeta(id: number, caption: string, sortOrder: number | null) {
  if (!sql) return;
  try {
    await ensureSchema();
    await sql`
      UPDATE uploaded_media
      SET caption = ${caption}, sort_order = ${sortOrder}
      WHERE id = ${id}
    `;
  } catch {
    // Ignore DB failures so the page remains usable even when the database is unavailable.
  }
}

export async function deleteUploadedMediaRow(id: number): Promise<string | null> {
  if (!sql) return null;
  try {
    await ensureSchema();
    const rows = (await sql`DELETE FROM uploaded_media WHERE id = ${id} RETURNING url`) as { url: string }[];
    return rows[0]?.url ?? null;
  } catch {
    return null;
  }
}

export async function deleteMediaMeta(filename: string) {
  if (!sql) return;
  try {
    await ensureSchema();
    await sql`DELETE FROM media_meta WHERE filename = ${filename}`;
  } catch {
    // Ignore DB failures so the UI can still render from local files.
  }
}

export type DeletedMediaRow = {
  key: string;
  source: "local" | "blob";
  type: "image" | "video";
  name: string | null;
  src: string | null;
  filename: string | null;
  pathname: string | null;
  url: string | null;
  backup_path: string | null;
  deleted_at: string;
};

export async function getDeletedMediaRows(): Promise<DeletedMediaRow[]> {
  if (!sql) return [];
  try {
    await ensureSchema();
    return (await sql`
      SELECT key, source, type, name, src, filename, pathname, url, backup_path, deleted_at
      FROM deleted_media
      ORDER BY deleted_at DESC
    `) as DeletedMediaRow[];
  } catch {
    return [];
  }
}

export async function insertDeletedMediaRow(row: Omit<DeletedMediaRow, "deleted_at">) {
  if (!sql) return false;
  try {
    await ensureSchema();
    await sql`
      INSERT INTO deleted_media (key, source, type, name, src, filename, pathname, url, backup_path, deleted_at)
      VALUES (
        ${row.key}, ${row.source}, ${row.type}, ${row.name}, ${row.src},
        ${row.filename}, ${row.pathname}, ${row.url}, ${row.backup_path}, now()
      )
      ON CONFLICT (key) DO UPDATE SET
        source = ${row.source},
        type = ${row.type},
        name = ${row.name},
        src = ${row.src},
        filename = ${row.filename},
        pathname = ${row.pathname},
        url = ${row.url},
        backup_path = ${row.backup_path},
        deleted_at = now()
    `;
    return true;
  } catch {
    return false;
  }
}

export async function deleteDeletedMediaRow(key: string) {
  if (!sql) return false;
  try {
    await ensureSchema();
    await sql`DELETE FROM deleted_media WHERE key = ${key}`;
    return true;
  } catch {
    return false;
  }
}
