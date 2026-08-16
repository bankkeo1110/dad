import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/auth";

// Diagnostic for "which Blob store is this deployment actually using?". Admin-gated,
// and it reports variable names only — never token values.
export async function GET() {
  const store = await cookies();
  if (!isValidAdminSession(store.get("admin_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenNames = Object.entries(process.env)
    .filter(([name, value]) => name.endsWith("READ_WRITE_TOKEN") && typeof value === "string" && value.length > 0)
    .map(([name, value]) => ({
      name,
      looksLikeBlobToken: (value as string).startsWith("vercel_blob_rw_"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    onVercel: Boolean(process.env.VERCEL),
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    tokenNames,
  });
}
