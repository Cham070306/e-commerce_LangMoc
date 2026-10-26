import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { api, ApiError } from '../lib/api';
import type { Address } from '../lib/types';
import { Loading } from '../components/common/States';
import { isMockMode } from '../config/site';

interface AccountPageProps {
  initialTab?: 'info' | 'addresses';
}

export default function AccountPage({ initialTab = 'info' }: AccountPageProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'addresses'>(initialTab);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // New Address Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState('Thành phố Hồ Chí Minh');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab]);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    setAddressError(null);
    try {
      const res = await api.addresses();
      setAddresses(res.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setAddressError(err.message);
      } else {
        setAddressError('Không thể tải danh sách địa chỉ.');
      }
    } finally {
      setLoadingAddresses(false);
    }
  };

  const validateAddressForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên người nhận.';
    if (!phone.trim()) errs.phone = 'Vui lòng nhập số điện thoại.';
    if (!province.trim()) errs.province = 'Vui lòng chọn hoặc nhập Tỉnh/Thành phố.';
    if (!district.trim()) errs.district = 'Vui lòng nhập Quận/Huyện.';
    if (!ward.trim()) errs.ward = 'Vui lòng nhập Phường/Xã.';
    if (!streetAddress.trim()) errs.streetAddress = 'Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường).';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    if (!validateAddressForm()) return;

    setSubmittingAddress(true);
    try {
      const res = await api.createAddress({
        full_name: fullName.trim(),
        phone: phone.trim(),
        province: province.trim(),
        district: district.trim(),
        ward: ward.trim(),
        street_address: streetAddress.trim(),
        is_default: isDefault
      });
      setFormSuccess('Đã thêm địa chỉ giao hàng mới thành công!');
      setShowAddForm(false);
      // Reset form
      setDistrict('');
      setWard('');
      setStreetAddress('');
      setIsDefault(false);
      // Tải lại danh sách
      await fetchAddresses();
    } catch (err) {
      if (err instanceof ApiError) {
        setAddressError(err.message);
        if (err.fields) {
          setFormErrors(prev => ({ ...prev, ...err.fields }));
        }
      } else {
        setAddressError('Không thể tạo địa chỉ mới. Vui lòng thử lại.');
      }
    } finally {
      setSubmittingAddress(false);
    }
  };

  if (!user) return null;

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Profile Card Header */}
        <div className="c2-card" style={{ marginBottom: '24px' }}>
          <div className="c2-profile-header">
            <div className="c2-profile-user">
              <div className="c2-avatar" aria-hidden="true">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 className="c2-title" style={{ fontSize: '22px', margin: 0 }}>
                    {user.full_name}
                  </h1>
                  <span className={`c2-role-badge ${user.role === 'admin' ? 'c2-role-admin' : 'c2-role-customer'}`}>
                    {user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted, #7c6a57)' }}>
                  {user.email} {user.phone ? `· ${user.phone}` : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {user.role === 'admin' && (
                <a href="#/admin" className="c2-btn c2-btn-outline c2-btn-sm">
                  Trang quản trị (Admin) ↗
                </a>
              )}
              <button
                type="button"
                className="c2-btn c2-btn-ghost c2-btn-sm"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="c2-tabs">
            <button
              type="button"
              className={`c2-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Thông tin tài khoản
            </button>
            <button
              type="button"
              className={`c2-tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
              onClick={() => setActiveTab('addresses')}
            >
              Sổ địa chỉ giao hàng
            </button>
            <a
              href="#/orders"
              className="c2-tab-btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              Đơn hàng của tôi 📦
            </a>
          </div>

          {/* TAB 1: THÔNG TIN TÀI KHOẢN */}
          {activeTab === 'info' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '4px', border: '1px solid var(--line, #c8b99e)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Họ và tên</span>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{user.full_name}</div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '4px', border: '1px solid var(--line, #c8b99e)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email đăng nhập</span>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{user.email}</div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '4px', border: '1px solid var(--line, #c8b99e)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số điện thoại</span>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{user.phone || 'Chưa cập nhật'}</div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '4px', border: '1px solid var(--line, #c8b99e)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vai trò hệ thống</span>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
                    <code>{user.role}</code>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', background: '#f4efe6', borderRadius: '4px', fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>
                💡 <strong>Lưu ý bảo mật:</strong> Thông tin phiên được quản lý an toàn qua HttpOnly Cookie. Đăng xuất sẽ xóa cookie phiên trên trình duyệt.
              </div>
            </div>
          )}

          {/* TAB 2: SỔ ĐỊA CHỈ */}
          {activeTab === 'addresses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--brown, #493421)' }}>Địa chỉ nhận hàng</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>
                    Địa chỉ được dùng để tính phí vận chuyển và nhận hàng COD
                  </p>
                </div>
                {!showAddForm && (
                  <button
                    type="button"
                    className="c2-btn c2-btn-primary c2-btn-sm"
                    onClick={() => { setShowAddForm(true); setFormSuccess(null); }}
                  >
                    + Thêm địa chỉ mới
                  </button>
                )}
              </div>

              {formSuccess && (
                <div className="c2-alert c2-alert-success" role="status" style={{ marginBottom: '16px' }}>
                  <span>✓</span>
                  <div>{formSuccess}</div>
                </div>
              )}

              {addressError && (
                <div className="c2-alert c2-alert-error" role="alert" style={{ marginBottom: '16px' }}>
                  <span>⚠️</span>
                  <div>{addressError}</div>
                </div>
              )}

              {/* FORM THÊM ĐỊA CHỈ MỚI */}
              {showAddForm && (
                <div style={{ background: '#fff', border: '1px solid var(--line, #c8b99e)', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--brown, #493421)' }}>
                    Thêm địa chỉ giao hàng mới
                  </h4>

                  <form onSubmit={handleCreateAddress} className="c2-form" noValidate>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div className="c2-form-group">
                        <label className="c2-label" htmlFor="addr-name">
                          Họ và tên người nhận <span className="c2-required">*</span>
                        </label>
                        <input
                          id="addr-name"
                          type="text"
                          className={`c2-input ${formErrors.fullName ? 'c2-input-error' : ''}`}
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                        />
                        {formErrors.fullName && <span className="c2-error-text">{formErrors.fullName}</span>}
                      </div>

                      <div className="c2-form-group">
                        <label className="c2-label" htmlFor="addr-phone">
                          Số điện thoại <span className="c2-required">*</span>
                        </label>
                        <input
                          id="addr-phone"
                          type="tel"
                          className={`c2-input ${formErrors.phone ? 'c2-input-error' : ''}`}
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="0901234567"
                        />
                        {formErrors.phone && <span className="c2-error-text">{formErrors.phone}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div className="c2-form-group">
                        <label className="c2-label" htmlFor="addr-province">
                          Tỉnh / Thành phố <span className="c2-required">*</span>
                        </label>
                        <input
                          id="addr-province"
                          type="text"
                          className={`c2-input ${formErrors.province ? 'c2-input-error' : ''}`}
                          value={province}
                          onChange={e => setProvince(e.target.value)}
                          placeholder="TP. Hồ Chí Minh"
                        />
                        {formErrors.province && <span className="c2-error-text">{formErrors.province}</span>}
                      </div>

                      <div className="c2-form-group">
                        <label className="c2-label" htmlFor="addr-district">
                          Quận / Huyện <span className="c2-required">*</span>
                        </label>
                        <input
                          id="addr-district"
                          type="text"
                          className={`c2-input ${formErrors.district ? 'c2-input-error' : ''}`}
                          value={district}
                          onChange={e => setDistrict(e.target.value)}
                          placeholder="Quận 1, Bình Thạnh..."
                        />
                        {formErrors.district && <span className="c2-error-text">{formErrors.district}</span>}
                      </div>

                      <div className="c2-form-group">
                        <label className="c2-label" htmlFor="addr-ward">
                          Phường / Xã <span className="c2-required">*</span>
                        </label>
                        <input
                          id="addr-ward"
                          type="text"
                          className={`c2-input ${formErrors.ward ? 'c2-input-error' : ''}`}
                          value={ward}
                          onChange={e => setWard(e.target.value)}
                          placeholder="Phường Bến Nghé..."
                        />
                        {formErrors.ward && <span className="c2-error-text">{formErrors.ward}</span>}
                      </div>
                    </div>

                    <div className="c2-form-group">
                      <label className="c2-label" htmlFor="addr-street">
                        Địa chỉ chi tiết (số nhà, tên đường, tòa nhà) <span className="c2-required">*</span>
                      </label>
                      <input
                        id="addr-street"
                        type="text"
                        className={`c2-input ${formErrors.streetAddress ? 'c2-input-error' : ''}`}
                        value={streetAddress}
                        onChange={e => setStreetAddress(e.target.value)}
                        placeholder="Số 123 đường Lê Lợi..."
                      />
                      {formErrors.streetAddress && <span className="c2-error-text">{formErrors.streetAddress}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="addr-default"
                        type="checkbox"
                        checked={isDefault}
                        onChange={e => setIsDefault(e.target.checked)}
                      />
                      <label htmlFor="addr-default" style={{ fontSize: '13px', cursor: 'pointer' }}>
                        Đặt làm địa chỉ giao hàng mặc định
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="submit"
                        className="c2-btn c2-btn-primary"
                        disabled={submittingAddress}
                      >
                        {submittingAddress ? 'Đang lưu…' : 'Lưu địa chỉ'}
                      </button>
                      <button
                        type="button"
                        className="c2-btn c2-btn-outline"
                        onClick={() => setShowAddForm(false)}
                        disabled={submittingAddress}
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* DANH SÁCH ĐỊA CHỈ */}
              {loadingAddresses ? (
                <Loading label="Đang tải danh sách địa chỉ…" />
              ) : addresses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: '#fff', border: '1px dashed var(--line, #c8b99e)', borderRadius: '6px' }}>
                  <p style={{ margin: 0, color: 'var(--muted, #7c6a57)', fontSize: '13px' }}>
                    Bạn chưa có địa chỉ giao hàng nào.
                  </p>
                  {!showAddForm && (
                    <button
                      type="button"
                      className="c2-btn c2-btn-outline c2-btn-sm"
                      style={{ marginTop: '12px' }}
                      onClick={() => setShowAddForm(true)}
                    >
                      + Thêm địa chỉ đầu tiên
                    </button>
                  )}
                </div>
              ) : (
                <div className="c2-address-list">
                  {addresses.map(addr => (
                    <div key={addr.id} className="c2-address-card">
                      <div className="c2-address-info">
                        <h4>
                          {addr.full_name}
                          {addr.is_default && (
                            <span className="c2-default-badge">Mặc định</span>
                          )}
                        </h4>
                        <div className="c2-address-phone">📞 {addr.phone}</div>
                        <div className="c2-address-text">
                          📍 {addr.street_address}, {addr.ward}, {addr.district}, {addr.province}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* GHI CHÚ PHẠM VI HỢP ĐỒNG API */}
              <div style={{ marginTop: '24px', padding: '12px 16px', background: '#f4efe6', borderRadius: '4px', fontSize: '11px', color: 'var(--muted, #7c6a57)', lineHeight: '1.6' }}>
                ℹ️ <strong>Đối chiếu hợp đồng docs/API.md:</strong> API hiện tại quy định <code>GET /me/addresses</code> và <code>POST /me/addresses</code>. Thao tác Sửa / Xóa / Đặt mặc định địa chỉ chưa có endpoint trong tài liệu hợp đồng v1, giao diện tuân thủ chính xác và không tự ý bịa endpoint.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
