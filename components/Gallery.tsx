"use client";

import { useEffect, useState } from "react";
import { removeMediaItem } from "@/app/admin/actions";
import type { MediaItem } from "@/lib/media";

export default function Gallery({ items }: { items: MediaItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleRemove = (event: React.FormEvent<HTMLFormElement>, itemName: string) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa "${itemName}" không?`);
    if (!confirmed) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowRight") setActiveIndex((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, items.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-zinc-500">
        Chưa có ảnh hoặc video nào. Bỏ file vào thư mục{" "}
        <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">public/media</code> rồi tải lại trang.
      </div>
    );
  }

  const active = activeIndex !== null ? items[activeIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div key={item.key} className="flex flex-col gap-2">
            <button
              onClick={() => setActiveIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <>
                  <video src={item.src} className="h-full w-full object-cover" muted preload="metadata" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                      ▶
                    </span>
                  </span>
                </>
              )}
            </button>

            <form action={removeMediaItem} onSubmit={(event) => handleRemove(event, item.name)}>
              <input type="hidden" name="key" value={item.key} />
              <button
                type="submit"
                className="w-full rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActiveIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
            onClick={() => setActiveIndex(null)}
            aria-label="Đóng"
          >
            ×
          </button>

          {items.length > 1 && (
            <>
              <button
                className="absolute left-2 sm:left-6 text-white/70 hover:text-white text-4xl px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
                }}
                aria-label="Trước"
              >
                ‹
              </button>
              <button
                className="absolute right-2 sm:right-6 text-white/70 hover:text-white text-4xl px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => (i === null ? i : (i + 1) % items.length));
                }}
                aria-label="Sau"
              >
                ›
              </button>
            </>
          )}

          <div className="max-h-[85vh] max-w-5xl w-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {active.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.src} alt={active.name} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            ) : (
              <video src={active.src} controls autoPlay className="max-h-[80vh] w-auto rounded-lg" />
            )}
            {active.name && <p className="text-sm text-white/70">{active.name}</p>}
          </div>
        </div>
      )}
    </>
  );
}
