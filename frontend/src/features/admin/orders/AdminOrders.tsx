import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, Package } from 'lucide-react';
import { api } from '../../../lib/api';
import { ADMIN_PAGE_SIZE } from '../../../lib/adminContracts';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from '../../../lib/orderStatus';
import type { AdminOrder } from '../../../lib/adminContracts';
import { formatMoney } from '../../../components/catalog/ProductCard';
import { ErrorState, Loading, Pagination } from '../../../components/common/States';
import { getPaymentBadge, getStatusBadge } from '../../../lib/orderStatusView';
import { AdminAccessDenied } from '../AdminLayout';
import { useAdminAccess } from '../useAdminAccess';

function orderUrl(status: string, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  return `#/admin/orders?${params.toString()}`;
}

export default function AdminOrders({ search }: { search: string }) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const rawStatus = params.get('status') || '';
  const status = ORDER_STATUSES.includes(rawStatus as OrderStatus) ? rawStatus as OrderStatus : '';
  const parsedPage = Number(params.get('page') || '1');
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { denied, handle } = useAdminAccess();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.adminOrders({ status: status || undefined, page, limit: ADMIN_PAGE_SIZE });
      setOrders(response.data);
      setTotal(response.meta.total);
    } catch (loadError) {
      setOrders([]);
      setTotal(0);
      setError(handle(loadError));
    } finally {
      setLoading(false);
    }
  }, [handle, page, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (denied) return <AdminAccessDenied />;

  return (
    <main id="main" className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Quản lý đơn hàng</p>
          <h1>Đơn hàng</h1>
          <p>Theo dõi snapshot, người nhận và trạng thái vận đơn.</p>
        </div>
        <span className="admin-count">{total} đơn</span>
      </div>

      <section className="admin-panel" aria-label="Danh sách đơn hàng">
        <div className="admin-toolbar">
          <label htmlFor="admin-order-status">Lọc trạng thái</label>
          <select
            id="admin-order-status"
            value={status}
            onChange={event => { window.location.hash = orderUrl(event.target.value, 1); }}
          >
            <option value="">Tất cả trạng thái</option>
            {ORDER_STATUSES.map(value => (
              <option key={value} value={value}>{ORDER_STATUS_LABELS[value]}</option>
            ))}
          </select>
        </div>

        {loading ? <Loading label="Đang tải đơn hàng…" /> : error ? (
          <ErrorState message={error} retry={() => void reload()} />
        ) : orders.length === 0 ? (
          <div className="admin-empty"><Package size={24} /><p>Không có đơn hàng phù hợp.</p></div>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Người nhận</th><th>Trạng thái</th><th>Tổng</th><th></th></tr></thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td data-label="Mã đơn"><strong>{order.order_number}</strong></td>
                      <td data-label="Ngày đặt">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                      <td data-label="Người nhận"><span>{order.recipient_name}</span><small>{order.phone}</small></td>
                      <td data-label="Trạng thái"><span className="admin-status-pair">{getStatusBadge(order.status)}{order.payment_status && getPaymentBadge(order.payment_status, order.payment_method)}</span></td>
                      <td data-label="Tổng"><strong>{formatMoney(order.total_vnd)}</strong></td>
                      <td data-label="Chi tiết"><a className="admin-link-button" href={`#/admin/orders/${encodeURIComponent(order.id)}?status=${encodeURIComponent(status)}&page=${page}`}><Eye size={15} /> Chi tiết <ArrowRight size={14} /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={total}
              limit={ADMIN_PAGE_SIZE}
              label="Phân trang đơn hàng quản trị"
              onChange={nextPage => { window.location.hash = orderUrl(status, nextPage); }}
            />
          </>
        )}
      </section>
    </main>
  );
}
