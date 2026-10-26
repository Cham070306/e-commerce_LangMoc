import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mail, CheckCircle, Check, BookOpen, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import type { AdminContactMessage } from '../../../lib/adminContracts';
import { Loading, ErrorState, Pagination } from '../../../components/common/States';
import { AdminAccessDenied } from '../AdminLayout';
import { useAdminAccess } from '../useAdminAccess';

const PAGE_SIZE = 12;

function contactUrl(status: string, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `#/admin/contact${qs ? `?${qs}` : ''}`;
}

export default function AdminContact({ search }: { search: string }) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const status = params.get('status') || '';
  const parsedPage = Number(params.get('page') || '1');
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
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
      const res = await api.adminContact({
        status: status || undefined,
        page,
        limit: PAGE_SIZE
      });
      setMessages(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setMessages([]);
      setTotal(0);
      setError(handle(err));
    } finally {
      setLoading(false);
    }
  }, [handle, page, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleUpdateStatus = async (msg: AdminContactMessage, nextStatus: 'read' | 'resolved') => {
    if (writeLock.current) return;
    const actionLabel = nextStatus === 'resolved' ? 'Đánh dấu đã giải quyết' : 'Đánh dấu đã đọc';

    writeLock.current = true;
    try {
      await api.updateAdminContact(msg.id, { status: nextStatus });
      setSuccessMsg(`Đã cập nhật trạng thái tin nhắn thành "${nextStatus === 'resolved' ? 'Đã xử lý (resolved)' : 'Đã xem (read)'}".`);
      await reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(handle(err));
    } finally {
      writeLock.current = false;
    }
  };

  if (denied) return <AdminAccessDenied />;

  return (
    <main id="main" className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Hỗ trợ khách hàng</p>
          <h1>Hộp thư Liên hệ & Feedback</h1>
          <p>Xem và xử lý các câu hỏi, góp ý và yêu cầu hợp tác từ form liên hệ.</p>
        </div>
        <span className="admin-count">{total} tin nhắn</span>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="admin-panel" aria-label="Danh sách phản hồi liên hệ">
        {/* Toolbar lọc */}
        <div className="admin-toolbar">
          <label htmlFor="admin-contact-status" style={{ marginRight: '8px', fontSize: '13px' }}>Trạng thái:</label>
          <select
            id="admin-contact-status"
            value={status}
            onChange={e => { window.location.hash = contactUrl(e.target.value, 1); }}
          >
            <option value="">Tất cả tin nhắn</option>
            <option value="new">Mới gửi (new)</option>
            <option value="read">Đã xem (read)</option>
            <option value="resolved">Đã xử lý (resolved)</option>
          </select>
        </div>

        {loading ? (
          <Loading label="Đang tải danh sách liên hệ…" />
        ) : error ? (
          <ErrorState message={error} retry={() => void reload()} />
        ) : messages.length === 0 ? (
          <div className="admin-empty">
            <Mail size={32} />
            <p>Hộp thư hiện đang trống.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người gửi</th>
                    <th>Chủ đề</th>
                    <th style={{ minWidth: '240px' }}>Nội dung tin nhắn</th>
                    <th>Ngày gửi</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(msg => (
                    <tr key={msg.id}>
                      <td data-label="Người gửi">
                        <strong>{msg.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)' }}>
                          {msg.email}
                        </div>
                      </td>
                      <td data-label="Chủ đề">
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{msg.subject}</span>
                      </td>
                      <td data-label="Nội dung" style={{ lineHeight: '1.5', fontSize: '13px' }}>
                        {/* Văn bản thuần - TUYỆT ĐỐI không dùng dangerouslySetInnerHTML */}
                        <span>{msg.message}</span>
                      </td>
                      <td data-label="Ngày gửi" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {new Date(msg.created_at).toLocaleDateString('vi-VN')}
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
                            background: msg.status === 'resolved' ? '#ecfdf5' : msg.status === 'read' ? '#f3f4f6' : '#eff6ff',
                            color: msg.status === 'resolved' ? '#065f46' : msg.status === 'read' ? '#4b5563' : '#1e40af',
                            border: `1px solid ${msg.status === 'resolved' ? '#a7f3d0' : msg.status === 'read' ? '#e5e7eb' : '#bfdbfe'}`
                          }}
                        >
                          {msg.status === 'resolved' ? 'Đã xử lý' : msg.status === 'read' ? 'Đã xem' : 'Mới gửi'}
                        </span>
                      </td>
                      <td data-label="Hành động" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {msg.status === 'new' && (
                            <button
                              type="button"
                              className="c2-btn c2-btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleUpdateStatus(msg, 'read')}
                            >
                              <BookOpen size={13} /> Đã xem
                            </button>
                          )}
                          {msg.status !== 'resolved' && (
                            <button
                              type="button"
                              className="c2-btn c2-btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px', color: '#065f46', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleUpdateStatus(msg, 'resolved')}
                            >
                              <Check size={13} /> Đã xử lý
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
              label="Phân trang danh sách tin nhắn quản trị"
              onChange={nextPage => { window.location.hash = contactUrl(status, nextPage); }}
            />
          </>
        )}
      </section>
    </main>
  );
}
