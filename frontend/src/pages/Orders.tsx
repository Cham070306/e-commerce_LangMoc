import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Order } from '../lib/types';
import { formatMoney } from '../components/catalog/ProductCard';
import { Loading } from '../components/common/States';
import { Package, ArrowRight, Clock, MapPin, AlertCircle, CheckCircle, XCircle, ChevronRight, Ban, Eye } from 'lucide-react';
import { isMockMode } from '../config/site';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

interface TabItem {
  id: FilterStatus;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'delivered', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' }
];

export function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <span className="c2-order-status-badge c2-status-pending"><Clock size={12} /> Chờ xác nhận</span>;
    case 'confirmed':
      return <span className="c2-order-status-badge c2-status-confirmed"><CheckCircle size={12} /> Đã xác nhận</span>;
    case 'packing':
    case 'shipping':
      return <span className="c2-order-status-badge c2-status-shipping"><Package size={12} /> Đang giao hàng</span>;
    case 'delivered':
      return <span className="c2-order-status-badge c2-status-delivered"><CheckCircle size={12} /> Đã giao hàng</span>;
    case 'cancelled':
      return <span className="c2-order-status-badge c2-status-cancelled"><XCircle size={12} /> Đã hủy</span>;
    default:
      return <span className="c2-order-status-badge c2-status-pending">{status}</span>;
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // State cho Modal hủy đơn
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Đổi ý không mua nữa');
  const [customReason, setCustomReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const fetchOrders = (targetPage = page, targetFilter = activeFilter) => {
    setLoading(true);
    setError(null);
    api.orders({
      page: targetPage,
      limit,
      status: targetFilter !== 'all' ? targetFilter : undefined
    })
      .then(res => {
        setOrders(res.data || []);
        setTotal(res.meta?.total || (res.data || []).length);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau.');
        }
        setOrders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders(page, activeFilter);
  }, [page, activeFilter]);

  const handleFilterChange = (filterId: FilterStatus) => {
    setActiveFilter(filterId);
    setPage(1);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setSubmittingCancel(true);
    setCancelError(null);

    const finalReason = cancelReason === 'Lý do khác' ? (customReason.trim() || 'Lý do khác') : cancelReason;

    try {
      const res = await api.cancelOrder(cancellingOrder.id, finalReason);
      setToastSuccess(`Đã hủy thành công đơn hàng ${res.data.order_number || cancellingOrder.order_number}.`);
      setCancellingOrder(null);
      setCustomReason('');
      // Cập nhật lại danh sách tại chỗ
      fetchOrders(page, activeFilter);
      setTimeout(() => setToastSuccess(null), 5000);
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

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Header Breadcrumb & Tiêu đề */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)', marginBottom: '4px' }}>
              <a href="#/account" style={{ color: 'inherit', textDecoration: 'none' }}>Tài khoản</a> › <strong>Đơn hàng của tôi</strong>
            </div>
            <h1 className="c2-title" style={{ margin: 0 }}>Lịch sử đơn hàng</h1>
            <p className="c2-subtitle" style={{ margin: '4px 0 0' }}>
              Theo dõi tiến trình vận chuyển, kiểm tra chi tiết và quản lý các đơn hàng tại Làng Mộc.
            </p>
          </div>
          {isMockMode && <span className="c2-mock-badge">⚙️ CHẾ ĐỘ MÔ PHỎNG (MOCK API)</span>}
        </div>

        {/* Thông báo thành công */}
        {toastSuccess && (
          <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{toastSuccess}</span>
          </div>
        )}

        {/* Tabs bộ lọc trạng thái */}
        <div className="c2-tabs" style={{ marginBottom: '24px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`c2-tab-btn ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => handleFilterChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trạng thái lỗi nếu có */}
        {error && (
          <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '6px', color: '#991b1b', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <div>
              <strong>Lỗi:</strong> {error}
              <button
                type="button"
                onClick={() => fetchOrders(page, activeFilter)}
                style={{ marginLeft: '12px', background: 'none', border: 'underline', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
              >
                Tải lại
              </button>
            </div>
          </div>
        )}

        {/* Trạng thái đang tải */}
        {loading ? (
          <div className="c2-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Loading label="Đang tải danh sách đơn hàng…" />
          </div>
        ) : orders.length === 0 ? (
          /* Trạng thái danh sách rỗng */
          <div className="c2-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(73,52,33,0.06)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--brown, #493421)' }}>
              <Package size={30} />
            </div>
            <h2 className="c2-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
              {activeFilter === 'all' ? 'Chưa có đơn hàng nào' : `Không có đơn hàng nào ở trạng thái "${TABS.find(t => t.id === activeFilter)?.label}"`}
            </h2>
            <p className="c2-subtitle" style={{ maxWidth: '420px', margin: '0 auto 20px' }}>
              {activeFilter === 'all'
                ? 'Quý khách chưa thực hiện đặt mua đơn hàng nào trên hệ thống Làng Mộc.'
                : 'Hiện tại bạn không có đơn hàng nào phù hợp với bộ lọc đã chọn.'}
            </p>
            <a href="#/catalog" className="c2-btn c2-btn-primary">
              Khám phá sản phẩm ngay <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          /* Danh sách thẻ đơn hàng */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.map(order => (
              <div key={order.id} className="c2-card" style={{ padding: '24px' }}>
                {/* Dòng tiêu đề thẻ: Mã đơn, Thời gian & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--line, #c8b99e)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>Mã đơn hàng:</span>
                      <strong style={{ fontSize: '15px', color: 'var(--brown, #493421)', letterSpacing: '0.5px' }}>
                        {order.order_number}
                      </strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Clock size={12} /> Đặt lúc {new Date(order.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Danh sách sản phẩm trong đơn snapshot */}
                <div style={{ padding: '8px 0' }}>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
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
                          <div style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)' }}>
                            Số lượng: <strong>x{item.quantity}</strong> | Đơn giá: {formatMoney(item.unit_price_vnd)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '13px', color: 'var(--cafe, #3b352d)' }}>
                          {formatMoney(item.line_total_vnd || item.unit_price_vnd * item.quantity)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px 0', fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>
                      Không có thông tin chi tiết các món hàng.
                    </div>
                  )}
                </div>

                {/* Phần tổng kết & Thông tin giao hàng */}
                <div style={{ marginTop: '12px', paddingTop: '14px', borderTop: '1px solid var(--line, #c8b99e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--cafe, #3b352d)', maxWidth: '520px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <MapPin size={13} style={{ color: 'var(--copper, #a5754b)', flexShrink: 0 }} />
                      <span>{order.recipient_name} ({order.phone})</span>
                    </div>
                    <div style={{ color: 'var(--muted, #7c6a57)', fontSize: '11px', marginTop: '2px', paddingLeft: '19px' }}>
                      {order.shipping_address}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>Tổng thanh toán: </span>
                      <strong style={{ fontSize: '16px', color: '#b91c1c' }}>
                        {formatMoney(order.total_vnd)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Nút Hủy đơn nếu còn pending */}
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          className="c2-btn c2-btn-outline"
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#b91c1c', borderColor: '#fca5a5' }}
                          onClick={() => {
                            setCancellingOrder(order);
                            setCancelError(null);
                          }}
                        >
                          <Ban size={14} /> Hủy đơn
                        </button>
                      )}

                      <a
                        href={`#/orders/${order.id}`}
                        className="c2-btn c2-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={14} /> Xem chi tiết
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Phân trang */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="c2-btn c2-btn-outline c2-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Trang trước
                </button>
                <span style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)' }}>
                  Trang <strong>{page}</strong> / {totalPages}
                </span>
                <button
                  type="button"
                  className="c2-btn c2-btn-outline c2-btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Trang kế tiếp
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODAL XÁC NHẬN HỦY ĐƠN HÀNG */}
        {cancellingOrder && (
          <div className="c2-modal-backdrop" onClick={() => !submittingCancel && setCancellingOrder(null)}>
            <div className="c2-modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', marginBottom: '14px' }}>
                <AlertCircle size={24} />
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Xác nhận hủy đơn hàng
                </h3>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--cafe, #3b352d)', lineHeight: '1.6', marginBottom: '16px' }}>
                Bạn có chắc chắn muốn hủy đơn hàng <strong>{cancellingOrder.order_number}</strong>? Yêu cầu hủy đơn sẽ được gửi lên hệ thống xử lý. Thao tác này không thể hoàn tác.
              </p>

              {cancelError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '12px', marginBottom: '16px' }}>
                  {cancelError}
                </div>
              )}

              <div className="c2-form-group" style={{ marginBottom: '16px' }}>
                <label className="c2-label" htmlFor="cancelReasonSelect">Lý do hủy đơn:</label>
                <select
                  id="cancelReasonSelect"
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
                  <label className="c2-label" htmlFor="customReasonInput">Nhập lý do cụ thể:</label>
                  <input
                    id="customReasonInput"
                    type="text"
                    className="c2-input"
                    placeholder="Vui lòng cho Làng Mộc biết lý do của bạn..."
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
                  onClick={() => setCancellingOrder(null)}
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
