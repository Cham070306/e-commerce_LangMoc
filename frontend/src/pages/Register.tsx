import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError } from '../lib/api';
import { SITE_NAME, isMockMode } from '../config/site';

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên của bạn.';
    }
    if (!email.trim()) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Email không đúng định dạng.';
    }
    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 6) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }
    if (phone.trim() && !/^[0-9+() -]{8,15}$/.test(phone.trim())) {
      nextErrors.phone = 'Số điện thoại không hợp lệ.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined
      });
      window.location.hash = '#/account';
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
        if (err.fields) {
          setErrors(prev => ({ ...prev, ...err.fields }));
        }
      } else {
        setApiError('Đăng ký không thành công. Vui lòng kiểm tra lại kết nối mạng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-auth-container">
        <div className="c2-card">
          <div className="c2-card-header">
            {isMockMode && (
              <div style={{ marginBottom: '14px' }}>
                <span className="c2-mock-badge">⚙️ CHẾ ĐỘ MÔ PHỎNG (MOCK API)</span>
              </div>
            )}
            <h1 className="c2-title">Đăng ký tài khoản</h1>
            <p className="c2-subtitle">
              Trở thành thành viên của <strong>{SITE_NAME}</strong> để lưu địa chỉ và theo dõi đơn hàng
            </p>
          </div>

          {apiError && (
            <div className="c2-alert c2-alert-error" role="alert" style={{ marginBottom: '20px' }}>
              <span>⚠️</span>
              <div>{apiError}</div>
            </div>
          )}

          <form className="c2-form" onSubmit={handleSubmit} noValidate>
            <div className="c2-form-group">
              <label className="c2-label" htmlFor="reg-name">
                Họ và tên <span className="c2-required">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                className={`c2-input ${errors.fullName ? 'c2-input-error' : ''}`}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                disabled={submitting}
              />
              {errors.fullName && <span className="c2-error-text">{errors.fullName}</span>}
            </div>

            <div className="c2-form-group">
              <label className="c2-label" htmlFor="reg-email">
                Địa chỉ Email <span className="c2-required">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                className={`c2-input ${errors.email ? 'c2-input-error' : ''}`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vidu@example.com"
                autoComplete="email"
                disabled={submitting}
              />
              {errors.email && <span className="c2-error-text">{errors.email}</span>}
            </div>

            <div className="c2-form-group">
              <label className="c2-label" htmlFor="reg-phone">
                Số điện thoại (tùy chọn)
              </label>
              <input
                id="reg-phone"
                type="tel"
                className={`c2-input ${errors.phone ? 'c2-input-error' : ''}`}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="090 123 4567"
                disabled={submitting}
              />
              {errors.phone && <span className="c2-error-text">{errors.phone}</span>}
            </div>

            <div className="c2-form-group">
              <label className="c2-label" htmlFor="reg-password">
                Mật khẩu <span className="c2-required">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                className={`c2-input ${errors.password ? 'c2-input-error' : ''}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
                disabled={submitting}
              />
              {errors.password && <span className="c2-error-text">{errors.password}</span>}
            </div>

            <div className="c2-form-group">
              <label className="c2-label" htmlFor="reg-confirm">
                Xác nhận mật khẩu <span className="c2-required">*</span>
              </label>
              <input
                id="reg-confirm"
                type="password"
                className={`c2-input ${errors.confirmPassword ? 'c2-input-error' : ''}`}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                disabled={submitting}
              />
              {errors.confirmPassword && (
                <span className="c2-error-text">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="c2-btn c2-btn-primary c2-btn-block"
              disabled={submitting}
            >
              {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký tài khoản'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
              <span>Đã có tài khoản? </span>
              <a href="#/login" style={{ fontWeight: 600, textDecoration: 'underline' }}>
                Đăng nhập
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
