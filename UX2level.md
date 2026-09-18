Bạn là Kiến trúc sư phần mềm Enterprise cấp cao, chuyên về hệ thống quản lý bán hàng/kho vận (POS/ERP). 
Hãy viết mã nguồn đầy đủ cho tính năng "Quản lý sản phẩm đa biến thể - đa quy cách - đa giá" theo đặc tả dưới đây.

## STACK CÔNG NGHỆ
- Backend: Node.js + Express + TypeScript + Sequelize
- Frontend: React + TypeScript + TailwindCSS (component dạng bảng lưới lồng nhau/Drawer)
- Validate: Zod (dùng chung schema cho cả FE và BE nếu có thể)

## 1. Lưu ý về DATABASE
- product_inventory (tồn kho LUÔN lưu theo đơn vị gốc nhỏ nhất, quan hệ 1-1 với variant)

Viết kèm seed script mẫu cho 1 sản phẩm có 2 biến thể, mỗi biến thể có 2 quy cách đóng gói (đơn vị gốc + đơn vị quy đổi).

## 2. BACKEND API (REST, có validate + transaction)
Kiếm tra các endpoint sau, đảm bảo tính toàn vẹn dữ liệu bằng DB transaction:

a) POST /products — Tạo sản phẩm mới kèm N biến thể kèm N quy cách/giá trong 1 request (nested payload), dùng transaction để insert cả 4 bảng con.

b) PUT /products/:id — Cập nhật, hỗ trợ thêm/sửa/xóa biến thể và quy cách theo dạng diff (so sánh payload mới với DB).

c) Xử lý nhập/xuất kho theo barcode:
   - Input: { barcode: string, quantity: number, type: 'IN' | 'OUT' }
   - Logic: tra barcode -> lấy conversion_rate & variant_id -> tính base_quantity = quantity * conversion_rate -> cộng/trừ vào product_inventory.quantity
   - Nếu type = 'OUT' và allow_negative_stock = false, phải kiểm tra đủ tồn kho quy đổi trước khi cho phép trừ, nếu không đủ trả lỗi 400 kèm thông điệp rõ ràng.
   - Toàn bộ thao tác nằm trong 1 transaction, có lock row (SELECT ... FOR UPDATE) để tránh race condition khi nhiều lệnh bán cùng lúc trừ chung 1 variant.

d) GET /products/:id/full — Trả về sản phẩm kèm toàn bộ biến thể + quy cách + giá + tồn kho quy đổi tính sẵn (không bắt FE tự tính).

Kiểm tra và viết kèm validate cho từng endpoint nếu chưa có, đảm bảo:
   - retail_price >= cost_price
   - wholesale_price <= retail_price
   - conversion_rate = 1 bắt buộc với đơn vị gốc (unit đầu tiên của variant)
   - barcode là duy nhất toàn hệ thống (unique constraint + check ở tầng service)

## 3. FRONTEND UI (React + TS)
Kiểm tra và tiến hành cập nhật hoặc xây dựng 2 component chính, đúng theo luồng UX "2 tầng lồng nhau":

### a) <VariantMasterGrid />
- Bảng hiển thị danh sách biến thể: Tên biến thể, SKU nội bộ, Tồn kho tổng (đơn vị gốc), nút "Cấu hình Giá & Đơn vị"
- Khi tồn kho = 0, hiển thị badge cảnh báo màu đỏ/vàng

### b) <PricingUnitDrawer />
- Mở dạng Drawer/Modal khi click nút cấu hình của 1 variant cụ thể
- Bảng con: Đơn vị tính | Barcode | Tỷ lệ quy đổi | Giá gốc | Giá bán lẻ | Giá sỉ | Tồn kho quy đổi (read-only, auto tính)
- Dòng đầu tiên (đơn vị gốc) luôn khóa cứng conversion_rate = 1, không cho sửa
- Cột "Tồn kho quy đổi" tự động tính real-time theo công thức: Math.floor(baseQty / conversion_rate) đơn vị nguyên + phần dư (baseQty % conversion_rate) đơn vị gốc — hiển thị dạng "10 Hộp dư 0 Cái"
- Validate real-time ngay trên form (không cần submit mới báo lỗi): retail >= cost, wholesale <= retail, báo lỗi inline dưới từng ô input
- Nút "+ Thêm quy cách đóng gói khác" thêm 1 dòng mới vào bảng con, tự sinh input trống

### c) "Sản phẩm đơn giản"
- Nếu người dùng KHÔNG nhập thuộc tính biến thể nào (không có màu/size...), hệ thống tự động:
  - Tạo 1 product_variant với attributes = {}
  - Tự gán đơn vị mặc định "Cái", conversion_rate = 1
- Viết rõ hàm ensureDefaultVariant() xử lý logic ngầm này ở tầng service (Backend), không để FE tự bịa dữ liệu giả.

## 4. YÊU CẦU BỔ SUNG
- Viết unit test cho: hàm tính tồn kho quy đổi, hàm validate giá, và logic transaction nhập/xuất kho có allow_negative_stock.
- Toàn bộ response lỗi trả theo format chuẩn: { success: false, code: string, message: string }
- Code phải có comment tiếng Việt ngắn gọn ở những đoạn logic nghiệp vụ quan trọng (tính tồn kho, validate giá).
- Viết playwrite test và vitest cho UI tách bạch 2 luồng logic và UI

Hãy bắt đầu bằng việc đưa ra cấu trúc thư mục project, sau đó triển khai từng phần theo thứ tự: Migration -> Backend Service -> API Route -> Frontend Component.