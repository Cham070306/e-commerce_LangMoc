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
  shipping: {
    slug: 'shipping',
    title: 'Chính sách Vận chuyển & Giao nhận COD',
    shortDescription: 'Quy định về phạm vi giao hàng, đối soát tiền mặt COD và trách nhiệm đóng gói hàng thủ công.',
    lastUpdated: 'Cập nhật tháng 10/2026 (Phiên bản học phần)',
    sections: [
      {
        id: 'shipping-scope',
        heading: '1. Phạm vi thử nghiệm & Khu vực giao hàng',
        content: [
          'Sàn thương mại điện tử Làng Mộc hiện đang trong giai đoạn triển khai thử nghiệm tập trung tại khu vực TP. Hồ Chí Minh.',
          'Các đơn hàng ngoại tỉnh hoặc đến các khu vực khác sẽ được mở rộng trong các giai đoạn phát triển tiếp theo.'
        ]
      },
      {
        id: 'shipping-payment',
        heading: '2. Phương thức thanh toán khi nhận hàng (COD)',
        content: [
          'Hệ thống hiện áp dụng phương thức thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện hàng (COD).',
          'Khách hàng kiểm tra đúng kiện hàng mang mã vận đơn từ Làng Mộc trước khi tiến hành thanh toán tiền mặt.'
        ]
      },
      {
        id: 'shipping-seller-responsibility',
        heading: '3. Trách nhiệm tồn kho & Đóng gói của nhà bán (Seller)',
        content: [
          'Mô hình hoạt động của Làng Mộc là sàn thương mại điện tử kết nối nhiều nhà bán và làng nghề truyền thống.',
          'Nhà bán (seller) chịu trách nhiệm trực tiếp về mức tồn kho thực tế và quy trình đóng gói hàng thủ công mỹ nghệ, đảm bảo chèn lót chống sốc cho các sản phẩm dễ vỡ như gốm sứ và giữ sạch sản phẩm thổ cẩm, nón lá.'
        ]
      },
      {
        id: 'shipping-sla',
        heading: '4. Thời gian giao hàng dự kiến (SLA giao hàng)',
        content: [
          'Thời gian giao hàng từ nhà bán đến tay khách hàng phụ thuộc vào khoảng cách địa lý và thời gian hoàn thiện sản phẩm thủ công.',
          '• Đối với các đơn hàng trong khu vực TP.HCM: dự kiến từ 1 - 3 ngày làm việc.',
          '• Đối với các đơn hàng ngoại tỉnh: dự kiến từ 3 - 5 ngày làm việc.',
          '• Đối với các huyện vùng sâu, vùng xa, hải đảo: dự kiến từ 7 - 10 ngày làm việc.',
          'Thời gian giao hàng trên là thời gian ước tính trong điều kiện vận hành tiêu chuẩn, không bao gồm các trường hợp bất khả kháng như thiên tai, bão lũ hoặc sự cố thời tiết nghiêm trọng.'
        ]
      },
      {
        id: 'shipping-inspection',
        heading: '5. Quy tắc đồng kiểm khi nhận hàng',
        content: [
          'Khách hàng có quyền kiểm tra tình trạng ngoại quan kiện hàng trước khi ký nhận và thanh toán tiền mặt COD.',
          'Được phép: Mở hộp kiểm tra lớp xốp bọc hàng, kiểm tra số lượng món, hình dáng gốm sứ/nón lá, màu sắc thổ cẩm.',
          'Không được phép sử dụng thử sản phẩm tại chỗ: Không đổ nước/thức ăn vào bát đĩa gốm; không mặc/giặt/thử đồ thổ cẩm; không bẻ/đội thử nón lá; không làm rách tem mác bảo vệ.'
        ]
      }
    ]
  },
  returns: {
    slug: 'returns',
    title: 'Chính sách Đổi trả & Bồi hoàn',
    shortDescription: 'Quy trình tiếp nhận đổi trả, bồi hoàn sự cố vỡ nứt hàng thủ công và chứng từ đối soát.',
    lastUpdated: 'Cập nhật tháng 10/2026 (Đã chuẩn hóa SLA & quy chế bồi hoàn)',
    sections: [
      {
        id: 'returns-eligibility',
        heading: '1. Điều kiện tiếp nhận yêu cầu đổi trả',
        content: [
          'Làng Mộc tiếp nhận hỗ trợ đổi trả đối với các trường hợp: sản phẩm bị nứt, vỡ, hư hỏng trong quá trình vận chuyển, hoặc sản phẩm giao không đúng với đơn đặt hàng.',
          'Do tính chất hàng thủ công mỹ nghệ mang tính độc bản, các chi tiết vân men gốm hoặc đường chỉ dệt tay có thể có sự khác biệt tự nhiên nhỏ và không coi là lỗi kỹ thuật.'
        ]
      },
      {
        id: 'returns-breakage-policy',
        heading: '2. Chính sách bồi hoàn khi hàng vỡ, hư hỏng do vận chuyển',
        content: [
          'Phân định trách nhiệm rủi ro:',
          'Lỗi làm vỡ/đè nén từ Đơn vị vận chuyển: bên vận chuyển đền bù 100% giá trị khai giá của đơn hàng cho Seller theo hợp đồng dịch vụ logistics.',
          'Phương thức bồi hoàn cho Người mua:',
          'Hàng vỡ/Hư hỏng hoàn toàn: Hoàn tiền 100% giá trị sản phẩm + Phí vận chuyển ban đầu (nếu có) vào Ví điện tử/Tài khoản ngân hàng của Người mua trong vòng 24 – 48 giờ làm việc sau khi yêu cầu được duyệt.',
          'Hàng gửi bổ sung: Trường hợp vỡ 1 chi tiết trong bộ , nếu Seller có sẵn linh kiện thay thế và Người mua đồng ý, Seller sẽ gửi miễn phí chi tiết thay thế trong 48 giờ.'
        ]
      },
      {
        id: 'returns-sla',
        heading: '3. Thời hạn yêu cầu đổi trả (SLA đổi trả)',
        content: [
          'Trường hợp Hàng vỡ, giao sai, thiếu hàng: Trong vòng 24 giờ kể từ thời điểm hệ thống cập nhật trạng thái "Giao hàng thành công" (delivered).',
          'Trường hợp Hàng không đúng mô tả / Lỗi kỹ thuật sản xuất: Trong vòng 07 ngày (dành cho Shop Thường) hoặc 15 ngày (dành cho Mall / Shop Yêu thích) kể từ khi nhận hàng.',
          'Lưu ý pháp lý: Quá thời hạn SLA trên, hệ thống tự động hoàn tất đơn hàng và giải ngân cho Seller. Mọi khiếu nại phát sinh sau đó sẽ xử lý theo cơ chế thỏa thuận riêng giữa Người mua và Seller.'
        ]
      },
      {
        id: 'returns-evidence',
        heading: '4. Chứng từ đối soát cần cung cấp (SLA chứng từ)',
        content: [
          'Trong vòng 48 giờ kể từ khi bấm gửi yêu cầu Trả hàng/Hoàn tiền, Người mua phải tải lên hệ thống bộ chứng từ chuẩn hóa:',
          'Video Unboxing (Mở kiện hàng): Video liền mạch, không cắt ghép, quay rõ 6 mặt kiện hàng, phiếu giao hàng (mã vận đơn) và quá trình bóc lớp bảo vệ đến khi phát hiện lỗi/vỡ.',
          'Hình ảnh chi tiết bắt buộc:',
          '01 ảnh chụp Mã vận đơn dán trên thùng hàng.',
          '01 ảnh tổng thể vỏ thùng cartons/bọc hàng ngoại quan.',
          '02-03 ảnh góc cận (Close-up) thể hiện vết nứt/vỡ (Gốm sứ), vết bẩn/rách (Thổ cẩm), vết gãy khung/móp méo (Nón lá).'
        ]
      },
      {
        id: 'returns-fees',
        heading: '5. Chi phí vận chuyển đổi trả',
        content: [
          'Lỗi do Seller hoặc Vận chuyển (Hàng vỡ, sai mẫu, lỗi kỹ thuật): Miễn phí 100% cho Người mua. Sàn cung cấp mã vận chuyển đổi trả ngược (Reverse Logistics) do Seller chịu phí.',
          'Lỗi do nhu cầu cá nhân của Người mua (Đổi ý, không thích màu - chỉ áp dụng với sản phẩm không bị cá nhân hóa/đặt làm riêng):',
          'Người mua chịu 100% chi phí vận chuyển chiều trả hàng và chi phí vận chuyển chiều gửi lại (nếu đổi size/đổi mẫu).',
          'Sản phẩm trả lại phải còn nguyên tem mác, chưa qua sử dụng và đóng gói chuẩn theo quy định chống vỡ ban đầu.'
        ]
      }
    ]
  },
  warranty: {
    slug: 'warranty',
    title: 'Chính sách Bảo hành & Hướng dẫn Bảo quản',
    shortDescription: 'Phạm vi bảo hành lỗi kỹ thuật chế tác và hướng dẫn gìn giữ độ bền cho sản phẩm tự nhiên.',
    lastUpdated: 'Cập nhật tháng 10/2026 (Phân loại chi tiết theo ngành hàng thủ công)',
    sections: [
      {
        id: 'warranty-scope',
        heading: '1. Phạm vi bảo hành sản phẩm thủ công',
        content: [
          'Bảo hành áp dụng cho các lỗi chế tác từ nhà sản xuất hoặc nghệ nhân làng nghề (như bong tróc men bất thường, bung chỉ may cấu trúc chính khi chưa qua sử dụng).',
          'Không áp dụng bảo hành cho các hư hỏng do va đập rơi vỡ của người sử dụng, hao mòn tự nhiên trong quá trình dùng, hoặc bảo quản sai hướng dẫn.'
        ]
      },
      {
        id: 'warranty-period',
        heading: '2. Thời hạn bảo hành và Điều kiện đặc thù',
        content: [
          'Do tính chất đặc thù của các nhóm sản phẩm thủ công mỹ nghệ, quy định bảo hành được phân loại chi tiết theo từng ngành hàng truyền thống:'
        ],
        table: {
          headers: [
            'Nhóm sản phẩm',
            'Thời hạn bảo hành',
            'Nội dung bảo hành được chấp nhận',
            'Trường hợp từ chối bảo hành (Ngoại trừ)'
          ],
          rows: [
            [
              'Gốm sứ',
              '0 ngày (Không áp dụng BH sau khi đã nhận hàng an toàn)',
              'Chỉ áp dụng 1 đổi 1 tại thời điểm nhận hàng nếu bị rạn nứt ngầm, lỗi men (co men, rộp men) do sản xuất.',
              'Rơi vỡ, va đập, nứt vỡ do sốc nhiệt (đổ nước sôi đột ngột vào gốm lạnh).'
            ],
            [
              'Thổ cẩm',
              '30 ngày',
              'Bung đường chỉ may, sút nút, lỗi đường may do nhà sản xuất.',
              'Xù lông tự nhiên do ma sát, phai màu do dùng tẩy rửa mạnh, co rút vải do giặt nước nóng, vết cắt/đâm lủng do vật nhọn.'
            ],
            [
              'Nón lá',
              '0 ngày (Không áp dụng BH sau khi đã nhận hàng an toàn)',
              'Chỉ áp dụng đổi trả trong SLA 7 ngày nếu đứt chỉ chần lá, bung vành nón do lỗi sản xuất.',
              'Nón bị ẩm mốc do bảo quản nơi ẩm ướt, móp méo/gãy do đè nén, đứt dây nón do lực kéo mạnh.'
            ]
          ]
        }
      },
      {
        id: 'warranty-care-ceramics',
        heading: '3. Hướng dẫn bảo quản Đồ gốm thủ công & Men rạn',
        content: [
          'Tránh va đập mạnh hoặc thay đổi nhiệt độ đột ngột (ví dụ không dội nước sôi trực tiếp vào đồ gốm đang ở nhiệt độ rất lạnh).',
          'Vệ sinh bằng nước ấm và khăn mềm hoặc bọt biển nhẹ; hạn chế dùng búi cọ kim loại hoặc hóa chất tẩy rửa có tính ăn mòn cao làm xước men.'
        ]
      },
      {
        id: 'warranty-care-textiles',
        heading: '4. Hướng dẫn bảo quản Vải thổ cẩm thêu tay & Tơ tằm',
        content: [
          'Khuyên dùng phương pháp giặt tay nhẹ nhàng với nước mát và dầu gội/sữa tắm trung tính; không vắt xoắn mạnh làm gãy sợi tự nhiên.',
          'Phơi sản phẩm trong bóng râm thoáng gió, tránh ánh nắng mặt trời trực tiếp gay gắt làm phai màu nhuộm thảo mộc tự nhiên.'
        ]
      },
      {
        id: 'warranty-care-palm-leaf',
        heading: '5. Hướng dẫn bảo quản Nón lá truyền thống',
        content: [
          'Bảo quản nơi khô ráo, thoáng mát; tránh để nón ở môi trường ẩm ướt kéo dài gây ố mốc lá và mục chỉ chần.',
          'Không để vật nặng đè lên nón làm móp méo vành nan tre. Khi đi mưa về, dùng khăn bông mềm lau khô nhẹ nhàng và hong nơi râm mát thoáng khí.'
        ]
      }
    ]
  }
};
