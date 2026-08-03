"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { upsertMediaMeta } from "@/lib/db";

export async function login(formData: FormData) {
  const password = formData.get("password");
  if (typeof password === "string" && password.length > 0 && password === process.env.ADMIN_PASSWORD) {
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
  const store = await cookies();
  if (store.get("admin_auth")?.value !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }

  const filename = formData.get("filename");
  const caption = formData.get("caption");
  const sortOrderRaw = formData.get("sortOrder");
  if (typeof filename !== "string" || !filename) return;

  const sortOrder =
    typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== "" && Number.isFinite(Number(sortOrderRaw))
      ? Number(sortOrderRaw)
      : null;

  await upsertMediaMeta(filename, typeof caption === "string" ? caption : "", sortOrder);
  revalidatePath("/");
  revalidatePath("/admin");
}
