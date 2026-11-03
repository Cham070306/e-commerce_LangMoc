# Dữ liệu tỉnh / xã

Snapshot tải ngày 03/11/2026 từ [Open Admin Data — Vietnam Administrative Divisions](https://github.com/open-admin-data/vietnam-administrative-divisions), giấy phép [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Tác giả: Open Admin Data. Dữ liệu nguồn công bố cập nhật 08/09/2026, tham chiếu Quyết định 19/2025/QĐ-TTg; đây là bản phân phối cộng đồng, không phải API chính phủ.

Chuyển đổi `all-province.json` và `all-ward.json` thành danh sách tối giản `{code,name,wards:[{code,name}]}`. Giữ 34 tỉnh và 3.321 đơn vị cấp xã; bỏ tọa độ và trường tiếng Anh. Hai bản JSON tại frontend/src/data và backend/src/data phải giống nhau. Không gọi API bên ngoài khi nhập địa chỉ.

Địa chỉ mới chọn tỉnh rồi xã, thay tỉnh xóa xã đã chọn. Backend kiểm tra cặp tên thuộc snapshot. Trường district cũ được giữ để đọc địa chỉ/lịch sử cũ, không bắt buộc với địa chỉ mới. Không tự chuyển địa chỉ cũ sang địa giới mới khi chưa có dữ liệu đối chiếu.
