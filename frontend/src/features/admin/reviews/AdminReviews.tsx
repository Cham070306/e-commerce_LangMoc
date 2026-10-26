import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Star, CheckCircle, EyeOff, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import type { AdminReview } from '../../../lib/adminContracts';
import { Loading, ErrorState, Pagination } from '../../../components/common/States';
import { AdminAccessDenied } from '../AdminLayout';
import { useAdminAccess } from '../useAdminAccess';

const PAGE_SIZE = 12;

function reviewUrl(status: string, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `#/admin/reviews${qs ? `?${qs}` : ''}`;
}

export default function AdminReviews({ search }: { search: string }) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const status = params.get('status') || '';
  const parsedPage = Number(params.get('page') || '1');
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const writeLock = useRef(false);

  const { denied, handle } = useAdminAccess();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminReviews({
        status: status || undefined,
        page,
        limit: PAGE_SIZE
      });
      setReviews(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setReviews([]);
      setTotal(0);
      setError(handle(err));
    } finally {
      setLoading(false);
    }
  }, [handle, page, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleUpdateStatus = async (review: AdminReview, nextStatus: 'visible' | 'hidden') => {
    if (writeLock.current) return;
    const actionLabel = nextStatus === 'visible' ? 'Phê duyệt hiển thị' : 'Ẩn đánh giá';

    if (!window.confirm(`Xác nhận ${actionLabel.toLowerCase()} này?`)) {
      return;
    }

    writeLock.current = true;
    try {
      await api.updateAdminReview(review.id, { status: nextStatus });
      setSuccessMsg(`Đã cập nhật trạng thái đánh giá thành "${nextStatus === 'visible' ? 'Đã duyệt (visible)' : 'Đã ẩn (hidden)'}".`);
      await reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(handle(err));
    } finally {
      writeLock.current = false;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'inline-flex', gap: '2px', color: '#f59e0b' }} aria-label={`${rating} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={13}
            fill={star <= rating ? '#f59e0b' : 'none'}
            color={star <= rating ? '#f59e0b' : '#d1d5db'}
          />
        ))}
      </div>
    );
  };

  if (denied) return <AdminAccessDenied />;

  return (
    <main id="main" className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Kiểm duyệt nội dung</p>
          <h1>Đánh giá của khách hàng</h1>
          <p>Duyệt hiển thị hoặc ẩn các đánh giá sản phẩm theo quy chế kiểm duyệt sàn Làng Mộc.</p>
        </div>
        <span className="admin-count">{total} đánh giá</span>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="admin-panel" aria-label="Danh sách đánh giá">
        {/* Toolbar lọc */}
        <div className="admin-toolbar">
          <label htmlFor="admin-review-status" style={{ marginRight: '8px', fontSize: '13px' }}>Trạng thái:</label>
          <select
            id="admin-review-status"
            value={status}
            onChange={e => { window.location.hash = reviewUrl(e.target.value, 1); }}
          >
            <option value="">Tất cả đánh giá</option>
            <option value="pending">Chờ duyệt (pending)</option>
            <option value="visible">Đã duyệt hiển thị (visible)</option>
            <option value="hidden">Đã ẩn (hidden)</option>
          </select>
        </div>

        {loading ? (
          <Loading label="Đang tải danh sách đánh giá…" />
        ) : error ? (
          <ErrorState message={error} retry={() => void reload()} />
        ) : reviews.length === 0 ? (
          <div className="admin-empty">
            <Star size={32} />
            <p>Không có đánh giá nào phù hợp.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Sản phẩm</th>
                    <th>Đánh giá</th>
                    <th style={{ minWidth: '220px' }}>Nội dung bình luận</th>
                    <th>Ngày gửi</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(rev => (
                    <tr key={rev.id}>
                      <td data-label="Khách hàng">
                        <strong>{(rev as any).user_name || rev.user_id}</strong>
                      </td>
                      <td data-label="Sản phẩm">
                        <span style={{ fontSize: '12px' }}>{(rev as any).product_name || rev.product_id}</span>
                      </td>
                      <td data-label="Đánh giá">
                        {renderStars(rev.rating)}
                      </td>
                      <td data-label="Nội dung" style={{ lineHeight: '1.5', fontSize: '13px' }}>
                        {/* Văn bản thuần - TUYỆT ĐỐI không dùng dangerouslySetInnerHTML */}
                        <span>{rev.comment}</span>
                      </td>
                      <td data-label="Ngày gửi" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td data-label="Trạng thái">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 500,
                            background: rev.status === 'visible' ? '#ecfdf5' : rev.status === 'hidden' ? '#fef2f2' : '#fffbeb',
                            color: rev.status === 'visible' ? '#065f46' : rev.status === 'hidden' ? '#991b1b' : '#92400e',
                            border: `1px solid ${rev.status === 'visible' ? '#a7f3d0' : rev.status === 'hidden' ? '#fecaca' : '#fde68a'}`
                          }}
                        >
                          {rev.status === 'visible' ? 'Hiển thị' : rev.status === 'hidden' ? 'Đã ẩn' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td data-label="Hành động" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {rev.status !== 'visible' && (
                            <button
                              type="button"
                              className="c2-btn c2-btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px', color: '#065f46', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleUpdateStatus(rev, 'visible')}
                            >
                              <CheckCircle size={13} /> Duyệt
                            </button>
                          )}
                          {rev.status !== 'hidden' && (
                            <button
                              type="button"
                              className="c2-btn c2-btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px', color: '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleUpdateStatus(rev, 'hidden')}
                            >
                              <EyeOff size={13} /> Ẩn
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              total={total}
              limit={PAGE_SIZE}
              label="Phân trang đánh giá quản trị"
              onChange={nextPage => { window.location.hash = reviewUrl(status, nextPage); }}
            />
          </>
        )}
      </section>
    </main>
  );
}
