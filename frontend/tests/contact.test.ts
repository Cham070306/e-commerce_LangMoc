import test from 'node:test';
import assert from 'node:assert/strict';
import {
  processContactCreation,
  demoContactMessages,
  mockContactCooldownMap,
  MOCK_RATE_LIMIT_COOLDOWN_MS
} from '../mock/c2Mock.ts';
import { POLICIES } from '../src/content/policies.ts';
import { siteMaps, siteContact } from '../src/config/site.ts';

test('(a) Validate Contact: Thiếu trường bắt buộc bị từ chối 400 VALIDATION_ERROR', () => {
  // Thiếu toàn bộ
  const resEmpty = processContactCreation(null, {});
  assert.equal(resEmpty.statusCode, 400);
  assert.equal(resEmpty.error?.error?.code, 'VALIDATION_ERROR');
  assert.ok(resEmpty.error?.error?.fields?.name);
  assert.ok(resEmpty.error?.error?.fields?.email);
  assert.ok(resEmpty.error?.error?.fields?.subject);
  assert.ok(resEmpty.error?.error?.fields?.message);

  // Thiếu message
  const resNoMsg = processContactCreation(null, {
    name: 'Nguyễn Văn A',
    email: 'vana@example.com',
    subject: 'Hỗ trợ đơn hàng',
    message: '   '
  });
  assert.equal(resNoMsg.statusCode, 400);
  assert.ok(resNoMsg.error?.error?.fields?.message);
});

test('(a) Validate Contact: Email sai định dạng bị từ chối 400', () => {
  const resBadEmail = processContactCreation(null, {
    name: 'Nguyễn Văn A',
    email: 'khong-phai-email',
    subject: 'Góp ý website/dịch vụ',
    message: 'Tôi muốn góp ý về giao diện.'
  });
  assert.equal(resBadEmail.statusCode, 400);
  assert.ok(resBadEmail.error?.error?.fields?.email);
  assert.equal(resBadEmail.error?.error?.fields?.email, 'Địa chỉ email không đúng định dạng.');
});

test('(a) Validate Contact: Vượt quá giới hạn độ dài ký tự theo CSDL bị từ chối 400', () => {
  // name > 120 ký tự
  const resLongName = processContactCreation(null, {
    name: 'A'.repeat(121),
    email: 'test@example.com',
    subject: 'Hỗ trợ đơn hàng',
    message: 'Nội dung hợp lệ'
  });
  assert.equal(resLongName.statusCode, 400);
  assert.ok(resLongName.error?.error?.fields?.name?.includes('120 ký tự'));

  // subject > 160 ký tự
  const resLongSubject = processContactCreation(null, {
    name: 'Nguyễn Văn A',
    email: 'test@example.com',
    subject: 'S'.repeat(161),
    message: 'Nội dung hợp lệ'
  });
  assert.equal(resLongSubject.statusCode, 400);
  assert.ok(resLongSubject.error?.error?.fields?.subject?.includes('160 ký tự'));

  // email > 255 ký tự
  const resLongEmail = processContactCreation(null, {
    name: 'Nguyễn Văn A',
    email: 'e'.repeat(250) + '@example.com',
    subject: 'Hỗ trợ',
    message: 'Nội dung hợp lệ'
  });
  assert.equal(resLongEmail.statusCode, 400);
  assert.ok(resLongEmail.error?.error?.fields?.email?.includes('255 ký tự'));
});

test('(b) Mock Logic: Khách vãng lai gửi form thành công thì user_id = null', () => {
  const uniqueEmail = `guest-${Date.now()}@example.com`;
  const res = processContactCreation(null, {
    name: 'Khách Vãng Lai',
    email: uniqueEmail,
    subject: 'Hợp tác nhà bán/làng nghề',
    message: 'Tôi là đại diện xưởng gốm muốn tham gia bán hàng trên sàn Làng Mộc.'
  });

  assert.equal(res.statusCode, 201);
  assert.ok(res.data?.data.id);
  assert.equal(res.data?.data.user_id, null, 'Khách vãng lai user_id phải là null');
  assert.equal(res.data?.data.status, 'new');
  assert.equal(res.data?.data.email, uniqueEmail.toLowerCase());

  // Đã lưu vào kho tin nhắn
  const saved = demoContactMessages.find(m => m.id === res.data?.data.id);
  assert.ok(saved);
});

