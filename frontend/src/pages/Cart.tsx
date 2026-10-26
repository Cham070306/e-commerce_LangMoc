import React, { useState } from 'react';
import { useCart } from '../features/cart/CartContext';
import { useAuth } from '../features/auth/AuthContext';
import { formatMoney, ProductImage } from '../components/catalog/ProductCard';
import { Loading } from '../components/common/States';
import { ShoppingBag, Trash2, ArrowRight, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isMockMode } from '../config/site';

export default function CartPage() {
  const { user } = useAuth();
  const {
    items,
    subtotal,
    preview,
    appliedPromo,
    loading,
    rowLoading,
    error,
    clearError,
    updateQuantity,
    removeFromCart,
    applyPromotion,
    removePromotion
  } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoSubmitting(true);
    await applyPromotion(promoInput);
    setPromoSubmitting(false);
  };

  if (loading) {
    return (
      <main id="main" className="c2-page-wrap">
        <Loading label="Đang cập nhật giỏ hàng…" />
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main" className="c2-page-wrap">
        <div className="c2-main-container">
          <div className="c2-card" style={{ textAlign: 'center', padding: '64px 24px', maxWidth: '560px', margin: '40px auto' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(73,52,33,0.06)', display: 'grid', placeItems: 'center', margin: '0 auto 20px', color: 'var(--brown, #493421)' }}>
              <ShoppingBag size={34} />
            </div>
            <h1 className="c2-title" style={{ fontSize: '24px', marginBottom: '10px' }}>Yêu cầu đăng nhập</h1>
            <p className="c2-subtitle" style={{ margin: '0 auto 28px', lineHeight: 1.8 }}>
              Quý khách vui lòng đăng nhập tài khoản <strong>Làng Mộc</strong> để thêm sản phẩm vào giỏ hàng, đồng bộ dữ liệu và tiến hành quản lý đơn hàng.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="#/login?redirect=/cart" className="c2-btn c2-btn-primary">
                Đăng nhập ngay <ArrowRight size={16} />
              </a>
              <a href="#/register?redirect=/cart" className="c2-btn c2-btn-outline">
                Đăng ký tài khoản
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Tiêu đề & Thông báo Mock */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="c2-title" style={{ margin: 0 }}>Giỏ hàng của bạn</h1>
            <p className="c2-subtitle" style={{ margin: '4px 0 0' }}>
              {items.length > 0 ? `Bạn đang có ${items.reduce((s, i) => s + i.quantity, 0)} món đồ thủ công trong giỏ` : 'Giỏ hàng đang trống'}
            </p>
          </div>
          {isMockMode && (
            <span className="c2-mock-badge">⚙️ CHẾ ĐỘ MÔ PHỎNG (MOCK API)</span>
          )}
        </div>

        {/* Thông báo lỗi (như hết hàng / vượt tồn kho) */}
        {error && (
          <div className="c2-alert c2-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>{error}</div>
            <button
              type="button"
              onClick={clearError}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {items.length === 0 ? (
          /* TRẠNG THÁI GIỎ HÀNG TRỐNG */
          <div className="c2-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(73,52,33,0.06)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: 'var(--brown, #493421)' }}>
              <ShoppingBag size={32} />
            </div>
            <h2 className="c2-title" style={{ fontSize: '24px', marginBottom: '8px' }}>Giỏ hàng của bạn đang trống</h2>
            <p className="c2-subtitle" style={{ maxWidth: '420px', margin: '0 auto 24px' }}>
              Hãy dạo quanh các bộ sưu tập gốm sứ, mây tre đan và lụa thổ cẩm của Làng Mộc để chọn cho mình những món đồ ưng ý.
            </p>
            <a href="#/catalog" className="c2-btn c2-btn-primary">
              Khám phá sản phẩm ngay <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          /* DANH SÁCH SẢN PHẨM & TÓM TẮT ĐƠN HÀNG */
          <div className="c2-cart-grid">
            {/* CỘT TRÁI: DANH SÁCH MÓN HÀNG */}
            <div className="c2-cart-items-col">
              <div className="c2-card" style={{ padding: '24px' }}>
                <div className="c2-cart-items-list">
                  {items.map(item => {
                    const isRowBusy = !!rowLoading[item.id];
                    return (
                      <article key={item.id} className="c2-cart-item-row">
                        {/* Ảnh sản phẩm */}
                        <div className="c2-cart-item-img">
                          <ProductImage src={item.image} alt={item.name} />
                        </div>

                        {/* Thông tin chi tiết */}
                        <div className="c2-cart-item-info">
                          {item.origin && (
                            <span className="c2-cart-item-origin">📍 {item.origin}</span>
                          )}
                          <h3 className="c2-cart-item-name">
                            <a href={`#/product/${item.slug}`}>{item.name}</a>
                          </h3>
                          <div className="c2-cart-item-price">
                            <strong>{item.price === null ? 'Liên hệ' : formatMoney(item.price)}</strong>
                            {item.price_is_demo && (
                              <small className="c2-cart-demo-note">Giá demo</small>
                            )}
                          </div>

                          {/* Stepper số lượng & Nút Xóa */}
                          <div className="c2-cart-item-controls">
                            <div className="c2-stepper" aria-label="Điều chỉnh số lượng">
                              <button
                                type="button"
                                className="c2-stepper-btn"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={isRowBusy || item.quantity <= 1}
                                aria-label="Giảm 1 sản phẩm"
                              >
                                −
                              </button>
                              <span className="c2-stepper-value">
                                {isRowBusy ? '…' : item.quantity}
                              </span>
                              <button
                                type="button"
                                className="c2-stepper-btn"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={isRowBusy || item.quantity >= item.stock_quantity}
                                aria-label="Tăng 1 sản phẩm"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              className="c2-cart-remove-btn"
                              onClick={() => removeFromCart(item.id)}
                              disabled={isRowBusy}
                              aria-label={`Xóa ${item.name} khỏi giỏ`}
                            >
                              <Trash2 size={15} />
                              <span>Xóa</span>
                            </button>
                          </div>

                          {/* Cảnh báo số lượng chạm ngưỡng tồn kho */}
                          {item.quantity >= item.stock_quantity && (
                            <p className="c2-cart-stock-warning">
                              ⚠️ Đã đạt số lượng tồn kho tối đa ({item.stock_quantity} món)
                            </p>
                          )}
                        </div>

                        {/* Thành tiền dòng */}
                        <div className="c2-cart-item-line-total">
                          {item.price === null ? '—' : formatMoney(item.price * item.quantity)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: BẢNG TỔNG KẾT & PREVIEW GIÁ */}
            <div className="c2-cart-summary-col">
              <div className="c2-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', margin: '0 0 16px', color: 'var(--brown, #493421)' }}>
                  Tóm tắt đơn hàng
                </h2>

                {/* Ô NHẬP MÃ GIẢM GIÁ (Chỉ dùng khi đã đăng nhập) */}
                {user ? (
                  <div style={{ marginBottom: '20px' }}>
                    <form onSubmit={handleApplyPromo} className="c2-promo-form">
                      <div className="c2-promo-input-wrap">
                        <Tag size={16} className="c2-promo-icon" />
                        <input
                          type="text"
                          className="c2-input c2-promo-input"
                          value={promoInput}
                          onChange={e => setPromoInput(e.target.value)}
                          placeholder="Mã giảm giá (LANGMOC10)"
                          disabled={promoSubmitting || !!appliedPromo}
                        />
                      </div>
                      {appliedPromo ? (
                        <button
                          type="button"
                          className="c2-btn c2-btn-outline c2-btn-sm"
                          onClick={() => { removePromotion(); setPromoInput(''); }}
                        >
                          Hủy mã
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="c2-btn c2-btn-primary c2-btn-sm"
                          disabled={promoSubmitting || !promoInput.trim()}
                        >
                          {promoSubmitting ? '…' : 'Áp dụng'}
                        </button>
                      )}
                    </form>

                    {preview?.promotion_valid && appliedPromo && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#1e5922', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} />
                        <span>{preview.promotion_message || `Đã áp dụng mã ${appliedPromo}`}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#f4efe6', borderRadius: '4px', fontSize: '12px', color: 'var(--muted, #7c6a57)', lineHeight: '1.5' }}>
                    ℹ️ <strong>Đăng nhập</strong> để nhập mã giảm giá và tính phí vận chuyển chính xác từ server.
                  </div>
                )}

                {/* BẢNG CHI TIẾT SỐ LIỆU */}
                <div className="c2-summary-rows">
                  <div className="c2-summary-row">
                    <span>Tạm tính</span>
                    <strong>{formatMoney(preview ? preview.subtotal_vnd : subtotal)}</strong>
                  </div>

                  {user && preview && (
                    <>
                      {preview.discount_vnd > 0 && (
                        <div className="c2-summary-row" style={{ color: '#1e5922' }}>
                          <span>Giảm giá</span>
                          <strong>−{formatMoney(preview.discount_vnd)}</strong>
                        </div>
                      )}
                      <div className="c2-summary-row">
                        <span>Phí vận chuyển</span>
                        <strong>{formatMoney(preview.shipping_fee_vnd)}</strong>
                      </div>
                    </>
                  )}

                  {!user && (
                    <p style={{ margin: '8px 0', fontSize: '11px', color: 'var(--muted, #7c6a57)', fontStyle: 'italic' }}>
                      * Tạm tính theo giá hiển thị, chưa gồm phí vận chuyển và giảm giá.
                    </p>
                  )}

                  <div className="c2-summary-divider" />

                  <div className="c2-summary-row c2-summary-total">
                    <span>Tổng thanh toán</span>
                    <span>{formatMoney(user && preview ? preview.total_vnd : subtotal)}</span>
                  </div>
                </div>

                {/* NÚT TIẾN HÀNH ĐẶT HÀNG */}
                <div style={{ marginTop: '24px' }}>
                  {user ? (
                    <a
                      href="#/checkout"
                      className="c2-btn c2-btn-primary c2-btn-block"
                      style={{ fontSize: '14px', padding: '14px' }}
                    >
                      Tiến hành đặt hàng (COD) <ArrowRight size={16} />
                    </a>
                  ) : (
                    <a
                      href="#/login?redirect=/cart"
                      className="c2-btn c2-btn-primary c2-btn-block"
                      style={{ fontSize: '14px', padding: '14px' }}
                    >
                      Đăng nhập để đặt hàng <ArrowRight size={16} />
                    </a>
                  )}

                  <a
                    href="#/catalog"
                    className="c2-btn c2-btn-ghost c2-btn-block"
                    style={{ marginTop: '8px', fontSize: '12px' }}
                  >
                    ← Tiếp tục xem sản phẩm khác
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
