import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Loading } from '../../components/common/States';

export function RequireAuth({
  children,
  redirectTo
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const currentHash = window.location.hash.replace(/^#/, '');
      const target = redirectTo || currentHash || '/';
      window.location.hash = `#/login?redirect=${encodeURIComponent(target)}`;
    }
  }, [user, loading, redirectTo]);

  if (loading) {
    return (
      <main id="main" className="c2-page-wrap">
        <Loading label="Đang kiểm tra phiên đăng nhập…" />
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const currentHash = window.location.hash.replace(/^#/, '') || '/admin';
      window.location.hash = `#/login?redirect=${encodeURIComponent(currentHash)}`;
    }
  }, [user, loading]);

  if (loading) {
    return (
      <main id="main" className="c2-page-wrap">
        <Loading label="Đang kiểm tra quyền quản trị…" />
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <main id="main" className="c2-page-wrap">
        <div className="c2-main-container">
          <div className="c2-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
            <h1 className="c2-title">Từ chối truy cập (403)</h1>
            <p className="c2-subtitle" style={{ maxWidth: '440px', margin: '0 auto 24px' }}>
              Tài khoản hiện tại không được phép xem dữ liệu quản trị.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href="#/" className="c2-btn c2-btn-primary">Về trang chủ</a>
              <a href="#/account" className="c2-btn c2-btn-outline">Tài khoản của tôi</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
