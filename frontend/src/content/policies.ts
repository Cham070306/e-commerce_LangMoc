export interface PolicyTable {
  headers: string[];
  rows: string[][];
}

export interface PolicySection {
  id: string;
  heading: string;
  content: string[];
  table?: PolicyTable;
  pendingDecision?: string | null;
}

export interface PolicyDocument {
  slug: 'shipping' | 'returns' | 'warranty';
  title: string;
  shortDescription: string;
  lastUpdated: string;
  sections: PolicySection[];
}

export const POLICIES: Record<'shipping' | 'returns' | 'warranty', PolicyDocument> = {
  "shipping": {
    "slug": "shipping",
    "title": "Chính sách Vận chuyển & Giao nhận COD",
    "shortDescription": "Thông tin minh họa cho phiên bản học phần; đơn mô phỏng không phát sinh giao nhận thực tế.",
    "lastUpdated": "03/11/2026 — phiên bản học phần",
    "sections": [
      {
        "id": "shipping-scope",
        "heading": "1. Phạm vi thử nghiệm",
        "content": [
          "Làng Mộc hiện là bản thử nghiệm học phần. Sản phẩm, giá và tồn kho demo được dùng để trình diễn chức năng.",
          "Khi có giao nhận thực tế, phạm vi phục vụ và thời gian dự kiến sẽ được xác nhận riêng với người mua trước khi chốt đơn."
        ]
      },
      {
        "id": "shipping-payment",
        "heading": "2. Thanh toán COD",
        "content": [
          "Luồng trình diễn dùng thanh toán tiền mặt khi nhận hàng (COD). Không nhập thông tin thẻ hoặc chuyển tiền cho đơn mô phỏng."
        ]
      },
      {
        "id": "shipping-seller-responsibility",
        "heading": "3. Đóng gói hàng thủ công",
        "content": [
          "Khi triển khai thực tế, đơn vị bán cần kiểm tra tồn kho và đóng gói chống sốc phù hợp với gốm sứ, mây tre đan và nón lá; giữ khô sạch các sản phẩm dệt."
        ]
      },
      {
        "id": "shipping-sla",
        "heading": "4. Phí và thời gian dự kiến",
        "content": [
          "Phí hiển thị ở checkout là mức minh họa cho bài học phần, không phải báo giá vận chuyển thực tế.",
          "Thời gian giao nhận phụ thuộc địa chỉ và đơn vị vận chuyển; bản thử nghiệm chưa cam kết SLA giao hàng."
        ]
      },
      {
        "id": "shipping-inspection",
        "heading": "5. Kiểm tra khi nhận hàng",
        "content": [
          "Đối với giao nhận thực tế, kiểm tra mẫu, số lượng và tình trạng kiện hàng trước khi xác nhận.",
          "Nếu phát hiện hư hỏng, giữ hình ảnh và liên hệ để được hướng dẫn. Không sử dụng sản phẩm trước khi thống nhất phương án xử lý."
        ]
      }
    ]
  },
  "returns": {
    "slug": "returns",
    "title": "Chính sách Đổi trả & Hỗ trợ",
    "shortDescription": "Hướng dẫn tiếp nhận yêu cầu; bản thử nghiệm chưa cung cấp chức năng hoàn tiền tự động.",
    "lastUpdated": "03/11/2026 — phiên bản học phần",
    "sections": [
      {
        "id": "returns-eligibility",
        "heading": "1. Trường hợp cần hỗ trợ",
        "content": [
          "Nếu sản phẩm thực tế bị vỡ, thiếu hoặc giao sai, hãy gửi yêu cầu qua biểu mẫu liên hệ, kèm mã đơn và mô tả sự cố.",
          "Khác biệt tự nhiên nhỏ giữa các sản phẩm thủ công cần được đối chiếu với mô tả và hình ảnh đã công bố."
        ]
      },
      {
        "id": "returns-breakage-policy",
        "heading": "2. Tiếp nhận và đối chiếu",
        "content": [
          "Giữ bao bì, ảnh sản phẩm và thông tin giao nhận để đơn vị bán đối chiếu.",
          "Phương án đổi sản phẩm, bồi hoàn và thời hạn xử lý phải được xác nhận cho từng yêu cầu; bản demo không tự thực hiện chi trả."
        ]
      },
      {
        "id": "returns-sla",
        "heading": "3. Thời điểm thông báo",
        "content": [
          "Thông báo sớm khi phát hiện sự cố giúp việc đối chiếu thuận lợi. Thời hạn tiếp nhận chính thức cần được công bố trước khi mở bán thực tế."
        ]
      },
      {
        "id": "returns-evidence",
        "heading": "4. Thông tin cần chuẩn bị",
        "content": [
          "Chuẩn bị mã đơn, ảnh tình trạng sản phẩm và mô tả vấn đề.",
          "Biểu mẫu hiện tiếp nhận nội dung chữ; bộ phận hỗ trợ sẽ hướng dẫn cách cung cấp hình ảnh khi cần. Không gửi thông tin tài khoản hoặc mật khẩu."
        ]
      },
      {
        "id": "returns-fees",
        "heading": "5. Chi phí và phương án xử lý",
        "content": [
          "Phí đổi trả và bên chịu phí được thống nhất sau khi xác định nguyên nhân. Không tự gửi hàng hoặc chuyển khoản trước khi được xác nhận."
        ]
      }
    ]
  },
  "warranty": {
    "slug": "warranty",
    "title": "Hướng dẫn Bảo hành & Bảo quản",
    "shortDescription": "Giữ độ bền cho sản phẩm thủ công; điều kiện bảo hành cụ thể do đơn vị bán xác nhận.",
    "lastUpdated": "03/11/2026 — phiên bản học phần",
    "sections": [
      {
        "id": "warranty-scope",
        "heading": "1. Phạm vi hỗ trợ",
        "content": [
          "Liên hệ Làng Mộc khi có dấu hiệu lỗi chế tác để được hướng dẫn đối chiếu với đơn vị bán.",
          "Điều kiện và thời hạn bảo hành cụ thể phải được xác nhận trước giao dịch thực tế; bản học phần không thay thế cam kết của nhà sản xuất."
        ]
      },
      {
        "id": "warranty-period",
        "heading": "2. Lưu ý theo chất liệu",
        "content": [
          "Các lưu ý dưới đây giúp gìn giữ sản phẩm trong quá trình sử dụng."
        ],
        "table": {
          "headers": [
            "Nhóm sản phẩm",
            "Cách bảo quản",
            "Lưu ý"
          ],
          "rows": [
            [
              "Gốm sứ",
              "Rửa nhẹ bằng khăn mềm",
              "Tránh va đập và sốc nhiệt"
            ],
            [
              "Thổ cẩm",
              "Giặt nhẹ, phơi thoáng",
              "Theo hướng dẫn trên nhãn; tránh chất tẩy mạnh"
            ],
            [
              "Nón lá / Mây tre",
              "Giữ khô thoáng",
              "Tránh ẩm lâu và vật nặng đè lên"
            ]
          ]
        }
      },
      {
        "id": "warranty-care-ceramics",
        "heading": "3. Đồ gốm",
        "content": [
          "Tránh thay đổi nhiệt độ đột ngột. Dùng bọt biển mềm và chất rửa phù hợp; kiểm tra hướng dẫn riêng trước khi dùng máy rửa bát hoặc lò vi sóng."
        ]
      },
      {
        "id": "warranty-care-textiles",
        "heading": "4. Sản phẩm dệt",
        "content": [
          "Ưu tiên giặt nhẹ bằng nước mát theo nhãn sản phẩm, thử độ bền màu trước và phơi nơi thoáng mát."
        ]
      },
      {
        "id": "warranty-care-palm-leaf",
        "heading": "5. Nón lá và mây tre",
        "content": [
          "Giữ nơi khô ráo, lau nhẹ sau khi bị ướt và hong thoáng. Tránh ngâm nước, đè nén hoặc phơi sát nguồn nhiệt."
        ]
      }
    ]
  }
};
