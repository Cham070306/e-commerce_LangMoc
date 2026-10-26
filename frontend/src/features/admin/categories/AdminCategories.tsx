import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FolderTree, Plus, Edit2, Power, AlertCircle, CheckCircle } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import type { AdminCategory, AdminCategoryWrite } from '../../../lib/adminContracts';
import { Loading, ErrorState } from '../../../components/common/States';
import { slugify } from '../../../lib/slugify';
import { AdminAccessDenied } from '../AdminLayout';
import { useAdminAccess } from '../useAdminAccess';

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const writeLock = useRef(false);

  const { denied, handle } = useAdminAccess();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminCategories();
      setCategories(res.data);
    } catch (err) {
      setCategories([]);
      setError(handle(err));
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormActive(true);
    setFieldErrors({});
    setShowModal(true);
  };

  const openEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormActive(cat.is_active);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      setFormSlug(slugify(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (writeLock.current) return;

    const errors: Record<string, string> = {};
    const trimmedName = formName.trim();
    const trimmedSlug = formSlug.trim();

    if (!trimmedName) errors.name = 'Vui lòng nhập tên danh mục.';
    else if (trimmedName.length > 100) errors.name = 'Tên danh mục không quá 100 ký tự.';

    if (!trimmedSlug) errors.slug = 'Vui lòng nhập đường dẫn (slug).';
    else if (trimmedSlug.length > 120) errors.slug = 'Slug không quá 120 ký tự.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    writeLock.current = true;
    setSubmitting(true);
    setFieldErrors({});

    try {
      if (editingCategory) {
        await api.updateAdminCategory(editingCategory.id, {
          name: trimmedName,
          slug: trimmedSlug,
          is_active: formActive
        });
        setSuccessMsg(`Đã cập nhật danh mục "${trimmedName}".`);
      } else {
        await api.createAdminCategory({
          name: trimmedName,
          slug: trimmedSlug,
          is_active: formActive
        });
        setSuccessMsg(`Đã thêm mới danh mục "${trimmedName}".`);
      }
      setShowModal(false);
      await reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFieldErrors({ slug: 'Slug này đã tồn tại, vui lòng chọn slug khác.' });
        } else if (err.fields) {
          setFieldErrors(err.fields);
        } else {
          setFieldErrors({ form: err.message });
        }
      } else {
        setFieldErrors({ form: 'Có lỗi xảy ra khi lưu danh mục.' });
      }
    } finally {
      writeLock.current = false;
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: AdminCategory) => {
    if (writeLock.current) return;
    const actionText = cat.is_active ? 'Tắt hoạt động' : 'Bật hoạt động';
    if (!window.confirm(`Xác nhận ${actionText} cho danh mục "${cat.name}"?`)) {
      return;
    }

    writeLock.current = true;
    try {
      await api.updateAdminCategory(cat.id, { is_active: !cat.is_active });
      setSuccessMsg(`Đã ${actionText.toLowerCase()} danh mục "${cat.name}".`);
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
          <p className="admin-eyebrow">Quản lý phân loại</p>
          <h1>Danh mục Làng nghề</h1>
          <p>Xem, tạo mới và bật/tắt hiển thị danh mục trên sàn Làng Mộc.</p>
        </div>
        <button
          type="button"
          className="c2-btn c2-btn-primary"
          onClick={openCreateModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="admin-panel" aria-label="Danh sách danh mục">
        {loading ? (
          <Loading label="Đang tải danh mục…" />
        ) : error ? (
          <ErrorState message={error} retry={() => void reload()} />
        ) : categories.length === 0 ? (
          <div className="admin-empty">
            <FolderTree size={32} />
            <p>Chưa có danh mục nào.</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên danh mục</th>
                  <th>Đường dẫn (slug)</th>
                  {categories.some(c => c.product_count !== undefined) && <th>Số sản phẩm</th>}
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td data-label="Tên danh mục">
                      <strong>{cat.name}</strong>
                    </td>
                    <td data-label="Đường dẫn">
                      <code>{cat.slug}</code>
                    </td>
                    {categories.some(c => c.product_count !== undefined) && (
                      <td data-label="Số sản phẩm">
                        <span className="admin-count-badge">{cat.product_count ?? 0}</span>
                      </td>
                    )}
                    <td data-label="Trạng thái">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: cat.is_active ? '#ecfdf5' : '#f3f4f6',
                          color: cat.is_active ? '#065f46' : '#4b5563',
                          border: `1px solid ${cat.is_active ? '#a7f3d0' : '#e5e7eb'}`
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.is_active ? '#10b981' : '#9ca3af' }} />
                        {cat.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                      </span>
                    </td>
                    <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="c2-btn c2-btn-outline"
                          style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => openEditModal(cat)}
                        >
                          <Edit2 size={13} /> Sửa
                        </button>
                        <button
                          type="button"
                          className="c2-btn c2-btn-outline"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: cat.is_active ? '#991b1b' : '#065f46'
                          }}
                          onClick={() => handleToggleActive(cat)}
                        >
                          <Power size={13} /> {cat.is_active ? 'Tắt' : 'Bật'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL THÊM / SỬA DANH MỤC */}
      {showModal && (
        <div className="c2-modal-backdrop" onClick={() => !submitting && setShowModal(false)}>
          <div className="c2-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--brown, #493421)' }}>
              {editingCategory ? `Chỉnh sửa: ${editingCategory.name}` : 'Thêm mới danh mục'}
            </h3>

            {fieldErrors.form && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '12px', marginBottom: '16px' }}>
                {fieldErrors.form}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="c2-form-group" style={{ marginBottom: '14px' }}>
                <label className="c2-label" htmlFor="catNameInput">
                  Tên danh mục <span style={{ color: '#ef4444' }}>*</span> (tối đa 100 ký tự)
                </label>
                <input
                  id="catNameInput"
                  type="text"
                  className="c2-input"
                  placeholder="Ví dụ: Gốm sứ Bát Tràng"
                  value={formName}
                  maxLength={100}
                  onChange={e => handleNameChange(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.name && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.name}</p>
                )}
              </div>

              <div className="c2-form-group" style={{ marginBottom: '14px' }}>
                <label className="c2-label" htmlFor="catSlugInput">
                  Đường dẫn (slug) <span style={{ color: '#ef4444' }}>*</span> (tối đa 120 ký tự)
                </label>
                <input
                  id="catSlugInput"
                  type="text"
                  className="c2-input"
                  placeholder="gom-su-bat-trang"
                  value={formSlug}
                  maxLength={120}
                  onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={submitting}
                />
                {fieldErrors.slug && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.slug}</p>
                )}
                <small style={{ color: 'var(--muted, #7c6a57)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Slug được tự động gợi ý từ tên danh mục. Bạn có thể chỉnh sửa thủ công.
                </small>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="catActiveCheck"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  disabled={submitting}
                />
                <label htmlFor="catActiveCheck" style={{ fontSize: '13px', color: 'var(--cafe, #3b352d)', cursor: 'pointer' }}>
                  Kích hoạt hiển thị ngoài cửa hàng (is_active)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="c2-btn c2-btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="c2-btn c2-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu…' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
