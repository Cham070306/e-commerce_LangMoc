import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, MapPin, Package, Truck } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { ORDER_STATUS_LABELS, getNextValidStatuses, isValidTransition } from '../../../lib/orderStatus';
import type { AdminOrder, AdminShipmentPayload } from '../../../lib/adminContracts';
import { formatMoney } from '../../../components/catalog/ProductCard';
import { ErrorState, Loading } from '../../../components/common/States';
import { getPaymentBadge, getStatusBadge } from '../../../lib/orderStatusView';
import { AdminAccessDenied } from '../AdminLayout';
import { useAdminAccess } from '../useAdminAccess';

function adminOrdersHref(search: string): string {
  return `#/admin/orders${search ? `?${search}` : ''}`;
}

export default function AdminOrderDetail({ id, search }: { id: string; search: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [editingShipmentOnly, setEditingShipmentOnly] = useState(false);
  const writeLock = useRef(false);
  const { denied, handle } = useAdminAccess();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.adminOrder(id);
      setOrder(response.data);
      setCarrier(response.data.shipment?.carrier || '');
      setTrackingNumber(response.data.shipment?.tracking_number || '');
    } catch (loadError) {
      setOrder(null);
      setError(handle(loadError));
    } finally {
      setLoading(false);
    }
  }, [handle, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateStatus = async (nextStatus: string, shipment?: AdminShipmentPayload) => {
    if (!order || writeLock.current || !isValidTransition(order.status, nextStatus)) return;
    writeLock.current = true;
    setSaving(true);
    setError(null);
    let shipmentSaved = false;
    try {
      if (nextStatus === 'shipping') {
        if (!shipment) return;
        await api.updateAdminShipment(order.id, shipment);
        shipmentSaved = true;
      }
      await api.updateAdminOrderStatus(order.id, { status: nextStatus as typeof order.status });
      setTargetStatus(null);
      await reload();
    } catch (writeError) {
      setTargetStatus(null);
      if (!(writeError instanceof ApiError && (writeError.status === 401 || writeError.status === 403))) {
        await reload();
      }
      const message = handle(writeError);
      if (writeError instanceof ApiError && writeError.status === 409) {
        setError(shipmentSaved
          ? `${message} Vận đơn đã lưu nhưng trạng thái chưa chuyển; đơn đã được tải lại từ máy chủ.`
          : `${message} Đã tải lại đơn từ máy chủ để lấy trạng thái mới nhất.`);
      } else if (shipmentSaved && writeError instanceof ApiError && (writeError.status === 401 || writeError.status === 403)) {
        setError(`${message} Vận đơn đã được lưu nhưng trạng thái chưa chuyển; cần xác thực lại để kiểm tra dữ liệu mới nhất.`);
      } else if (shipmentSaved) {
        setError(`${message} Vận đơn đã được lưu, trạng thái chưa chuyển sang vận chuyển; dữ liệu đã được tải lại từ máy chủ.`);
      } else {
        setError(message);
      }
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };

  const requestStatusChange = (nextStatus: string) => {
    if (!order || !isValidTransition(order.status, nextStatus) || nextStatus === 'cancelled') return;
    setError(null);
    if (nextStatus === 'shipping') {
      setCarrier(order.shipment?.carrier || '');
      setTrackingNumber(order.shipment?.tracking_number || '');
      setFieldError(null);
      setTargetStatus(nextStatus);
      return;
    }
    const label = ORDER_STATUS_LABELS[nextStatus as keyof typeof ORDER_STATUS_LABELS];
    if (window.confirm(`Xác nhận chuyển đơn ${order.order_number} sang "${label}"?`)) {
      void updateStatus(nextStatus);
    }
  };

  const confirmShipping = (event: FormEvent) => {
    event.preventDefault();
    if (carrier.trim().length > 80 || !carrier.trim() || trackingNumber.trim().length > 100 || !trackingNumber.trim()) {
      setFieldError('Nhập đơn vị vận chuyển (tối đa 80 ký tự) và mã vận đơn (tối đa 100 ký tự).');
      return;
    }
    if (!window.confirm(`Lưu vận đơn trước, sau đó chuyển đơn ${order?.order_number} sang đang vận chuyển?`)) return;
    void updateStatus('shipping', { carrier: carrier.trim(), tracking_number: trackingNumber.trim() });
  };

  const confirmSaveShipmentOnly = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedCarrier = carrier.trim();
    const trimmedTracking = trackingNumber.trim();
    if (!trimmedCarrier || trimmedCarrier.length > 80 || !trimmedTracking || trimmedTracking.length > 100) {
      setFieldError('Nhập đơn vị vận chuyển (tối đa 80 ký tự) và mã vận đơn (tối đa 100 ký tự).');
      return;
    }
    if (!order || writeLock.current) return;
    writeLock.current = true;
    setSaving(true);
    setFieldError(null);
    setError(null);
    try {
      await api.updateAdminShipment(order.id, { carrier: trimmedCarrier, tracking_number: trimmedTracking });
      setEditingShipmentOnly(false);
      await reload();
    } catch (err) {
      setError(handle(err));
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };

  if (denied) return <AdminAccessDenied />;
  if (loading) return <main className="admin-content"><Loading label="Đang tải chi tiết đơn hàng…" /></main>;
  if (error && !order) {
    return <main className="admin-content"><ErrorState message={error} retry={() => void reload()} /></main>;
  }
  if (!order) return <main className="admin-content"><ErrorState message="Không tìm thấy đơn hàng." retry={() => void reload()} /></main>;

  const nextStatuses = getNextValidStatuses(order.status).filter(status => status !== 'cancelled');

  return (
    <main id="main" className="admin-content">
      <a className="admin-back-link" href={adminOrdersHref(search)}><ArrowLeft size={16} /> Quay lại danh sách</a>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Chi tiết đơn hàng</p>
          <h1>{order.order_number}</h1>
          <p>Đặt lúc {new Date(order.created_at).toLocaleString('vi-VN')}</p>
        </div>
        <div className="admin-status-pair">
          {getStatusBadge(order.status)}
          {order.payment_status && getPaymentBadge(order.payment_status, order.payment_method)}
        </div>
      </div>

      {error && <div className="admin-alert" role="alert">{error}</div>}

      <div className="admin-detail-grid">
        <section className="admin-panel">
          <h2><Package size={18} /> Sản phẩm trong đơn (snapshot)</h2>
          <div className="admin-snapshot-list">
            {order.items.map(item => (
              <article className="admin-snapshot-item" key={item.id || item.product_id}>
                {item.product_image_url && <img src={item.product_image_url} alt="" />}
                <div><strong>{item.product_name}</strong><small>{formatMoney(item.unit_price_vnd)} × {item.quantity}</small></div>
                <strong>{formatMoney(item.line_total_vnd)}</strong>
              </article>
            ))}
          </div>
          <dl className="admin-total-list">
            <div><dt>Tạm tính</dt><dd>{formatMoney(order.subtotal_vnd)}</dd></div>
            <div><dt>Giảm giá</dt><dd>{formatMoney(order.discount_vnd)}</dd></div>
            <div><dt>Phí vận chuyển</dt><dd>{formatMoney(order.shipping_fee_vnd)}</dd></div>
            <div className="admin-grand-total"><dt>Tổng</dt><dd>{formatMoney(order.total_vnd)}</dd></div>
          </dl>
        </section>

        <div className="admin-detail-stack">
          <section className="admin-panel">
            <h2><MapPin size={18} /> Thông tin nhận hàng</h2>
            <dl className="admin-recipient">
              <div><dt>Người nhận</dt><dd>{order.recipient_name}</dd></div>
              <div><dt>Điện thoại</dt><dd>{order.phone}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{order.shipping_address}</dd></div>
              {order.note && <div><dt>Ghi chú</dt><dd>{order.note}</dd></div>}
            </dl>
          </section>

          <section className="admin-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}><Truck size={18} /> Vận đơn</h2>
              <button
                type="button"
                className="c2-btn c2-btn-outline"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => {
                  setCarrier(order.shipment?.carrier || '');
                  setTrackingNumber(order.shipment?.tracking_number || '');
                  setFieldError(null);
                  setEditingShipmentOnly(true);
                }}
              >
                {order.shipment ? 'Sửa thông tin vận đơn' : 'Thêm thông tin vận đơn'}
              </button>
            </div>
            {order.shipment ? (
              <dl className="admin-recipient">
                <div><dt>Đơn vị vận chuyển</dt><dd>{order.shipment.carrier || 'Chưa có'}</dd></div>
                <div><dt>Mã vận đơn</dt><dd>{order.shipment.tracking_number || 'Chưa có'}</dd></div>
                {order.shipment.shipped_at && <div><dt>Đã gửi lúc</dt><dd>{new Date(order.shipment.shipped_at).toLocaleString('vi-VN')}</dd></div>}
              </dl>
            ) : <p className="admin-muted">Chưa có thông tin vận đơn.</p>}
          </section>
        </div>
      </div>

      <section className="admin-panel admin-actions-panel">
        <h2>Cập nhật trạng thái</h2>
        <div className="admin-action-list">
          {nextStatuses.length ? nextStatuses.map(next => (
            <button className="admin-primary-button" key={next} type="button" disabled={saving} onClick={() => requestStatusChange(next)}>
              {saving ? <span className="spinner" aria-hidden="true" /> : null}
              {saving ? 'Đang lưu…' : `Chuyển sang: ${ORDER_STATUS_LABELS[next]}`}
            </button>
          )) : <p className="admin-muted">Không có bước chuyển tiếp hợp lệ.</p>}
        </div>
        {order.status === 'pending' && <p className="admin-muted">Hủy đơn từ khu vực quản trị chưa được bật.</p>}
      </section>

      {targetStatus === 'shipping' && (
        <div className="admin-dialog-backdrop" role="presentation">
          <form className="admin-dialog" onSubmit={confirmShipping} aria-labelledby="admin-shipping-title">
            <h2 id="admin-shipping-title">Thông tin vận đơn</h2>
            <p>Vận đơn được lưu trước khi gửi yêu cầu chuyển trạng thái.</p>
            <label>Đơn vị vận chuyển
              <input value={carrier} maxLength={80} onChange={event => setCarrier(event.target.value)} required />
            </label>
            <label>Mã vận đơn
              <input value={trackingNumber} maxLength={100} onChange={event => setTrackingNumber(event.target.value)} required />
            </label>
            {fieldError && <p className="admin-alert" role="alert">{fieldError}</p>}
            <div className="admin-dialog-actions">
              <button type="button" disabled={saving} onClick={() => setTargetStatus(null)}>Đóng</button>
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? <><span className="spinner" aria-hidden="true" /> Đang lưu…</> : 'Lưu vận đơn và chuyển trạng thái'}</button>
            </div>
          </form>
        </div>
      )}

      {editingShipmentOnly && (
        <div className="admin-dialog-backdrop" role="presentation">
          <form className="admin-dialog" onSubmit={confirmSaveShipmentOnly} aria-labelledby="admin-shipment-only-title">
            <h2 id="admin-shipment-only-title">Cập nhật thông tin vận đơn</h2>
            <p>Chỉ lưu thông tin nhà xe / mã vận đơn mà không thay đổi trạng thái đơn hàng.</p>
            <label>Đơn vị vận chuyển
              <input value={carrier} maxLength={80} onChange={event => setCarrier(event.target.value)} required />
            </label>
            <label>Mã vận đơn
              <input value={trackingNumber} maxLength={100} onChange={event => setTrackingNumber(event.target.value)} required />
            </label>
            {fieldError && <p className="admin-alert" role="alert">{fieldError}</p>}
            <div className="admin-dialog-actions">
              <button type="button" disabled={saving} onClick={() => setEditingShipmentOnly(false)}>Đóng</button>
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? <><span className="spinner" aria-hidden="true" /> Đang lưu…</> : 'Lưu vận đơn'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
