# Kỷ niệm về Ba

Trang gallery đơn giản để lưu giữ hình ảnh và video về Ba.

## Cách thêm ảnh/video

Copy file ảnh (`.jpg`, `.png`, `.gif`, `.webp`) hoặc video (`.mp4`, `.webm`, `.mov`) vào thư mục:

```
public/media/
```

Trang sẽ tự động hiển thị tất cả file trong thư mục đó, sắp xếp theo tên. Tên file (bỏ đuôi, gạch nối/gạch dưới thay bằng khoảng trắng) sẽ được dùng làm chú thích khi xem ảnh phóng to — ví dụ `chuyen-di-bien.jpg` sẽ hiện chú thích "chuyen di bien".

## Chạy thử ở máy

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Deploy lên internet (chia sẻ link cho người thân)

1. Đẩy code (bao gồm cả ảnh/video trong `public/media`) lên GitHub.
2. Import repo vào [Vercel](https://vercel.com/new) và bấm Deploy.

Lưu ý: vì ảnh/video nằm trong repo, tránh đưa file quá lớn (video dài) — nên nén/resize trước khi thêm vào.
