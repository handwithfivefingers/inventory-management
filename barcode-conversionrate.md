# Refactor Barcode/Conversion Rate cho hệ thống Inventory (MySQL + Sequelize-TypeScript)

Bối cảnh hệ thống hiện tại:

Dùng MySQL + Sequelize ORM với cú pháp sequelize-typescript (decorator-based: @Table, @Column, @ForeignKey, @BelongsTo, @HasMany...).
Đã có model Unit (đơn vị tính), scope theo vendorId (hệ thống multi-vendor) — mỗi vendor tự quản lý danh mục đơn vị riêng.
Đã có các tính năng inventory cơ bản (nhập/xuất/tồn kho) — không viết lại từ đầu, chỉ bổ sung/refactor phần còn thiếu.
Vấn đề hiện tại: barcode đang lưu trực tiếp trên ProductVariant (1 variant = 1 barcode), chưa có khái niệm conversion_rate để bán theo nhiều đơn vị (VD: Thùng/Lốc/Cái) trên cùng 1 variant.

Yêu cầu — chỉ tập trung vào các phần sau, không lan man sang các module khác:

1. Model mới: ProductBarcode

Viết model Sequelize-TypeScript đầy đủ, tuân thủ đúng style code hiện tại (dựa theo mẫu Unit đã cho), gồm:

id, variantId (FK → ProductVariant), unitId (FK → Unit), barcode (unique), conversionRate (INTEGER, default 1)
costPrice, retailPrice, wholesalePrice (DECIMAL(15,2))
promoPrice, promoStartAt, promoEndAt (nullable)
isBaseUnit (BOOLEAN) — đánh dấu đây là barcode gốc của variant (conversion_rate = 1), dùng để biết tồn kho đang tính theo đơn vị nào
Validation ở tầng model hoặc hook (@BeforeValidate/@BeforeSave): conversionRate > 0, retailPrice >= costPrice, wholesalePrice <= retailPrice, promoPrice < retailPrice khi có
Ràng buộc mỗi variantId chỉ có đúng 1 dòng isBaseUnit = true — đề xuất cách enforce (unique composite index hay validate ở service layer, so sánh ưu/nhược điểm với MySQL).

2. Migration script (Sequelize CLI migration, không phải sync)

Viết file migration theo đúng format queryInterface của Sequelize, thực hiện tuần tự:

Tạo bảng product_barcodes với foreign keys và index cần thiết.
Migrate dữ liệu: với mỗi ProductVariant hiện có barcode không null, tạo 1 dòng product_barcodes tương ứng với conversionRate = 1, isBaseUnit = true, unitId = đơn vị mặc định của vendor đó (nêu cách xác định unit mặc định nếu vendor chưa có unit nào), copy các cột giá cũ nếu variant đang có.
Viết câu query đối chiếu (validation query) để confirm số lượng bản ghi migrate khớp trước khi cho phép bước tiếp theo.
Migration xóa cột barcode (và cột giá cũ nếu có) khỏi ProductVariant — tách thành migration riêng, chạy sau khi đã verify ở production, không gộp chung 1 file.
Viết kèm hàm down() rollback cho từng migration.

3. Cập nhật Model ProductVariant
Thêm @HasMany(() => ProductBarcode)

Loại bỏ field barcode (comment rõ breaking change, liệt kê các chỗ trong code cần rà soát lại theo cách tìm kiếm — ví dụ grep theo tên field).

4. Service layer — chỉ 2 hàm lõi cần refactor

Không cần viết lại toàn bộ CRUD, chỉ tập trung vào 2 luồng nghiệp vụ quan trọng nhất:

- scanBarcode(barcode: string, customerType: 'retail' | 'wholesale')

Trả về: thông tin variant, giá áp dụng đúng thứ tự ưu tiên (sỉ → khuyến mãi hợp lệ theo thời gian → lẻ), tồn kho quy đổi hiển thị dạng hỗn hợp (VD: "2 thùng 5 chai") dựa trên conversionRate của toàn bộ barcode thuộc variant đó (không chỉ chia 1 lần — xử lý đúng khi có nhiều cấp đơn vị).

- deductInventory(variantId, barcodeId, quantityScanned) — xử lý concurrency

Tính quantityToDeduct = quantityScanned * conversionRate
Dùng Sequelize transaction + lock: Transaction.LOCK.UPDATE (tương đương SELECT ... FOR UPDATE) hoặc điều kiện WHERE quantity >= x trong câu update để tránh bán âm kho khi có 2 request đồng thời.
Trả lỗi nghiệp vụ rõ ràng (không phải lỗi 500) khi tồn kho không đủ.

5. Ràng buộc nghiệp vụ cần thêm ở tầng API/Controller
Khóa sửa conversionRate của một ProductBarcode nếu đã tồn tại OrderItem tham chiếu đến nó (viết hàm check trước khi cho phép update).
Nếu hệ thống order hiện tại chưa snapshot giá tại thời điểm bán, chỉ ra chính xác cần thêm cột nào vào bảng OrderItem hiện có (priceAtSale, conversionRateAtSale, unitNameAtSale) và viết migration cho việc này riêng.

6. Test case cần viết:
- scanBarcode trả đúng giá theo từng trường hợp (sỉ/khuyến mãi/lẻ).
- deductInventory không cho kho âm khi chạy 2 request song song (test bằng Promise.all).
- Migration không làm mất barcode nào từ dữ liệu cũ (so sánh count trước/sau).