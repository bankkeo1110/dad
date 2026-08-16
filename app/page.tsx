import { getMediaItems } from "@/lib/media";
import Gallery from "@/components/Gallery";
import UploadForm from "@/components/UploadForm";

export default async function Home() {
  const items = await getMediaItems();

  return (
    <div className="min-h-screen text-stone-800">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="rounded-[32px] border border-stone-200/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(70,45,25,0.08)] backdrop-blur-xl sm:p-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                Family archive
              </span>
              <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                {items.length} khoảnh khắc
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-stone-500">
                  Tri ân và tưởng nhớ
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                  Kỷ niệm về Ba
                </h1>
              </div>

              <p className="max-w-xl text-sm leading-6 text-stone-600 sm:text-base">
                {items.length > 0
                  ? `Một nơi lưu giữ ${items.length} hình ảnh và video đáng nhớ, để mỗi khoảnh khắc luôn ở bên ta.`
                  : "Nơi lưu giữ những hình ảnh và video về Ba, nơi tình yêu và ký ức được giữ gìn từng ngày."}
              </p>
            </div>
          </div>
        </header>

        <div className="mb-8">
          <UploadForm />
        </div>

        <Gallery items={items} />
      </main>

      <footer className="px-4 pb-10 pt-4 text-center text-xs text-stone-500">
        Made with love ❤ ·{" "}
        <a href="/admin" className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900">
          Quản lý ảnh
        </a>
      </footer>
    </div>
  );
}
