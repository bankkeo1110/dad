import { getMediaItems } from "@/lib/media";
import Gallery from "@/components/Gallery";

export default async function Home() {
  const items = await getMediaItems();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Kỷ niệm về Ba
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            {items.length > 0
              ? `${items.length} khoảnh khắc được lưu giữ`
              : "Nơi lưu giữ những hình ảnh và video về Ba"}
          </p>
        </header>

        <Gallery items={items} />
      </main>

      <footer className="py-6 text-center text-xs text-zinc-400">
        Made with love ❤ ·{" "}
        <a href="/admin" className="underline hover:text-zinc-500">
          Quản lý ảnh
        </a>
      </footer>
    </div>
  );
}
