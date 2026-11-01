import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, Plus, Edit2, EyeOff, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import type { AdminProduct, AdminCategory, AdminProductWrite } from '../../../lib/adminContracts';
import { formatMoney } from '../../../components/catalog/ProductCard';
import { Loading, ErrorState, Pagination } from '../../../components/common/States';
import { slugify } from '../../../lib/slugify';
import { AdminAccessDenied } from '../AdminLayout';
import { useAdminAccess } from '../useAdminAccess';

const PAGE_SIZE = 12;

function productUrl(categoryId: string, status: string, page: number): string {
  const params = new URLSearchParams();
  if (categoryId) params.set('category_id', categoryId);
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `#/admin/products${qs ? `?${qs}` : ''}`;
}

export default function AdminProducts({ search }: { search: string }) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const categoryId = params.get('category_id') || '';
  const status = params.get('status') || '';
  const parsedPage = Number(params.get('page') || '1');
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formStock, setFormStock] = useState('10');
  const [formStatus, setFormStatus] = useState<'active' | 'draft' | 'hidden'>('active');
  const [formMaterial, setFormMaterial] = useState('');
  const [formProvince, setFormProvince] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const writeLock = useRef(false);

  const { denied, handle } = useAdminAccess();

  // Load categories for dropdown filter & form
  useEffect(() => {
    api.adminCategories()
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminProducts({
        category_id: categoryId || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE
      });
      setProducts(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setProducts([]);
      setTotal(0);
      setError(handle(err));
    } finally {
      setLoading(false);
    }
  }, [categoryId, handle, page, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSlug('');
    setFormCategory(categories[0]?.id || '');
    setFormDescription('');
    setFormPrice('');
    setFormSalePrice('');
    setFormStock('10');
    setFormStatus('active');
    setFormMaterial('');
    setFormProvince('');
    setFieldErrors({});
    setShowModal(true);
  };

  const openEditModal = (p: AdminProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormCategory(p.category_id);
    setFormDescription(p.description || '');
    setFormPrice(String(p.price_vnd));
    setFormSalePrice(p.sale_price_vnd != null ? String(p.sale_price_vnd) : '');
    setFormStock(String(p.stock_quantity));
    setFormStatus(p.status);
    setFormMaterial(p.material || '');
    setFormProvince(p.origin_province || '');
    setFieldErrors({});
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingProduct) {
      setFormSlug(slugify(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (writeLock.current) return;

    const errors: Record<string, string> = {};
    const trimmedName = formName.trim();
    const trimmedSlug = formSlug.trim();
    const parsedPrice = Math.floor(Number(formPrice));
    const parsedStock = Math.floor(Number(formStock));

    if (!trimmedName) errors.name = 'Vui lòng nhập tên sản phẩm.';
    else if (trimmedName.length > 200) errors.name = 'Tên sản phẩm không quá 200 ký tự.';

    if (!trimmedSlug) errors.slug = 'Vui lòng nhập đường dẫn (slug).';
    else if (trimmedSlug.length > 220) errors.slug = 'Slug không quá 220 ký tự.';

    if (!formCategory) errors.category_id = 'Vui lòng chọn danh mục.';

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.price_vnd = 'Giá gốc phải là số nguyên không âm.';
    }

    let parsedSalePrice: number | null = null;
    if (formSalePrice.trim()) {
      parsedSalePrice = Math.floor(Number(formSalePrice));
      if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
        errors.sale_price_vnd = 'Giá khuyến mãi phải là số nguyên không âm.';
      } else if (!isNaN(parsedPrice) && parsedSalePrice >= parsedPrice) {
        errors.sale_price_vnd = 'Giá khuyến mãi phải nhỏ hơn giá gốc.';
      }
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.stock_quantity = 'Tồn kho phải là số nguyên không âm.';
    }

    if (formMaterial.length > 120) {
      errors.material = 'Chất liệu không quá 120 ký tự.';
    }

    if (formProvince.length > 100) {
      errors.origin_province = 'Tỉnh xuất xứ không quá 100 ký tự.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    writeLock.current = true;
    setSubmitting(true);
    setFieldErrors({});

    const payload: AdminProductWrite = {
      category_id: formCategory,
      name: trimmedName,
      slug: trimmedSlug,
      description: formDescription.trim(),
      material: formMaterial.trim() || null,
      origin_province: formProvince.trim() || null,
      price_vnd: parsedPrice,
      sale_price_vnd: parsedSalePrice,
      sale_starts_at: null,
      sale_ends_at: null,
      stock_quantity: parsedStock,
      status: formStatus
    };

    try {
      if (editingProduct) {
        await api.updateAdminProduct(editingProduct.id, payload);
        setSuccessMsg(`Đã cập nhật sản phẩm "${trimmedName}".`);
      } else {
        await api.createAdminProduct(payload);
        setSuccessMsg(`Đã thêm mới sản phẩm "${trimmedName}".`);
      }
      setShowModal(false);
      await reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFieldErrors({ slug: 'Slug này đã tồn tại, vui lòng đổi slug khác.' });
        } else if (err.fields) {
          setFieldErrors(err.fields);
        } else {
          setFieldErrors({ form: err.message });
        }
      } else {
        setFieldErrors({ form: 'Có lỗi xảy ra khi lưu sản phẩm.' });
      }
    } finally {
      writeLock.current = false;
      setSubmitting(false);
    }
  };

  const handleToggleHide = async (p: AdminProduct) => {
    if (writeLock.current) return;
    const isHidden = p.status === 'hidden';
    const nextStatus = isHidden ? 'active' : 'hidden';
    const actionText = isHidden ? 'Hiện sản phẩm' : 'Ẩn sản phẩm';

    if (!window.confirm(`Xác nhận ${actionText} "${p.name}"?`)) {
      return;
    }

    writeLock.current = true;
    try {
      await api.updateAdminProduct(p.id, { status: nextStatus });
      setSuccessMsg(`Đã ${actionText.toLowerCase()} "${p.name}".`);
      await reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(handle(err));
    } finally {
      writeLock.current = false;
    }
  };

  const getCategoryName = (catId: string) => {
    const c = categories.find(cat => cat.id === catId);
    return c ? c.name : catId;
  };

  if (denied) return <AdminAccessDenied />;

  return (
    <main id="main" className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Quản lý kho hàng</p>
          <h1>Sản phẩm & Tồn kho</h1>
          <p>Quản lý giá bán, số lượng tồn kho và trạng thái hiển thị của sản phẩm thủ công.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="admin-count">{total} sản phẩm</span>
          <button
            type="button"
            className="c2-btn c2-btn-primary"
            onClick={openCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Thêm sản phẩm
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="admin-panel" aria-label="Danh sách sản phẩm">
        {/* Toolbar lọc */}
        <div className="admin-toolbar" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label htmlFor="admin-cat-filter" style={{ marginRight: '6px', fontSize: '13px' }}>Danh mục:</label>
            <select
              id="admin-cat-filter"
              value={categoryId}
              onChange={e => { window.location.hash = productUrl(e.target.value, status, 1); }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin-status-filter" style={{ marginRight: '6px', fontSize: '13px' }}>Trạng thái:</label>
            <select
              id="admin-status-filter"
              value={status}
              onChange={e => { window.location.hash = productUrl(categoryId, e.target.value, 1); }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bán (active)</option>
              <option value="hidden">Đang ẩn (hidden)</option>
              <option value="draft">Bản nháp (draft)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Loading label="Đang tải danh sách sản phẩm…" />
        ) : error ? (
          <ErrorState message={error} retry={() => void reload()} />
        ) : products.length === 0 ? (
          <div className="admin-empty">
            <Package size={32} />
            <p>Không có sản phẩm nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá gốc</th>
                    <th>Giá KM</th>
                    <th>Tồn kho</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td data-label="Tên sản phẩm">
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)' }}>
                          <code>{p.slug}</code>
                        </div>
                      </td>
                      <td data-label="Danh mục">
                        <span style={{ fontSize: '12px' }}>{getCategoryName(p.category_id)}</span>
                      </td>
                      <td data-label="Giá gốc">
                        <span>{formatMoney(p.price_vnd)}</span>
                      </td>
                      <td data-label="Giá KM">
                        {p.sale_price_vnd != null ? (
                          <strong style={{ color: '#b91c1c' }}>{formatMoney(p.sale_price_vnd)}</strong>
                        ) : (
                          <span style={{ color: 'var(--muted, #7c6a57)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td data-label="Tồn kho">
                        <span
                          style={{
                            fontWeight: 600,
                            color: p.stock_quantity === 0 ? '#dc2626' : p.stock_quantity < 5 ? '#d97706' : 'inherit'
                          }}
                        >
                          {p.stock_quantity}
                        </span>
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
                            background: p.status === 'active' ? '#ecfdf5' : p.status === 'hidden' ? '#fef2f2' : '#f3f4f6',
                            color: p.status === 'active' ? '#065f46' : p.status === 'hidden' ? '#991b1b' : '#374151',
                            border: `1px solid ${p.status === 'active' ? '#a7f3d0' : p.status === 'hidden' ? '#fecaca' : '#e5e7eb'}`
                          }}
                        >
                          {p.status === 'active' ? 'Đang bán' : p.status === 'hidden' ? 'Đang ẩn' : 'Bản nháp'}
                        </span>
                      </td>
                      <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="c2-btn c2-btn-outline"
                            style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => openEditModal(p)}
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
                              color: p.status === 'hidden' ? '#065f46' : '#991b1b'
                            }}
                            onClick={() => handleToggleHide(p)}
                            title={p.status === 'hidden' ? 'Hiện sản phẩm' : 'Ẩn sản phẩm'}
                          >
                            {p.status === 'hidden' ? <Eye size={13} /> : <EyeOff size={13} />}
                            {p.status === 'hidden' ? 'Hiện' : 'Ẩn'}
                          </button>
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
              label="Phân trang danh sách sản phẩm quản trị"
              onChange={nextPage => { window.location.hash = productUrl(categoryId, status, nextPage); }}
            />
          </>
        )}
      </section>

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      {showModal && (
        <div className="c2-modal-backdrop" onClick={() => !submitting && setShowModal(false)}>
          <div className="c2-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--brown, #493421)' }}>
              {editingProduct ? `Chỉnh sửa: ${editingProduct.name}` : 'Thêm mới sản phẩm thủ công'}
            </h3>

            {fieldErrors.form && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '12px', marginBottom: '16px' }}>
                {fieldErrors.form}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="c2-form-group" style={{ marginBottom: '12px' }}>
                <label className="c2-label" htmlFor="prodNameInput">
                  Tên sản phẩm <span style={{ color: '#ef4444' }}>*</span> (tối đa 200 ký tự)
                </label>
                <input
                  id="prodNameInput"
                  type="text"
                  className="c2-input"
                  placeholder="Ví dụ: Bát đĩa men rạn cổ Bát Tràng"
                  value={formName}
                  maxLength={200}
                  onChange={e => handleNameChange(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.name && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.name}</p>
                )}
              </div>

              <div className="c2-form-group" style={{ marginBottom: '12px' }}>
                <label className="c2-label" htmlFor="prodSlugInput">
                  Đường dẫn (slug) <span style={{ color: '#ef4444' }}>*</span> (tối đa 220 ký tự)
                </label>
                <input
                  id="prodSlugInput"
                  type="text"
                  className="c2-input"
                  placeholder="bat-dia-men-ran-co"
                  value={formSlug}
                  maxLength={220}
                  onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={submitting}
                />
                {fieldErrors.slug && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.slug}</p>
                )}
              </div>

              <div className="c2-form-group" style={{ marginBottom: '12px' }}>
                <label className="c2-label" htmlFor="prodCategorySelect">
                  Danh mục làng nghề <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="prodCategorySelect"
                  className="c2-input"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {fieldErrors.category_id && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.category_id}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="c2-form-group">
                  <label className="c2-label" htmlFor="prodPriceInput">
                    Giá gốc (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="prodPriceInput"
                    type="number"
                    min="0"
                    step="1000"
                    className="c2-input"
                    placeholder="350000"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    disabled={submitting}
                  />
                  {fieldErrors.price_vnd && (
                    <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.price_vnd}</p>
                  )}
                </div>

                <div className="c2-form-group">
                  <label className="c2-label" htmlFor="prodSalePriceInput">
                    Giá khuyến mãi (VNĐ)
                  </label>
                  <input
                    id="prodSalePriceInput"
                    type="number"
                    min="0"
                    step="1000"
                    className="c2-input"
                    placeholder="Bỏ trống nếu không giảm"
                    value={formSalePrice}
                    onChange={e => setFormSalePrice(e.target.value)}
                    disabled={submitting}
                  />
                  {fieldErrors.sale_price_vnd && (
                    <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.sale_price_vnd}</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="c2-form-group">
                  <label className="c2-label" htmlFor="prodStockInput">
                    Số lượng tồn kho <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="prodStockInput"
                    type="number"
                    min="0"
                    step="1"
                    className="c2-input"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    disabled={submitting}
                  />
                  {fieldErrors.stock_quantity && (
                    <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>{fieldErrors.stock_quantity}</p>
                  )}
                </div>

                <div className="c2-form-group">
                  <label className="c2-label" htmlFor="prodStatusSelect">
                    Trạng thái hiển thị
                  </label>
                  <select
                    id="prodStatusSelect"
                    className="c2-input"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    disabled={submitting}
                  >
                    <option value="active">Đang bán (active)</option>
                    <option value="hidden">Đang ẩn (hidden)</option>
                    <option value="draft">Bản nháp (draft)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="c2-form-group">
                  <label className="c2-label" htmlFor="prodMaterialInput">
                    Chất liệu (tối đa 120 ký tự)
                  </label>
                  <input
                    id="prodMaterialInput"
                    type="text"
                    className="c2-input"
                    placeholder="Gốm đất sét nung, men rạn"
                    value={formMaterial}
                    maxLength={120}
                    onChange={e => setFormMaterial(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="c2-form-group">
                  <label className="c2-label" htmlFor="prodProvinceInput">
                    Làng nghề / Tỉnh xuất xứ
                  </label>
                  <input
                    id="prodProvinceInput"
                    type="text"
                    className="c2-input"
                    placeholder="Hà Nội / Bát Tràng"
                    value={formProvince}
                    maxLength={100}
                    onChange={e => setFormProvince(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="c2-form-group" style={{ marginBottom: '16px' }}>
                <label className="c2-label" htmlFor="prodDescInput">Mô tả sản phẩm</label>
                <textarea
                  id="prodDescInput"
                  className="c2-input"
                  rows={3}
                  placeholder="Mô tả nét thủ công, cách chế tác và câu chuyện làng nghề..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <p style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)', margin: '0 0 16px', background: '#f5efe6', padding: '8px 12px', borderRadius: '4px' }}>
                * Lưu ý: Theo hợp đồng API, ảnh sản phẩm được lưu ở bảng riêng qua API upload của hệ thống. Không hỗ trợ nhập URL tùy ý từ giao diện.
              </p>

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
                  {submitting ? 'Đang lưu…' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