test('(b) Mock Logic: Người dùng đã đăng nhập gửi form thì user_id khớp với session', () => {
  const loggedInUserId = 'user-customer-linh';
  const uniqueEmail = `linh-${Date.now()}@example.com`;

  const res = processContactCreation(loggedInUserId, {
    name: 'Linh Nguyễn',
    email: uniqueEmail,
    subject: 'Hỗ trợ đơn hàng',
    message: 'Tôi muốn hỏi về thời gian giao hàng của đơn vừa đặt.'
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.data?.data.user_id, loggedInUserId, 'User đã đăng nhập phải được gán đúng user_id từ session');
  assert.equal(res.data?.data.status, 'new');
});

test('(b) Mock Logic: Giới hạn tần suất (Rate limit) chặn gửi dồn dập trong khoảng cooldown', () => {
  const spamEmail = `spam-${Date.now()}@test.com`;

  // Gửi lần 1: Thành công
  const res1 = processContactCreation(null, {
    name: 'Người Gửi 1',
    email: spamEmail,
    subject: 'Góp ý website/dịch vụ',
    message: 'Tin nhắn gửi lần 1'
  });
  assert.equal(res1.statusCode, 201);

  // Gửi lần 2 ngay lập tức với cùng email: Bị chặn 429 RATE_LIMITED
  const res2 = processContactCreation(null, {
    name: 'Người Gửi 1',
    email: spamEmail,
    subject: 'Góp ý website/dịch vụ',
    message: 'Tin nhắn gửi lần 2 ngay sau đó'
  });
  assert.equal(res2.statusCode, 429);
  assert.equal(res2.error?.error?.code, 'RATE_LIMITED');
  assert.ok(res2.error?.error?.message.includes('MÔ PHỎNG'));

  // Giả lập đã qua thời gian cooldown -> gửi lại thành công
  mockContactCooldownMap[spamEmail.toLowerCase()] = Date.now() - (MOCK_RATE_LIMIT_COOLDOWN_MS + 1000);
  const res3 = processContactCreation(null, {
    name: 'Người Gửi 1',
    email: spamEmail,
    subject: 'Góp ý website/dịch vụ',
    message: 'Tin nhắn gửi lại sau khi hết thời gian chờ'
  });
  assert.equal(res3.statusCode, 201);
});

test('(c) Bảng cấu hình Policies & Route: Không có route chết và dữ liệu đầy đủ', () => {
  const supportedSlugs = ['shipping', 'returns', 'warranty'];

  // Cả 3 chính sách bắt buộc đều phải có trong POLICIES
  for (const slug of supportedSlugs) {
    const doc = POLICIES[slug as keyof typeof POLICIES];
    assert.ok(doc, `Chính sách ${slug} phải tồn tại`);
    assert.ok(doc.title.length > 5, `Tiêu đề chính sách ${slug} phải có nội dung`);
    assert.ok(doc.sections.length >= 3, `Chính sách ${slug} phải có các mục quy định`);

    // Kiểm tra từng section đều có nội dung
    for (const sec of doc.sections) {
      assert.ok(sec.heading.length > 0);
      assert.ok(sec.content.length > 0);
    }
  }

  // Tuyệt đối không có chính sách bảo mật (ngoài phạm vi C2 theo yêu cầu M5)
  assert.equal((POLICIES as any).privacy, undefined, 'Không được có chính sách bảo mật thông tin');

  // Kiểm tra cấu hình site: Maps đang ở trạng thái CHƯA_CHỐT
  assert.equal(siteMaps.status, 'CHƯA_CHỐT');
  assert.equal(siteMaps.query, null);

  // Kiểm tra thông tin liên hệ: Đang cập nhật (CẦN NHÓM CHỐT)
  assert.equal(siteContact.address, null);
  assert.equal(siteContact.hotline, null);
  assert.equal(siteContact.email, null);
});

test('(c) Policies: Chính sách Đổi trả và Bảo hành có đầy đủ SLA, quy chế bồi hoàn và bảng phân loại đặc thù', () => {
  const returnsDoc = POLICIES.returns;
  assert.equal(returnsDoc.sections.length, 5);

  // Mục 2 bồi hoàn khi hàng vỡ
  const sec2 = returnsDoc.sections.find(s => s.id === 'returns-breakage-policy');
  assert.ok(sec2);
  assert.ok(sec2.content.some(c => c.includes('Phân định trách nhiệm rủi ro')));
  assert.ok(sec2.content.some(c => c.includes('đền bù 100% giá trị khai giá')));
  assert.ok(sec2.content.some(c => c.includes('24 – 48 giờ làm việc')));

  // Mục 3 SLA đổi trả
  const sec3 = returnsDoc.sections.find(s => s.id === 'returns-sla');
  assert.ok(sec3);
  assert.ok(sec3.content.some(c => c.includes('24 giờ')));
  assert.ok(sec3.content.some(c => c.includes('07 ngày')));

  // Mục 4 SLA chứng từ
  const sec4 = returnsDoc.sections.find(s => s.id === 'returns-evidence');
  assert.ok(sec4);
  assert.ok(sec4.content.some(c => c.includes('Video Unboxing')));

  // Mục 5 Chi phí
  const sec5 = returnsDoc.sections.find(s => s.id === 'returns-fees');
  assert.ok(sec5);
  assert.ok(sec5.content.some(c => c.includes('Reverse Logistics')));

  // Warranty table
  const warrantyDoc = POLICIES.warranty;
  const warrantySec2 = warrantyDoc.sections.find(s => s.id === 'warranty-period');
  assert.ok(warrantySec2?.table);
  assert.equal(warrantySec2.table.rows.length, 3);
  assert.equal(warrantySec2.table.rows[0][0], 'Gốm sứ');
  assert.equal(warrantySec2.table.rows[1][0], 'Thổ cẩm');
  assert.equal(warrantySec2.table.rows[2][0], 'Nón lá');
});

