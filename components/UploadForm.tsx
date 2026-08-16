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
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-stone-200 bg-white/75 p-4 shadow-[0_18px_50px_rgba(79,52,37,0.08)] backdrop-blur-xl sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Thư viện</p>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">Tải ảnh hoặc video mới</h2>
        </div>
        <div className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600">
          {busy ? "Đang xử lý" : "Sẵn sàng"}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <label className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-gradient-to-r from-stone-50 to-amber-50 px-4 py-5 text-sm font-medium text-stone-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-white hover:shadow-md">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-base text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            +
          </span>
          <span className="text-base text-stone-700">{selectedFiles.length > 0 ? "Thay đổi file" : "Chọn file"}</span>
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
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((fileName) => (
              <span
                key={fileName}
                className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700"
              >
                {fileName}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy ? "Đang tải lên..." : "Upload lên thư viện"}
          </button>

          <p className="text-xs text-stone-500">Ảnh/video tối đa 4MB mỗi file qua web.</p>
        </div>
      </div>

      {status && <p className="mt-4 text-sm text-stone-600">{status}</p>}
    </form>
  );
}
