import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError } from '../lib/api';
import { SITE_NAME, isMockMode } from '../config/site';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lấy đường dẫn chuyển hướng sau khi đăng nhập thành công
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const redirectTarget = searchParams.get('redirect') || '/';

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Email không đúng định dạng.';
    }
    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
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
      const user = await login({ email: email.trim(), password });
      // Chuyển hướng theo vai trò hoặc redirect URL
      if (redirectTarget && redirectTarget !== '/login') {
        window.location.hash = '#' + (redirectTarget.startsWith('/') ? redirectTarget : '/' + redirectTarget);
      } else if (user.role === 'admin') {
        window.location.hash = '#/admin';
      } else {
        window.location.hash = '#/account';
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
        if (err.fields) {
          setErrors(prev => ({ ...prev, ...err.fields }));
        }
      } else {
        setApiError('Đăng nhập thất bại. Vui lòng kiểm tra lại kết nối mạng.');
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
            <h1 className="c2-title">Đăng nhập tài khoản</h1>
            <p className="c2-subtitle">
              Chào mừng bạn quay lại với <strong>{SITE_NAME}</strong>
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
              <label className="c2-label" htmlFor="login-email">
                Địa chỉ Email <span className="c2-required">*</span>
              </label>
              <input
                id="login-email"
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
              <label className="c2-label" htmlFor="login-password">
                Mật khẩu <span className="c2-required">*</span>
              </label>
              <input
                id="login-password"
                type="password"
                className={`c2-input ${errors.password ? 'c2-input-error' : ''}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                autoComplete="current-password"
                disabled={submitting}
              />
              {errors.password && <span className="c2-error-text">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="c2-btn c2-btn-primary c2-btn-block"
              disabled={submitting}
            >
              {submitting ? 'Đang xác thực…' : 'Đăng nhập'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
              <span>Chưa có tài khoản? </span>
              <a href="#/register" style={{ fontWeight: 600, textDecoration: 'underline' }}>
                Đăng ký ngay
              </a>
            </div>
          </form>

          {isMockMode && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--line, #c8b99e)' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted, #7c6a57)', marginBottom: '8px' }}>
                🔑 Tài khoản kiểm thử nhanh (bấm để tự động điền):
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #d4c8b8',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: 'var(--brown, #493421)',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setEmail('linh@example.com');
                    setPassword('MatKhau123@');
                    setErrors({});
                    setApiError(null);
                  }}
                >
                  <span>👤 <strong>Khách hàng (Linh Nguyễn):</strong> linh@example.com</span>
                  <span style={{ color: 'var(--muted, #7c6a57)', fontFamily: 'monospace' }}>MatKhau123@</span>
                </button>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #d4c8b8',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: 'var(--brown, #493421)',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setEmail('minh@example.com');
                    setPassword('MatKhau123@');
                    setErrors({});
                    setApiError(null);
                  }}
                >
                  <span>👤 <strong>Khách hàng (Minh Trần):</strong> minh@example.com</span>
                  <span style={{ color: 'var(--muted, #7c6a57)', fontFamily: 'monospace' }}>MatKhau123@</span>
                </button>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#faf6f0',
                    border: '1px solid #b85d38',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: '#b85d38',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setEmail('admin@langmoc.example');
                    setPassword('AdminSecret123@');
                    setErrors({});
                    setApiError(null);
                  }}
                >
                  <span>🛡️ <strong>Quản trị viên (Admin):</strong> admin@langmoc.example</span>
                  <span style={{ color: '#b85d38', fontFamily: 'monospace' }}>AdminSecret123@</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

