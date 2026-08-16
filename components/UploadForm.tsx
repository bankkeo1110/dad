"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const router = useRouter();

  function handleFileChange() {
    const files = Array.from(inputRef.current?.files ?? []);
    setSelectedFiles(files.map((file) => file.name));
    if (files.length > 0) {
      setStatus(`${files.length} file đã chọn.`);
    } else {
      setStatus(null);
    }
  }

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
    setSelectedFiles([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/40">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tải ảnh/video lên</label>

      <div className="flex flex-col gap-2">
        <label className="group inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-400 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-white hover:text-zinc-900 hover:shadow-md dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-base transition-transform duration-200 group-hover:scale-110 dark:bg-zinc-700">
            📎
          </span>
          <span className="underline-offset-4 transition group-hover:underline">{selectedFiles.length > 0 ? "Thay đổi file" : "Choose Files"}</span>
          <input
            ref={inputRef}
            type="file"
            name="files"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {selectedFiles.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {selectedFiles.length <= 3 ? selectedFiles.join(", ") : `${selectedFiles.length} file đã chọn`}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-fit rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {busy ? "Đang tải lên..." : "Upload"}
      </button>

      {status && <p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p>}
      <p className="text-xs text-zinc-400">Ảnh/video tối đa 4MB mỗi file qua web.</p>
    </form>
  );
}
