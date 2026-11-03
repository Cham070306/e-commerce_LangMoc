import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError } from '../lib/api';
import { SITE_NAME, isMockMode } from '../config/site';
import { loginDestination } from '../lib/loginRedirect';
import {Eye, EyeOff, ArrowRight} from 'lucide-react';
import '../styles/customer-pages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lấy đường dẫn chuyển hướng sau khi đăng nhập thành công
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  // An toàn: Chặn open redirect, chỉ cho phép đường dẫn nội bộ hợp lệ
  const redirectTarget = loginDestination(searchParams.get('redirect'));

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
    <main id="main" className="customer-page login-page">
      <div className="login-shell">
        <a className="customer-back" href="#/">← Về trang chủ</a>
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-heading"><h1 id="login-title">Đăng nhập</h1><p>Chào mừng bạn quay lại với {SITE_NAME}.</p></div>
          {apiError&&<div className="customer-error" role="alert">{apiError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="customer-field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" placeholder="ban@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErrors(prev=>({...prev,email:''}));}} disabled={submitting} required aria-invalid={!!errors.email} aria-describedby={errors.email?'login-email-error':undefined}/>{errors.email&&<small id="login-email-error">{errors.email}</small>}</div>
            <div className="customer-field"><label htmlFor="login-password">Mật khẩu</label><div className="login-password"><input id="login-password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={e=>{setPassword(e.target.value);setErrors(prev=>({...prev,password:''}));}} disabled={submitting} required aria-invalid={!!errors.password} aria-describedby={errors.password?'login-password-error':undefined}/><button type="button" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)} disabled={submitting}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{errors.password&&<small id="login-password-error">{errors.password}</small>}</div>
            <button className="customer-primary login-submit" type="submit" disabled={submitting}>{submitting?'Đang đăng nhập…':'Đăng nhập'}<ArrowRight size={17}/></button>
          </form>
          <p className="login-register">Chưa có tài khoản? <a href="#/register">Đăng ký ngay</a></p>
          {isMockMode&&<details className="login-demo"><summary>Tài khoản dùng thử</summary><div>{[
            {label:'Khách hàng · Linh',email:'linh@example.com',password:'MatKhau123@'},
            {label:'Khách hàng · Minh',email:'minh@example.com',password:'MatKhau123@'},
            {label:'Quản trị viên',email:'admin@langmoc.example',password:'AdminSecret123@'}
          ].map(account=><button type="button" key={account.email} onClick={()=>{setEmail(account.email);setPassword(account.password);setErrors({});setApiError(null);}}>{account.label}<ArrowRight size={14}/></button>)}</div></details>}
        </section>
        <p className="login-footnote">Sản phẩm thủ công Việt, kết nối những giá trị đẹp.</p>
      </div>
    </main>
  );
}
