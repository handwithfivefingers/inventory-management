# Xóa kho hàng

Cập nhật: 2026-09-18

## API

`DELETE /api/warehouses/:id` xóa mềm kho thuộc vendor đang hoạt động. Model `Warehouse` dùng Sequelize `paranoid`, vì vậy bản ghi lịch sử vẫn được giữ lại và kho đã xóa không còn xuất hiện trong các truy vấn mặc định.

## Điều kiện xóa

- Kho không được là kho chính (`isMain = false`).
- Tổng tồn kho của kho phải nhỏ hơn hoặc bằng `0`. Nếu lớn hơn `0`, cần dùng luồng chuyển kho trước.
- Không được có đơn hàng chưa hoàn thành liên kết với kho. Các trạng thái kết thúc hiện tại là `completed`, `partially_returned` và `returned`.

Nếu một điều kiện không đạt, API trả về `409 Conflict` với lý do cụ thể. Không tìm thấy kho trong vendor hiện tại trả về `404`.

## Giao diện

Danh sách kho có nút xóa cho người có quyền `DELETE` của module warehouse. Nút xóa của kho chính bị vô hiệu hóa; các điều kiện tồn kho và đơn hàng vẫn luôn được API kiểm tra lại trước khi xóa.
