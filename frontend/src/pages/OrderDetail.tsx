import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Order } from '../lib/types';
import { formatMoney } from '../components/catalog/ProductCard';
import { Loading } from '../components/common/States';
import { ArrowLeft, Clock, MapPin, Package, CheckCircle, AlertCircle, Ban, Truck, ShieldCheck, Printer } from 'lucide-react';
import { isMockMode } from '../config/site';
import { getStatusBadge } from './Orders';

interface OrderDetailProps {
  id: string;
}

export default function OrderDetailPage({ id }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Đổi ý không mua nữa');
  const [customReason, setCustomReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const fetchDetail = () => {
    setLoading(true);
    setError(null);
    api.order(id)
      .then(res => {
        setOrder(res.data);
      })
      .catch(err => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Không tìm thấy thông tin đơn hàng hoặc bạn không có quyền truy cập.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleConfirmCancel = async () => {
    if (!order) return;
    setSubmittingCancel(true);
    setCancelError(null);

    const finalReason = cancelReason === 'Lý do khác' ? (customReason.trim() || 'Lý do khác') : cancelReason;

    try {
      const res = await api.cancelOrder(order.id, finalReason);
      setOrder(res.data);
      setShowCancelModal(false);
      setCancelSuccessMsg('Đơn hàng đã được hủy thành công.');
      setTimeout(() => setCancelSuccessMsg(null), 6000);
    } catch (err) {
      if (err instanceof ApiError) {
        setCancelError(err.message);
      } else {
        setCancelError('Không thể hủy đơn hàng vào lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmittingCancel(false);
    }
  };

  if (loading) {
    return (
      <main id="main" className="c2-page-wrap">
        <div className="c2-main-container">
          <Loading label="Đang tải chi tiết đơn hàng…" />
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main id="main" className="c2-page-wrap">
        <div className="c2-main-container">
          <div className="c2-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#b91c1c' }}>
              <AlertCircle size={32} />
            </div>
            <h2 className="c2-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
              Không tìm thấy đơn hàng
            </h2>
            <p className="c2-subtitle" style={{ maxWidth: '420px', margin: '0 auto 24px' }}>
              {error || 'Đơn hàng yêu cầu không tồn tại hoặc đã bị xóa khỏi hệ thống.'}
            </p>
            <a href="#/orders" className="c2-btn c2-btn-primary">
              <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Xác định bước của Stepper theo 5 bước tiến trình hợp lệ: pending(1) -> confirmed(2) -> packing(3) -> shipping(4) -> delivered(5)
  let currentStepIdx = 1;
  if (order.status === 'confirmed') currentStepIdx = 2;
  else if (order.status === 'packing') currentStepIdx = 3;
  else if (order.status === 'shipping') currentStepIdx = 4;
  else if (order.status === 'delivered') currentStepIdx = 5;

  const isCancelled = order.status === 'cancelled';

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)', marginBottom: '4px' }}>
              <a href="#/account" style={{ color: 'inherit', textDecoration: 'none' }}>Tài khoản</a> ›{' '}
              <a href="#/orders" style={{ color: 'inherit', textDecoration: 'none' }}>Đơn hàng của tôi</a> ›{' '}
              <strong>{order.order_number}</strong>
            </div>
            <h1 className="c2-title" style={{ margin: 0 }}>Chi tiết đơn hàng</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a href="#/orders" className="c2-btn c2-btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>
              <ArrowLeft size={14} /> Quay lại
            </a>
            {isMockMode && <span className="c2-mock-badge">⚙️ MOCK DATA</span>}
          </div>
        </div>

        {/* Thông báo hủy thành công */}
        {cancelSuccessMsg && (
          <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{cancelSuccessMsg}</span>
          </div>
        )}

        {/* Banner nếu đơn đã hủy */}
        {isCancelled ? (
          <div style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Ban size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '14px', display: 'block' }}>Đơn hàng đã được hủy</strong>
              <div style={{ fontSize: '12px', marginTop: '2px', color: '#7f1d1d' }}>
                Đơn hàng này đã được hủy trên hệ thống.
                {order.note && order.note.includes('Lý do hủy') && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    {order.note.slice(order.note.indexOf('Lý do hủy'))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Tiến trình trạng thái (Timeline Stepper) 5 bước */
          <div className="c2-card" style={{ padding: '24px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown, #493421)' }}>
                Tiến trình đơn hàng #{order.order_number}
              </span>
              <div>{getStatusBadge(order.status)}</div>
            </div>

            <div className="c2-stepper">
              {/* Bước 1 */}
              <div className={`c2-step ${currentStepIdx === 1 ? 'active' : currentStepIdx > 1 ? 'completed' : ''}`}>
                <div className="c2-step-circle">1</div>
                <div className="c2-step-title">Đặt hàng</div>
                <div className="c2-step-time">{new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
              </div>

              {/* Bước 2 */}
              <div className={`c2-step ${currentStepIdx === 2 ? 'active' : currentStepIdx > 2 ? 'completed' : ''}`}>
                <div className="c2-step-circle">2</div>
                <div className="c2-step-title">Xác nhận</div>
                <div className="c2-step-time">{currentStepIdx >= 2 ? 'Đã duyệt' : 'Chờ duyệt'}</div>
              </div>

              {/* Bước 3 */}
              <div className={`c2-step ${currentStepIdx === 3 ? 'active' : currentStepIdx > 3 ? 'completed' : ''}`}>
                <div className="c2-step-circle">3</div>
                <div className="c2-step-title">Đóng gói</div>
                <div className="c2-step-time">{currentStepIdx >= 3 ? 'Đang đóng gói' : 'Chờ chuẩn bị'}</div>
              </div>

              {/* Bước 4 */}
              <div className={`c2-step ${currentStepIdx === 4 ? 'active' : currentStepIdx > 4 ? 'completed' : ''}`}>
                <div className="c2-step-circle">4</div>
                <div className="c2-step-title">Đang giao</div>
                <div className="c2-step-time">{currentStepIdx >= 4 ? 'Đang vận chuyển' : 'Chưa xuất kho'}</div>
              </div>

              {/* Bước 5 */}
              <div className={`c2-step ${currentStepIdx === 5 ? 'completed' : ''}`}>
                <div className="c2-step-circle">5</div>
                <div className="c2-step-title">Đã giao</div>
                <div className="c2-step-time">{currentStepIdx === 5 ? 'Hoàn thành' : 'Dự kiến 2-3 ngày'}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Cột trái: Danh sách sản phẩm & Chi tiết thanh toán */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Card Danh sách sản phẩm */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--brown, #493421)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} /> Danh sách sản phẩm ({order.items?.length || 0})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {order.items && order.items.map((item, idx) => (
                  <div key={item.id || idx} className="c2-order-item-row">
                    {item.product_image_url ? (
                      <img src={item.product_image_url} alt={item.product_name} className="c2-order-thumb" />
                    ) : (
                      <div className="c2-order-thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted, #7c6a57)' }}>
                        <Package size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: 'var(--brown, #493421)' }}>
                        {item.product_name}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>
                        Đơn giá: {formatMoney(item.unit_price_vnd)} × <strong>{item.quantity}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '14px', color: 'var(--cafe, #3b352d)' }}>
                      {formatMoney(item.line_total_vnd || item.unit_price_vnd * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Chi tiết tiền */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--brown, #493421)' }}>
                Tổng kết thanh toán
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--cafe, #3b352d)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted, #7c6a57)' }}>Tạm tính:</span>
                  <span>{formatMoney(order.subtotal_vnd)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted, #7c6a57)' }}>Phí vận chuyển tiêu chuẩn:</span>
                  <span>{formatMoney(order.shipping_fee_vnd)}</span>
                </div>

                {order.discount_vnd > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>
                      Giảm giá voucher {order.promotion_code && <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>{order.promotion_code}</code>}:
                    </span>
                    <span>-{formatMoney(order.discount_vnd)}</span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--line, #c8b99e)', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown, #493421)' }}>Tổng thanh toán:</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#b91c1c' }}>
                    {formatMoney(order.total_vnd)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: '#f4efe6', borderRadius: '4px', fontSize: '12px', color: 'var(--muted, #7c6a57)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: 'var(--copper, #a5754b)', flexShrink: 0 }} />
                <span>
                  Phương thức: <strong>Thanh toán khi nhận hàng (COD)</strong> — Trạng thái:{' '}
                  <strong>{order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin giao nhận & Thao tác */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Card Thông tin người nhận */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--brown, #493421)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} /> Địa chỉ nhận hàng
              </h3>

              <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--cafe, #3b352d)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown, #493421)', marginBottom: '4px' }}>
                  {order.recipient_name}
                </div>
                <div style={{ color: 'var(--muted, #7c6a57)', marginBottom: '8px' }}>
                  Số điện thoại: <strong>{order.phone}</strong>
                </div>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '4px', border: '1px solid var(--line, #c8b99e)' }}>
                  {order.shipping_address}
                </div>

                {order.note && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>
                    <strong>Ghi chú giao hàng:</strong> {order.note}
                  </div>
                )}
              </div>
            </div>

            {/* Card Thao tác đơn hàng */}
            <div className="c2-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--brown, #493421)' }}>
                Thao tác
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Chỉ cho phép hủy khi status === 'pending' */}
                {order.status === 'pending' && (
                  <button
                    type="button"
                    className="c2-btn"
                    style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setShowCancelModal(true);
                      setCancelError(null);
                    }}
                  >
                    <Ban size={16} /> Hủy đơn hàng này
                  </button>
                )}

                <a
                  href="#/catalog"
                  className="c2-btn c2-btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Package size={16} /> Tiếp tục mua sắm
                </a>

                <button
                  type="button"
                  className="c2-btn c2-btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> In phiếu đơn hàng
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--muted, #7c6a57)', textAlign: 'center', lineHeight: '1.5' }}>
                Cần hỗ trợ đơn hàng? Liên hệ hotline Làng Mộc: <strong>1900 6868</strong> (8:00 - 20:00)
              </div>
            </div>
          </div>
        </div>

        {/* MODAL HỦY ĐƠN HÀNG */}
        {showCancelModal && (
          <div className="c2-modal-backdrop" onClick={() => !submittingCancel && setShowCancelModal(false)}>
            <div className="c2-modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', marginBottom: '14px' }}>
                <AlertCircle size={24} />
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Xác nhận hủy đơn hàng #{order.order_number}
                </h3>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--cafe, #3b352d)', lineHeight: '1.6', marginBottom: '16px' }}>
                Hệ thống sẽ hoàn trả số lượng các sản phẩm thủ công về lại kho hàng. Bạn có chắc chắn muốn hủy đơn hàng này không?
              </p>

              {cancelError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '12px', marginBottom: '16px' }}>
                  {cancelError}
                </div>
              )}

              <div className="c2-form-group" style={{ marginBottom: '16px' }}>
                <label className="c2-label" htmlFor="detailCancelReason">Lý do hủy đơn:</label>
                <select
                  id="detailCancelReason"
                  className="c2-input"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  disabled={submittingCancel}
                >
                  <option value="Đổi ý không mua nữa">Đổi ý không mua nữa</option>
                  <option value="Muốn thay đổi địa chỉ nhận hàng">Muốn thay đổi địa chỉ nhận hàng</option>
                  <option value="Muốn thêm/bớt sản phẩm khác">Muốn thêm/bớt sản phẩm khác</option>
                  <option value="Thời gian giao hàng dự kiến không phù hợp">Thời gian giao hàng dự kiến không phù hợp</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              {cancelReason === 'Lý do khác' && (
                <div className="c2-form-group" style={{ marginBottom: '16px' }}>
                  <label className="c2-label" htmlFor="detailCustomReason">Lý do cụ thể:</label>
                  <input
                    id="detailCustomReason"
                    type="text"
                    className="c2-input"
                    placeholder="Vui lòng cho biết lý do của bạn..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    disabled={submittingCancel}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="c2-btn c2-btn-outline"
                  onClick={() => setShowCancelModal(false)}
                  disabled={submittingCancel}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="c2-btn"
                  style={{ background: '#b91c1c', color: '#fff', border: 'none' }}
                  onClick={handleConfirmCancel}
                  disabled={submittingCancel}
                >
                  {submittingCancel ? 'Đang hủy…' : 'Xác nhận hủy đơn'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
