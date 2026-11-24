# Ảnh Cưới — Photo Review

Ứng dụng Next.js để xem ảnh trong thư mục dự án, phóng to/thu nhỏ, chuyển ảnh và lưu danh sách ảnh yêu thích.

## Bắt đầu

1. Cài Node.js bản LTS.
2. Chạy `npm install`.
3. Thêm ảnh JPG, PNG, WebP, GIF, AVIF hoặc BMP vào `public/photos`.
4. Chạy `npm run dev`, sau đó mở địa chỉ được hiển thị trong terminal (thường là `http://localhost:3000`).

Ảnh được sắp xếp theo tên tệp. Nút **Chọn ảnh này** lưu ngay tên các ảnh được chọn vào `data/selected-images.json`. Thư mục và file dữ liệu sẽ được tạo khi lưu ảnh đầu tiên.

Phím tắt: `←` / `→` chuyển ảnh, `+` / `−` phóng to/thu nhỏ. Nhấp đúp ảnh để đổi giữa kích thước vừa khung và phóng to.

> Việc ghi file lựa chọn cần ứng dụng chạy trên máy chủ Node.js có quyền ghi vào thư mục project; môi trường triển khai chỉ đọc như một số dịch hosting có thể không hỗ trợ lưu file này.
