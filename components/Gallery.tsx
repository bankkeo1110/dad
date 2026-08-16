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
      <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/60 p-10 text-center text-stone-600 shadow-[0_18px_40px_rgba(59,45,35,0.04)]">
        Chưa có ảnh hoặc video nào. Bỏ file vào thư mục{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">public/media</code> rồi tải lại trang.
      </div>
    );
  }

  const active = activeIndex !== null ? items[activeIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item, i) => (
          <div key={item.key} className="group flex flex-col gap-2">
            <button
              onClick={() => setActiveIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-[22px] border border-stone-200 bg-white shadow-[0_15px_30px_rgba(60,43,28,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_35px_rgba(60,43,28,0.12)] focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                  <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg text-white backdrop-blur-sm">
                      ▶
                    </span>
                  </span>
                </>
              )}
            </button>

            <form action={removeMediaItem} onSubmit={(event) => handleRemove(event, item.name)} className="mt-[-2px]">
              <input type="hidden" name="key" value={item.key} />
              <button
                type="submit"
                className="w-full rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setActiveIndex(null)}
        >
          <button
            className="absolute right-4 top-4 text-3xl leading-none text-white/80 transition hover:text-white"
            onClick={() => setActiveIndex(null)}
            aria-label="Đóng"
          >
            ×
          </button>

          {items.length > 1 && (
            <>
              <button
                className="absolute left-2 px-2 text-4xl text-white/70 transition hover:text-white sm:left-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
                }}
                aria-label="Trước"
              >
                ‹
              </button>
              <button
                className="absolute right-2 px-2 text-4xl text-white/70 transition hover:text-white sm:right-6"
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

          <div className="flex w-full max-w-5xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {active.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.src} alt={active.name} className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-[0_25px_70px_rgba(0,0,0,0.35)]" />
            ) : (
              <video src={active.src} controls autoPlay className="max-h-[80vh] w-auto rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.35)]" />
            )}
            {active.name && <p className="text-sm text-white/75">{active.name}</p>}
          </div>
        </div>
      )}
    </>
  );
}
