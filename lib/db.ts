import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS media_meta (
        filename TEXT PRIMARY KEY,
        caption TEXT,
        sort_order INTEGER,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.then(() => undefined);
  }
  return schemaReady;
}

export type MediaMeta = {
  filename: string;
  caption: string | null;
  sort_order: number | null;
};

export async function getAllMediaMeta(): Promise<Map<string, MediaMeta>> {
  await ensureSchema();
  const rows = (await sql`SELECT filename, caption, sort_order FROM media_meta`) as MediaMeta[];
  return new Map(rows.map((row) => [row.filename, row]));
}

export async function upsertMediaMeta(filename: string, caption: string, sortOrder: number | null) {
  await ensureSchema();
  await sql`
    INSERT INTO media_meta (filename, caption, sort_order, updated_at)
    VALUES (${filename}, ${caption}, ${sortOrder}, now())
    ON CONFLICT (filename)
    DO UPDATE SET caption = ${caption}, sort_order = ${sortOrder}, updated_at = now()
  `;
}
