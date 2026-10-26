import React, { useState } from 'react';
import { ClipboardList, Package, FolderTree, Star, Mail, Leaf, Menu, X, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';

export function AdminAccessDenied() {
  return (
    <main className="admin-denied" role="alert" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#b91c1c' }}>
        <span style={{ fontSize: '32px' }}>🔒</span>
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', color: 'var(--brown, #493421)', marginBottom: '8px' }}>
        Không có quyền truy cập (403)
      </h1>
      <p style={{ color: 'var(--muted, #7c6a57)', maxWidth: '440px', margin: '0 auto 24px', fontSize: '14px' }}>
        Tài khoản hiện tại không được phép xem dữ liệu quản trị. Trang này chỉ dành cho Quản trị viên (Admin).
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <a href="#/" className="c2-btn c2-btn-primary" style={{ textDecoration: 'none' }}>Về trang chủ</a>
        <a href="#/account" className="c2-btn c2-btn-outline" style={{ textDecoration: 'none' }}>Tài khoản của tôi</a>
      </div>
    </main>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: 'orders' | 'products' | 'categories' | 'reviews' | 'contact';
}

export default function AdminLayout({ children, activeTab = 'orders' }: AdminLayoutProps) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      window.location.hash = '#/login';
      window.location.reload();
    }
  };

  const navItems = [
    { id: 'orders', label: 'Đơn hàng', href: '#/admin/orders', icon: ClipboardList },
    { id: 'products', label: 'Sản phẩm', href: '#/admin/products', icon: Package },
    { id: 'categories', label: 'Danh mục', href: '#/admin/categories', icon: FolderTree },
    { id: 'reviews', label: 'Đánh giá', href: '#/admin/reviews', icon: Star },
    { id: 'contact', label: 'Hộp thư liên hệ', href: '#/admin/contact', icon: Mail },
  ];

  return (
    <div className="admin-shell">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Điều hướng quản trị">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#/admin/orders" className="admin-brand" onClick={() => setMobileOpen(false)}>
            <Leaf size={22} aria-hidden="true" />
            <span>Làng Mộc <small>Quản trị</small></span>
          </a>
          <button
            type="button"
            className="admin-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav" style={{ marginTop: '24px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer" style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            Đang trực: <strong>{user?.full_name || 'Admin'}</strong>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="admin-nav-item"
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fca5a5' }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="admin-hamburger"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu quản trị"
            >
              <Menu size={20} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown, #493421)' }}>
              Khu vực Quản trị Làng Mộc
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="#/" className="admin-link-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={14} /> Về cửa hàng
            </a>
          </div>
        </header>

        <div className="admin-body">
          {children}
        </div>
      </div>
    </div>
  );
}
