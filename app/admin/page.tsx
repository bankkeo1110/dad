import { cookies } from "next/headers";
import { listMediaFilenames } from "@/lib/media";
import { getAllMediaMeta, getAllUploadedMedia } from "@/lib/db";
import { isValidAdminSession } from "@/lib/auth";
import { login, logout, saveMeta, saveUploadedMeta, deleteUploaded } from "./actions";
import UploadForm from "@/components/UploadForm";

export default async function AdminPage() {
  const store = await cookies();
  const authed = isValidAdminSession(store.get("admin_auth")?.value);

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Đăng nhập quản lý</h1>
        <form action={login} className="flex flex-col gap-3">
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            required
            autoFocus
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-50 dark:text-zinc-900">
            Đăng nhập
          </button>
        </form>
      </div>
    );
  }

  const files = listMediaFilenames();
  const [meta, uploaded] = await Promise.all([getAllMediaMeta(), getAllUploadedMedia()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Quản lý ảnh/video</h1>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-zinc-500 underline">
            Về trang chính
          </a>
          <form action={logout}>
            <button className="text-sm text-zinc-500 underline">Đăng xuất</button>
          </form>
        </div>
      </div>

      <UploadForm />

      {uploaded.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">File đã tải lên ({uploaded.length})</h2>
          <div className="mb-8 flex flex-col gap-3">
            {uploaded.map((row) => (
              <form
                key={row.id}
                action={saveUploadedMeta}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <input type="hidden" name="id" value={row.id} />
                <span className="w-16 shrink-0 text-xs uppercase text-zinc-400">{row.type}</span>
                <input
                  name="caption"
                  defaultValue={row.caption ?? ""}
                  placeholder="Chú thích"
                  className="min-w-[160px] flex-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={row.sort_order ?? ""}
                  placeholder="Thứ tự"
                  className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button type="submit" className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900">
                  Lưu
                </button>
                <button
                  type="submit"
                  formAction={deleteUploaded}
                  className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 dark:border-red-800"
                >
                  Xóa
                </button>
              </form>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-semibold text-zinc-500">File có sẵn trong dự án ({files.length})</h2>

      {files.length === 0 && (
        <p className="text-zinc-500">
          Chưa có file nào trong <code>public/media</code>.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {files.map(({ filename }) => {
          const row = meta.get(filename);
          return (
            <form
              key={filename}
              action={saveMeta}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <input type="hidden" name="filename" value={filename} />
              <span className="w-40 truncate text-sm text-zinc-500" title={filename}>
                {filename}
              </span>
              <input
                name="caption"
                defaultValue={row?.caption ?? ""}
                placeholder="Chú thích"
                className="min-w-[160px] flex-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <input
                name="sortOrder"
                type="number"
                defaultValue={row?.sort_order ?? ""}
                placeholder="Thứ tự"
                className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button type="submit" className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900">
                Lưu
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
