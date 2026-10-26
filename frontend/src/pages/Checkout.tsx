import React, { useEffect, useState, useRef } from 'react';
import { useCart } from '../features/cart/CartContext';
import { useAuth } from '../features/auth/AuthContext';
import { api, ApiError } from '../lib/api';
import type { Address, AddressPayload, CheckoutPreview, Order } from '../lib/types';
import { formatMoney, ProductImage } from '../components/catalog/ProductCard';
import { Loading } from '../components/common/States';
import { getIdempotencyKey, clearIdempotencyKey } from '../features/checkout/idempotency';
import { isMockMode } from '../config/site';
import {
  MapPin,
  CreditCard,
  FileText,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, appliedPromo, refreshCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddAddress, setShowAddAddress] = useState(false);

  // Form thêm địa chỉ mới
  const [newAddr, setNewAddr] = useState<AddressPayload>({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    province: '',
    district: '',
    ward: '',
    street_address: '',
    is_default: false
  });
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [addrSubmitting, setAddrSubmitting] = useState(false);

  // Ghi chú & Trạng thái thanh toán
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceChangeWarning, setPriceChangeWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cờ chống bấm đúp
  const isSubmittingRef = useRef(false);

  // Kiểm tra giỏ hàng rỗng
  useEffect(() => {
    if (items.length === 0 && !isSubmittingRef.current) {
      window.location.hash = '#/cart';
    }
  }, [items]);

  // Tải sổ địa chỉ
  const loadAddresses = async () => {
    try {
      const res = await api.addresses();
      const list = res.data || [];
      setAddresses(list);
      if (list.length > 0) {
        const defaultOne = list.find(a => a.is_default);
        setSelectedAddressId(prev => (prev && list.some(a => a.id === prev) ? prev : defaultOne?.id || list[0].id));
      } else {
        setSelectedAddressId('');
        setShowAddAddress(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.hash = '#/login?redirect=' + encodeURIComponent('/checkout');
      }
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // Tải giá từ POST /checkout/preview
  const updatePreview = async (addrId?: string): Promise<CheckoutPreview | null> => {
    setPreviewLoading(true);
    try {
      const res = await api.checkoutPreview({
        address_id: addrId || selectedAddressId || undefined,
        promotion_code: appliedPromo || undefined,
        payment_method: 'cod'
      });
      setPreview(res.data);
      return res.data;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          window.location.hash = '#/login?redirect=' + encodeURIComponent('/checkout');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Không thể tính toán chi phí đơn hàng. Vui lòng thử lại.');
      }
      return null;
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      updatePreview(selectedAddressId);
    }
  }, [selectedAddressId, appliedPromo, items]);

  // Thêm địa chỉ mới ngay tại checkout
  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newAddr.full_name.trim()) errs.full_name = 'Vui lòng nhập tên người nhận';
    if (!newAddr.phone.trim()) errs.phone = 'Vui lòng nhập số điện thoại';
    if (!newAddr.province.trim()) errs.province = 'Vui lòng nhập tỉnh/thành';
    if (!newAddr.district.trim()) errs.district = 'Vui lòng nhập quận/huyện';
    if (!newAddr.ward.trim()) errs.ward = 'Vui lòng nhập phường/xã';
    if (!newAddr.street_address.trim()) errs.street_address = 'Vui lòng nhập địa chỉ cụ thể';

    if (Object.keys(errs).length > 0) {
      setAddrErrors(errs);
      return;
    }

    setAddrSubmitting(true);
    setAddrErrors({});
    try {
      const res = await api.createAddress(newAddr);
      const created = res.data;
      await loadAddresses();
      setSelectedAddressId(created.id);
      setShowAddAddress(false);
      setNewAddr({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        province: '',
        district: '',
        ward: '',
        street_address: '',
        is_default: false
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Không thể tạo địa chỉ mới. Vui lòng kiểm tra lại.');
      }
    } finally {
      setAddrSubmitting(false);
    }
  };

  // Xác nhận đặt hàng COD
  const handlePlaceOrder = async () => {
    if (isSubmittingRef.current) return;
    setErrorMessage(null);
    setPriceChangeWarning(null);

    if (!selectedAddressId) {
      setErrorMessage('Vui lòng chọn hoặc thêm địa chỉ nhận hàng trước khi thanh toán.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Giỏ hàng của bạn đang trống.');
      window.location.hash = '#/cart';
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      // 1. Kiểm tra lại giá trước khi gửi đơn (Quy tắc bắt buộc số 2)
      const freshPreview = await updatePreview(selectedAddressId);
      if (!freshPreview) {
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }

      if (preview && freshPreview.total_vnd !== preview.total_vnd) {
        setPriceChangeWarning(
          `Tổng thanh toán của đơn hàng đã được cập nhật từ ${formatMoney(preview.total_vnd)} sang ${formatMoney(freshPreview.total_vnd)}. Quý khách vui lòng kiểm tra lại và bấm 'Xác nhận đặt hàng' lần nữa.`
        );
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }

      // 2. Lấy Idempotency-Key gắn với dấu vân tay đơn hàng (Quy tắc bắt buộc số 3)
      const fingerprintInput = {
        items: items.map(i => ({ id: i.id, quantity: i.quantity })),
        address_id: selectedAddressId,
        promotion_code: appliedPromo || undefined,
        note: note.trim() || undefined
      };

      const { key: idempotencyKey } = getIdempotencyKey(fingerprintInput);

      // 3. Gửi đơn hàng lên server
      const res = await api.createOrder(
        {
          address_id: selectedAddressId,
          promotion_code: appliedPromo || undefined,
          payment_method: 'cod',
          note: note.trim() || undefined
        },
        idempotencyKey
      );

      const createdOrder: Order = res.data;

      // 4. Đặt thành công:
      // Lưu order vào sessionStorage để trang thành công tải lại vẫn xem được
      try {
        sessionStorage.setItem('langmoc.last_order.' + createdOrder.id, JSON.stringify(createdOrder));
      } catch {
        // Bỏ qua nếu sessionStorage đầy
      }

      // Xóa key & làm sạch giỏ hàng
      clearIdempotencyKey();
      await refreshCart();

      // Chuyển sang route /#/order-success/<id>
      window.location.hash = `#/order-success/${encodeURIComponent(createdOrder.id)}`;
    } catch (err) {
      isSubmittingRef.current = false;
      setSubmitting(false);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Phiên hết hạn -> chuyển đăng nhập giữ giỏ
          window.location.hash = '#/login?redirect=' + encodeURIComponent('/checkout');
          return;
        }
        if (err.status === 409) {
          setErrorMessage(err.message);
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Lỗi kết nối mạng khi tạo đơn hàng. Bạn có thể bấm "Thử lại ngay" để tiếp tục với mã giao dịch hiện tại.');
      }
    }
  };

  if (loadingAddresses || (previewLoading && !preview)) {
    return (
      <main id="main" className="c2-page-wrap">
        <Loading label="Đang chuẩn bị trang thanh toán Làng Mộc…" />
      </main>
    );
  }

  const selectedAddr = addresses.find(a => a.id === selectedAddressId);

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Tiêu đề & Nhãn Mock */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="c2-title" style={{ margin: 0 }}>Thanh toán đơn hàng</h1>
            <p className="c2-subtitle" style={{ margin: '4px 0 0' }}>
              Quý khách vui lòng kiểm tra kỹ địa chỉ nhận hàng và thông tin thanh toán khi nhận hàng (COD).
            </p>
          </div>
          {isMockMode && (
            <span className="c2-mock-badge">⚙️ CHẾ ĐỘ MÔ PHỎNG (MOCK API)</span>
          )}
        </div>

        {/* Cảnh báo thay đổi giá */}
        {priceChangeWarning && (
          <div className="c2-alert c2-alert-warning" role="alert" style={{ marginBottom: '20px', background: '#fff7ed', border: '1px solid #f97316', padding: '14px 18px', borderRadius: '4px', color: '#9a3412', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.6 }}>{priceChangeWarning}</div>
          </div>
        )}

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="c2-alert c2-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="c2-cart-grid">
          {/* CỘT TRÁI: ĐỊA CHỈ, PHƯƠNG THỨC THANH TOÁN & GHI CHÚ */}
          <div className="c2-cart-items-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. SỔ ĐỊA CHỈ NHẬN HÀNG */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brown, #493421)' }}>
                  <MapPin size={18} /> Địa chỉ nhận hàng
                </h2>
                {!showAddAddress && (
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(true)}
                    className="c2-btn c2-btn-outline"
                    style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Thêm địa chỉ mới
                  </button>
                )}
              </div>

              {/* Form thêm địa chỉ mới inline */}
              {showAddAddress && (
                <div style={{ background: 'rgba(73,52,33,0.03)', padding: '18px', borderRadius: '6px', marginBottom: '18px', border: '1px solid var(--line, #c8b99e)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '13px' }}>Thông tin địa chỉ mới</strong>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, #7c6a57)' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleCreateAddress} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="c2-form-label">Họ và tên người nhận *</label>
                      <input
                        className="c2-form-input"
                        value={newAddr.full_name}
                        onChange={e => setNewAddr({ ...newAddr, full_name: e.target.value })}
                        placeholder="VD: Nguyễn Văn A"
                      />
                      {addrErrors.full_name && <small className="field-error">{addrErrors.full_name}</small>}
                    </div>
                    <div>
                      <label className="c2-form-label">Số điện thoại *</label>
                      <input
                        className="c2-form-input"
                        value={newAddr.phone}
                        onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })}
                        placeholder="VD: 0901234567"
                      />
                      {addrErrors.phone && <small className="field-error">{addrErrors.phone}</small>}
                    </div>
                    <div>
                      <label className="c2-form-label">Tỉnh / Thành phố *</label>
                      <input
                        className="c2-form-input"
                        value={newAddr.province}
                        onChange={e => setNewAddr({ ...newAddr, province: e.target.value })}
                        placeholder="VD: Hà Nội"
                      />
                      {addrErrors.province && <small className="field-error">{addrErrors.province}</small>}
                    </div>
                    <div>
                      <label className="c2-form-label">Quận / Huyện *</label>
                      <input
                        className="c2-form-input"
                        value={newAddr.district}
                        onChange={e => setNewAddr({ ...newAddr, district: e.target.value })}
                        placeholder="VD: Hoàn Kiếm"
                      />
                      {addrErrors.district && <small className="field-error">{addrErrors.district}</small>}
                    </div>
                    <div>
                      <label className="c2-form-label">Phường / Xã *</label>
                      <input
                        className="c2-form-input"
                        value={newAddr.ward}
                        onChange={e => setNewAddr({ ...newAddr, ward: e.target.value })}
                        placeholder="VD: Tràng Tiền"
                      />
                      {addrErrors.ward && <small className="field-error">{addrErrors.ward}</small>}
                    </div>
                    <div>
                      <label className="c2-form-label">Địa chỉ chi tiết (số nhà, đường) *</label>
                      <input
                        className="c2-form-input"
                        value={newAddr.street_address}
                        onChange={e => setNewAddr({ ...newAddr, street_address: e.target.value })}
                        placeholder="VD: 15 Tràng Tiền"
                      />
                      {addrErrors.street_address && <small className="field-error">{addrErrors.street_address}</small>}
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button type="submit" disabled={addrSubmitting} className="c2-btn c2-btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                        {addrSubmitting ? 'Đang lưu…' : 'Lưu địa chỉ này'}
                      </button>
                      {addresses.length > 0 && (
                        <button type="button" onClick={() => setShowAddAddress(false)} className="c2-btn c2-btn-outline" style={{ padding: '8px 16px', fontSize: '12px' }}>
                          Hủy
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Danh sách địa chỉ đã lưu */}
              {addresses.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--muted, #7c6a57)', margin: 0 }}>
                  Bạn chưa có địa chỉ nhận hàng nào. Vui lòng nhập địa chỉ ở bảng phía trên.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {addresses.map(addr => {
                    const isSelected = addr.id === selectedAddressId;
                    return (
                      <label
                        key={addr.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid var(--copper, #a5754b)' : '1px solid var(--line, #c8b99e)',
                          background: isSelected ? 'rgba(165,117,75,0.04)' : '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="selected_address"
                          value={addr.id}
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.id)}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ fontSize: '12px', lineHeight: 1.6, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--brown, #493421)' }}>{addr.full_name}</strong>
                            <span style={{ color: 'var(--muted, #7c6a57)' }}>| {addr.phone}</span>
                            {addr.is_default && (
                              <span style={{ fontSize: '10px', background: 'var(--cream, #cfbb99)', color: 'var(--brown, #493421)', padding: '2px 6px', borderRadius: '3px' }}>
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--cafe, #3b352d)', marginTop: '2px' }}>
                            {addr.street_address}, {addr.ward}, {addr.district}, {addr.province}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. PHƯƠNG THỨC THANH TOÁN (COD) */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brown, #493421)' }}>
                <CreditCard size={18} /> Phương thức thanh toán
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Lựa chọn COD khả dụng */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '6px',
                    border: '2px solid var(--copper, #a5754b)',
                    background: 'rgba(165,117,75,0.04)',
                    cursor: 'pointer'
                  }}
                >
                  <input type="radio" checked readOnly style={{ marginTop: '3px' }} />
                  <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown, #493421)' }}>
                      Thanh toán tiền mặt khi nhận hàng (COD)
                    </div>
                    <div style={{ color: 'var(--muted, #7c6a57)', marginTop: '2px' }}>
                      Quý khách thanh toán tiền mặt cho nhân viên giao hàng khi nhận kiện hàng.{' '}
                      <a href="#/policies/shipping" style={{ textDecoration: 'underline', color: 'inherit' }}>
                        Xem chính sách vận chuyển & bảo hành
                      </a>
                    </div>
                  </div>
                </label>

                {/* Các lựa chọn Chuyển khoản / Thẻ chưa hỗ trợ */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px dashed var(--line, #c8b99e)',
                    opacity: 0.6,
                    background: 'rgba(0,0,0,0.02)'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>Chuyển khoản ngân hàng trực tiếp</span>
                  <span style={{ fontSize: '10px', background: '#e5e7eb', color: '#6b7280', padding: '2px 8px', borderRadius: '4px' }}>
                    Chưa hỗ trợ
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px dashed var(--line, #c8b99e)',
                    opacity: 0.6,
                    background: 'rgba(0,0,0,0.02)'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>Thanh toán thẻ quốc tế / Cổng trực tuyến (Visa/Mastercard)</span>
                  <span style={{ fontSize: '10px', background: '#e5e7eb', color: '#6b7280', padding: '2px 8px', borderRadius: '4px' }}>
                    Chưa hỗ trợ
                  </span>
                </div>
              </div>
            </div>

            {/* 3. GHI CHÚ GIAO HÀNG */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brown, #493421)' }}>
                <FileText size={18} /> Ghi chú đơn hàng (nếu có)
              </h2>
              <textarea
                className="c2-form-input"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ví dụ: Giao vào giờ hành chính, gọi điện trước khi đến…"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG & NÚT ĐẶT HÀNG */}
          <div className="c2-cart-summary-col">
            <div className="c2-card" style={{ padding: '24px', position: 'sticky', top: '100px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px', color: 'var(--brown, #493421)', paddingBottom: '12px', borderBottom: '1px solid var(--line, #c8b99e)' }}>
                Sản phẩm đặt mua ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>

              {/* Danh sách món rút gọn */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--line, #c8b99e)' }}>
                      <ProductImage src={item.image} alt={item.name} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--brown, #493421)' }}>
                        {item.name}
                      </div>
                      <div style={{ color: 'var(--muted, #7c6a57)', fontSize: '11px' }}>
                        {item.price === null ? 'Chưa có giá' : formatMoney(item.price)} × {item.quantity}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--brown, #493421)' }}>
                      {formatMoney((item.price || 0) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bảng tính chi phí từ server */}
              <div className="c2-summary-rows">
                <div className="c2-summary-row">
                  <span>Tạm tính</span>
                  <strong>{formatMoney(preview?.subtotal_vnd ?? 0)}</strong>
                </div>

                <div className="c2-summary-row">
                  <span>Phí vận chuyển</span>
                  <span>{formatMoney(preview?.shipping_fee_vnd ?? 0)}</span>
                </div>

                {preview && preview.discount_vnd > 0 && (
                  <div className="c2-summary-row" style={{ color: '#047857' }}>
                    <span>Giảm giá ({appliedPromo})</span>
                    <strong>-{formatMoney(preview.discount_vnd)}</strong>
                  </div>
                )}

                <div className="c2-summary-divider" />

                <div className="c2-summary-row c2-summary-total">
                  <span>Tổng thanh toán</span>
                  <span style={{ fontSize: '20px', color: '#b91c1c' }}>
                    {formatMoney(preview?.total_vnd ?? 0)}
                  </span>
                </div>
              </div>

              {/* Địa chỉ giao dự kiến */}
              {selectedAddr && (
                <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(73,52,33,0.03)', borderRadius: '4px', fontSize: '11px', color: 'var(--muted, #7c6a57)', lineHeight: 1.5 }}>
                  <strong>Giao đến:</strong> {selectedAddr.full_name} ({selectedAddr.phone}) - {selectedAddr.street_address}, {selectedAddr.ward}, {selectedAddr.district}, {selectedAddr.province}
                </div>
              )}

              {/* Nút Xác nhận đặt hàng */}
              <button
                type="button"
                className="c2-btn c2-btn-primary"
                style={{ width: '100%', marginTop: '20px', padding: '14px', fontSize: '14px', fontWeight: 600 }}
                onClick={handlePlaceOrder}
                disabled={submitting || items.length === 0 || !selectedAddressId}
              >
                {submitting ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner" style={{ width: '14px', height: '14px', margin: 0 }} /> Đang xử lý tạo đơn…
                  </span>
                ) : (
                  <>Xác nhận đặt hàng (COD) <ArrowRight size={16} /></>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <a href="#/cart" style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', textDecoration: 'underline' }}>
                  ← Quay lại chỉnh sửa giỏ hàng
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
