import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { api, ApiError } from '../lib/api';
import { siteContact, siteMaps, isMockMode } from '../config/site';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle, Map, ExternalLink } from 'lucide-react';

const SUBJECT_OPTIONS = [
  'Hỗ trợ đơn hàng',
  'Góp ý website/dịch vụ',
  'Hợp tác nhà bán/làng nghề',
  'Khác'
];

export default function ContactPage() {
  const { user } = useAuth();

  // Form Fields
  const [name, setName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subjectCategory, setSubjectCategory] = useState(SUBJECT_OPTIONS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');

  // Tự động điền thông tin khi người dùng đăng nhập nhưng vẫn cho phép sửa
  useEffect(() => {
    if (user) {
      setName(prev => prev.trim() ? prev : user.full_name);
      setEmail(prev => prev.trim() ? prev : user.email);
    }
  }, [user]);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errs.name = 'Vui lòng nhập họ và tên.';
    } else if (trimmedName.length > 120) {
      errs.name = 'Họ và tên không được vượt quá 120 ký tự (theo đặc tả CSDL).';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập địa chỉ email.';
    } else if (trimmedEmail.length > 255) {
      errs.email = 'Email không được vượt quá 255 ký tự (theo đặc tả CSDL).';
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = 'Địa chỉ email không đúng định dạng.';
    }

    const finalSubject = subjectCategory === 'Khác' ? customSubject.trim() : subjectCategory;
    if (!finalSubject) {
      errs.subject = 'Vui lòng nhập chủ đề liên hệ.';
    } else if (finalSubject.length > 160) {
      errs.subject = 'Tiêu đề liên hệ không được vượt quá 160 ký tự (theo đặc tả CSDL).';
    }

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      errs.message = 'Vui lòng nhập nội dung tin nhắn hoặc góp ý.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setApiError(null);

    if (submittingRef.current) return;
    if (!validate()) return;

    submittingRef.current = true;
    setSubmitting(true);

    const finalSubject = subjectCategory === 'Khác' ? customSubject.trim() : subjectCategory;

    try {
      // Frontend KHÔNG gửi user_id; server/mock tự động trích xuất từ phiên cookie
      const res = await api.sendContact({
        name: name.trim(),
        email: email.trim(),
        subject: finalSubject,
        message: message.trim()
      });

      setSuccessMsg(`Cảm ơn bạn đã liên hệ! Tin nhắn của bạn đã được gửi thành công đến đội ngũ Làng Mộc (Mã phản hồi: #${res.data.id.slice(0, 8)}).`);
      
      // Chỉ reset dữ liệu khi gửi thành công
      setMessage('');
      if (subjectCategory === 'Khác') {
        setCustomSubject('');
        setSubjectCategory(SUBJECT_OPTIONS[0]);
      }
      setErrors({});
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'RATE_LIMITED' || err.status === 429) {
          setApiError(err.message || 'Bạn vừa gửi phản hồi gần đây. Vui lòng đợi trong giây lát trước khi gửi tiếp.');
        } else {
          setApiError(err.message || 'Không thể gửi phản hồi. Vui lòng thử lại.');
          if (err.fields) {
            setErrors(prev => ({ ...prev, ...err.fields }));
          }
        }
      } else {
        setApiError('Đã xảy ra lỗi khi gửi liên hệ. Vui lòng kiểm tra lại kết nối mạng.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Breadcrumb & Tiêu đề */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)', marginBottom: '4px' }}>
            <a href="#/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</a> ›{' '}
            <strong>Liên hệ & Góp ý</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="c2-title" style={{ margin: 0 }}>Liên hệ & Góp ý</h1>
              <p className="c2-subtitle" style={{ margin: '4px 0 0' }}>
                Gửi phản hồi, yêu cầu hỗ trợ đơn hàng hoặc liên hệ kết nối nhà bán thủ công cùng Làng Mộc.
              </p>
            </div>
            {isMockMode && <span className="c2-mock-badge">⚙️ CHẾ ĐỘ MÔ PHỎNG (MOCK API)</span>}
          </div>
        </div>

        {/* Thông báo trạng thái dùng vùng aria-live */}
        <div aria-live="polite" style={{ marginBottom: '20px' }}>
          {successMsg && (
            <div style={{ padding: '14px 18px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' }}>
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Gửi thành công!</strong> {successMsg}
              </div>
            </div>
          )}

          {apiError && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '6px', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Lỗi gửi phản hồi:</strong> {apiError}
              </div>
            </div>
          )}
        </div>

        {/* Bố cục 2 cột: Cột Form và Cột Thông tin liên hệ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
          {/* CỘT 1: FORM GỬI LIÊN HỆ */}
          <div className="c2-card" style={{ padding: '32px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: 'var(--brown, #493421)', margin: '0 0 6px' }}>
              Gửi tin nhắn cho Làng Mộc
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Mọi ý kiến đóng góp của quý khách sẽ được tiếp nhận và phản hồi sớm nhất có thể.
            </p>

            <form onSubmit={handleSubmit} noValidate className="c2-form">
              {/* Họ và tên */}
              <div className="c2-form-group">
                <label htmlFor="contactName" className="c2-label">
                  Họ và tên <span className="c2-required">*</span>
                </label>
                <input
                  id="contactName"
                  type="text"
                  className={`c2-input ${errors.name ? 'c2-input-error' : ''}`}
                  placeholder="Nhập họ và tên của bạn"
                  value={name}
                  maxLength={120}
                  onChange={e => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  disabled={submitting}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'contactName-error' : undefined}
                />
                {errors.name && (
                  <span id="contactName-error" className="c2-field-error" style={{ color: '#b91c1c', fontSize: '11px', marginTop: '3px' }}>
                    {errors.name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="c2-form-group">
                <label htmlFor="contactEmail" className="c2-label">
                  Địa chỉ email <span className="c2-required">*</span>
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  className={`c2-input ${errors.email ? 'c2-input-error' : ''}`}
                  placeholder="name@example.com"
                  value={email}
                  maxLength={255}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  disabled={submitting}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'contactEmail-error' : undefined}
                />
                {errors.email && (
                  <span id="contactEmail-error" className="c2-field-error" style={{ color: '#b91c1c', fontSize: '11px', marginTop: '3px' }}>
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Chủ đề liên hệ */}
              <div className="c2-form-group">
                <label htmlFor="contactSubjectSelect" className="c2-label">
                  Chủ đề liên hệ <span className="c2-required">*</span>
                </label>
                <select
                  id="contactSubjectSelect"
                  className="c2-input"
                  value={subjectCategory}
                  onChange={e => {
                    setSubjectCategory(e.target.value);
                    if (errors.subject) setErrors(prev => ({ ...prev, subject: '' }));
                  }}
                  disabled={submitting}
                >
                  {SUBJECT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {subjectCategory === 'Khác' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      id="contactCustomSubject"
                      type="text"
                      className={`c2-input ${errors.subject ? 'c2-input-error' : ''}`}
                      placeholder="Vui lòng nhập chủ đề cụ thể (tối đa 160 ký tự)"
                      value={customSubject}
                      maxLength={160}
                      onChange={e => {
                        setCustomSubject(e.target.value);
                        if (errors.subject) setErrors(prev => ({ ...prev, subject: '' }));
                      }}
                      disabled={submitting}
                      aria-invalid={!!errors.subject}
                      aria-describedby={errors.subject ? 'contactSubject-error' : undefined}
                    />
                  </div>
                )}

                {errors.subject && (
                  <span id="contactSubject-error" className="c2-field-error" style={{ color: '#b91c1c', fontSize: '11px', marginTop: '3px' }}>
                    {errors.subject}
                  </span>
                )}
              </div>

              {/* Nội dung tin nhắn */}
              <div className="c2-form-group">
                <label htmlFor="contactMessage" className="c2-label">
                  Nội dung tin nhắn / góp ý <span className="c2-required">*</span>
                </label>
                <textarea
                  id="contactMessage"
                  className={`c2-input ${errors.message ? 'c2-input-error' : ''}`}
                  rows={5}
                  placeholder="Nhập chi tiết nội dung bạn muốn gửi tới Làng Mộc…"
                  value={message}
                  onChange={e => {
                    setMessage(e.target.value);
                    if (errors.message) setErrors(prev => ({ ...prev, message: '' }));
                  }}
                  disabled={submitting}
                  style={{ resize: 'vertical', minHeight: '120px' }}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'contactMessage-error' : undefined}
                />
                {errors.message && (
                  <span id="contactMessage-error" className="c2-field-error" style={{ color: '#b91c1c', fontSize: '11px', marginTop: '3px' }}>
                    {errors.message}
                  </span>
                )}
              </div>

              {/* Nút gửi */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="submit"
                  className="c2-btn c2-btn-primary"
                  disabled={submitting}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  <Send size={16} />
                  {submitting ? 'Đang gửi phản hồi…' : 'Gửi liên hệ'}
                </button>
              </div>
            </form>
          </div>

          {/* CỘT 2: THÔNG TIN LIÊN HỆ & BẢN ĐỒ MAPS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Khung Thông tin liên hệ */}
            <div className="c2-card" style={{ padding: '28px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: 'var(--brown, #493421)', margin: '0 0 16px' }}>
                Thông tin sàn thương mại Làng Mộc
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                {/* Địa chỉ */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin size={18} style={{ color: 'var(--copper, #a5754b)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--brown, #493421)' }}>Địa chỉ văn phòng / điều hành:</strong>
                    {siteContact.address ? (
                      <span style={{ color: 'var(--cafe, #3b352d)' }}>{siteContact.address}</span>
                    ) : (
                      <div style={{ color: '#92400e', fontSize: '12px', marginTop: '2px' }}>
                        <span>Đang cập nhật</span>{' '}
                        <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', border: '1px dashed #f59e0b', fontSize: '10px', fontWeight: 600 }}>
                          CẦN NHÓM CHỐT
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hotline */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Phone size={18} style={{ color: 'var(--copper, #a5754b)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--brown, #493421)' }}>Tổng đài hỗ trợ:</strong>
                    {siteContact.hotline ? (
                      <span style={{ color: 'var(--cafe, #3b352d)' }}>{siteContact.hotline}</span>
                    ) : (
                      <div style={{ color: '#92400e', fontSize: '12px', marginTop: '2px' }}>
                        <span>Đang cập nhật</span>{' '}
                        <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', border: '1px dashed #f59e0b', fontSize: '10px', fontWeight: 600 }}>
                          CẦN NHÓM CHỐT
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Mail size={18} style={{ color: 'var(--copper, #a5754b)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--brown, #493421)' }}>Hộp thư điện tử:</strong>
                    {siteContact.email ? (
                      <span style={{ color: 'var(--cafe, #3b352d)' }}>{siteContact.email}</span>
                    ) : (
                      <div style={{ color: '#92400e', fontSize: '12px', marginTop: '2px' }}>
                        <span>Đang cập nhật</span>{' '}
                        <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', border: '1px dashed #f59e0b', fontSize: '10px', fontWeight: 600 }}>
                          CẦN NHÓM CHỐT
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Giờ làm việc */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Clock size={18} style={{ color: 'var(--copper, #a5754b)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--brown, #493421)' }}>Thời gian trực tiếp nhận:</strong>
                    {siteContact.workingHours ? (
                      <span style={{ color: 'var(--cafe, #3b352d)' }}>{siteContact.workingHours}</span>
                    ) : (
                      <div style={{ color: '#92400e', fontSize: '12px', marginTop: '2px' }}>
                        <span>Đang cập nhật</span>{' '}
                        <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', border: '1px dashed #f59e0b', fontSize: '10px', fontWeight: 600 }}>
                          CẦN NHÓM CHỐT
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Khung Google Maps */}
            <div className="c2-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: 'var(--brown, #493421)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Map size={18} /> Bản đồ vị trí
                </h2>
                {siteMaps.status === 'CHỐT' && siteMaps.query && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteMaps.query)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '12px', color: 'var(--copper, #a5754b)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    Mở trong Google Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {siteMaps.status === 'CHỐT' && siteMaps.query ? (
                /* Đã có địa điểm: nhúng iframe không cần API key, title, loading lazy */
                <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--line, #c8b99e)', height: '260px' }}>
                  <iframe
                    title="Bản đồ Làng Mộc"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(siteMaps.query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  />
                </div>
              ) : (
                /* CHƯA_CHỐT: hiển thị placeholder, KHÔNG nhúng địa chỉ giả theo yêu cầu M5 */
                <div
                  style={{
                    height: '220px',
                    borderRadius: '6px',
                    border: '1px dashed var(--line, #c8b99e)',
                    background: 'rgba(73, 52, 33, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--muted, #7c6a57)'
                  }}
                >
                  <MapPin size={32} style={{ color: '#d97706', marginBottom: '8px' }} />
                  <strong style={{ fontSize: '14px', color: 'var(--brown, #493421)', marginBottom: '4px' }}>
                    Địa điểm Maps: CHƯA_CHỐT
                  </strong>
                  <p style={{ fontSize: '12px', maxWidth: '320px', margin: '0 auto 10px', lineHeight: 1.5 }}>
                    Vị trí hiển thị bản đồ đang chờ nhóm thống nhất địa chỉ thực tế chính thức.
                  </p>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, border: '1px dashed #f59e0b' }}>
                    ⚠️ CẦN NHÓM CHỐT ĐỊA ĐIỂM
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
