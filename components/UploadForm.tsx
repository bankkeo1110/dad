"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const files = inputRef.current?.files;
    if (!files || files.length === 0) {
      setStatus("Vui lòng chọn ảnh hoặc video trước khi bấm Upload.");
      return;
    }

    setBusy(true);
    let done = 0;
    const total = files.length;

    for (const file of Array.from(files)) {
      setStatus(`Đang tải lên ${done + 1}/${total}: ${file.name}`);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Lỗi máy chủ (${res.status})`);
        }
        done++;
      } catch (err) {
        setStatus(`Lỗi khi tải "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
        setBusy(false);
        return;
      }
    }

    setStatus(`Đã tải lên ${done}/${total} file.`);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tải ảnh/video lên</label>
      <input
        ref={inputRef}
        type="file"
        name="files"
        accept="image/*,video/*"
        multiple
        className="text-sm text-zinc-600 dark:text-zinc-400"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-fit rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {busy ? "Đang tải lên..." : "Upload"}
      </button>
      {status && <p className="text-sm text-zinc-500">{status}</p>}
      <p className="text-xs text-zinc-400">Ảnh/video tối đa 4MB mỗi file qua web.</p>
    </form>
  );
}
