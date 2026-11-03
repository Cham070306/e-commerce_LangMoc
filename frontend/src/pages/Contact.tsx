import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { api, ApiError } from '../lib/api';
import { siteContact, siteMaps, isMockMode } from '../config/site';
import { Mail, Phone, MapPin, Clock, ArrowUpRight, Send, CheckCircle, AlertCircle } from 'lucide-react';
import '../styles/contact.css';

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
      errs.name = 'Họ và tên không được vượt quá 120 ký tự.';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập địa chỉ email.';
    } else if (trimmedEmail.length > 255) {
      errs.email = 'Email không được vượt quá 255 ký tự.';
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = 'Địa chỉ email không đúng định dạng.';
    }

    const finalSubject = subjectCategory === 'Khác' ? customSubject.trim() : subjectCategory;
    if (!finalSubject) {
      errs.subject = 'Vui lòng nhập chủ đề liên hệ.';
    } else if (finalSubject.length > 160) {
      errs.subject = 'Tiêu đề liên hệ không được vượt quá 160 ký tự.';
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

      setSuccessMsg(`Cảm ơn bạn đã liên hệ! Tin nhắn của bạn đã được gửi thành công đến đội ngũ Làng Mộc (Mã phản hồi: #${res.data.id}).`);
      
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

  const mapsUrl = siteMaps.query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteMaps.query)}` : null;
  return (
    <main id="main" className="contact-page">
      <div className="contact-shell">
        <div className="contact-breadcrumb" role="navigation" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>/</span><span>Liên hệ</span></div>
        <div className="contact-intro"><h1>Liên hệ</h1><p>Gửi câu hỏi hoặc góp ý cho Làng Mộc qua biểu mẫu bên dưới.</p></div>
        <div className="contact-layout">
          <section className="contact-form-panel" aria-labelledby="contact-form-title" id="contact-form">
            {isMockMode&&<p className="contact-demo">Bản thử nghiệm</p>}
            <h2 id="contact-form-title">Gửi tin nhắn</h2>
            <p className="contact-form-lead">Điền các thông tin có dấu * để gửi tin nhắn.</p>
            <div aria-live="polite">
              {successMsg&&<div className="contact-alert contact-alert-success"><CheckCircle size={19}/><p>{successMsg}</p></div>}
              {apiError&&<div className="contact-alert contact-alert-error" role="alert"><AlertCircle size={19}/><p>{apiError}</p></div>}
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="contact-form-row">
                <div className="contact-field"><label htmlFor="contactName">Họ và tên <span>*</span></label><input id="contactName" name="name" autoComplete="name" placeholder="Tên của bạn" value={name} maxLength={120} onChange={e=>{setName(e.target.value);setErrors(prev=>({...prev,name:''}));}} disabled={submitting} required aria-invalid={!!errors.name} aria-describedby={errors.name?'contactName-error':undefined}/>{errors.name&&<small id="contactName-error">{errors.name}</small>}</div>
                <div className="contact-field"><label htmlFor="contactEmail">Email <span>*</span></label><input id="contactEmail" name="email" type="email" autoComplete="email" placeholder="ban@email.com" value={email} maxLength={255} onChange={e=>{setEmail(e.target.value);setErrors(prev=>({...prev,email:''}));}} disabled={submitting} required aria-invalid={!!errors.email} aria-describedby={errors.email?'contactEmail-error':undefined}/>{errors.email&&<small id="contactEmail-error">{errors.email}</small>}</div>
              </div>
              <div className="contact-field"><label htmlFor="contactSubjectSelect">Chủ đề <span>*</span></label><select id="contactSubjectSelect" value={subjectCategory} onChange={e=>{setSubjectCategory(e.target.value);setErrors(prev=>({...prev,subject:''}));}} disabled={submitting}>{SUBJECT_OPTIONS.map(opt=><option key={opt}>{opt}</option>)}</select></div>
              {subjectCategory==='Khác'&&<div className="contact-field"><label htmlFor="contactCustomSubject">Chủ đề cụ thể <span>*</span></label><input id="contactCustomSubject" value={customSubject} maxLength={160} placeholder="Điều bạn muốn chia sẻ" onChange={e=>{setCustomSubject(e.target.value);setErrors(prev=>({...prev,subject:''}));}} disabled={submitting} required aria-invalid={!!errors.subject} aria-describedby={errors.subject?'contactSubject-error':undefined}/>{errors.subject&&<small id="contactSubject-error">{errors.subject}</small>}</div>}
              <div className="contact-field"><label htmlFor="contactMessage">Nội dung <span>*</span></label><textarea id="contactMessage" name="message" rows={5} placeholder="Nhập nội dung bạn muốn trao đổi…" value={message} onChange={e=>{setMessage(e.target.value);setErrors(prev=>({...prev,message:''}));}} disabled={submitting} required aria-invalid={!!errors.message} aria-describedby={errors.message?'contactMessage-error':undefined}/>{errors.message&&<small id="contactMessage-error">{errors.message}</small>}</div>
              <div className="contact-submit-row"><p><span>*</span> Thông tin cần điền</p><button type="submit" disabled={submitting}>{submitting?'Đang gửi…':'Gửi tin nhắn'}<Send size={16}/></button></div>
            </form>
          </section>
          <aside className="contact-details" aria-labelledby="contact-details-title">
            <h2 id="contact-details-title">Thông tin liên hệ</h2>
            <div className="contact-address"><MapPin size={20}/><div><h3>Địa chỉ</h3><p>{siteContact.address||'Địa chỉ đang được cập nhật.'}</p>{mapsUrl&&<a href={mapsUrl} target="_blank" rel="noreferrer">Chỉ đường đến Làng Mộc <ArrowUpRight size={16}/></a>}</div></div>
            <div className="contact-details-list">
              <div><Phone size={18}/><div><h3>Điện thoại</h3>{siteContact.hotline?<a href={'tel:'+siteContact.hotline.replace(/[^+0-9]/g,'')}>{siteContact.hotline}</a>:<p>Đang cập nhật</p>}</div></div>
              <div><Mail size={18}/><div><h3>Email</h3>{siteContact.email?<a href={'mailto:'+siteContact.email}>{siteContact.email}</a>:<p>Đang cập nhật</p>}</div></div>
              {siteContact.workingHours&&<div><Clock size={18}/><div><h3>Giờ làm việc</h3><p>{siteContact.workingHours}</p></div></div>}
            </div>
          </aside>
        </div>
        <section className="contact-map-section" aria-labelledby="contact-map-title">
          <div className="contact-map-heading"><div><h2 id="contact-map-title">Bản đồ</h2></div>{mapsUrl&&<a href={mapsUrl} target="_blank" rel="noreferrer">Mở Google Maps <ArrowUpRight size={18}/></a>}</div>
          <div className="contact-map-frame">{siteMaps.status==='CHỐT'&&siteMaps.query?<iframe title="Bản đồ Làng Mộc" src={`https://maps.google.com/maps?q=${encodeURIComponent(siteMaps.query)}&z=16&output=embed`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>:<p>Vị trí bản đồ đang được cập nhật.</p>}</div>
          <p className="contact-map-caption"><MapPin size={14}/>{siteMaps.label||siteContact.address}</p>
        </section>
      </div>
    </main>
  );
}
