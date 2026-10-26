import React, { useEffect, useState } from 'react';
import type { Order } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { formatMoney, ProductImage } from '../components/catalog/ProductCard';
import { Loading } from '../components/common/States';
import { CheckCircle2, PackageCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import { isMockMode } from '../config/site';

export default function OrderSuccessPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Kiểm tra trong sessionStorage trước để tải lại trang vẫn xem được
    let cached: Order | null = null;
    try {
      const raw = sessionStorage.getItem('langmoc.last_order.' + id);
      if (raw) {
        cached = JSON.parse(raw);
      }
    } catch {
      // Bỏ qua lỗi sessionStorage
    }

    if (cached) {
      setOrder(cached);
      setLoading(false);
      return;
    }

    // 2. Nếu không có trong sessionStorage, gọi API
    api.order(id)
      .then(res => {
        setOrder(res.data);
      })
      .catch(err => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Không thể tải thông tin đơn hàng này.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main id="main" className="c2-page-wrap">
        <Loading label="Đang kiểm tra thông tin đơn hàng…" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main id="main" className="c2-page-wrap">
        <div className="c2-main-container">
          <div className="c2-card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '520px', margin: '40px auto' }}>
            <h1 className="c2-title" style={{ fontSize: '22px', marginBottom: '12px' }}>Không tìm thấy đơn hàng</h1>
            <p className="c2-subtitle" style={{ marginBottom: '24px' }}>
              {error || 'Thông tin đơn hàng không tồn tại hoặc phiên xem đã kết thúc.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href="#/orders" className="c2-btn c2-btn-primary">Xem các đơn hàng của bạn</a>
              <a href="#/catalog" className="c2-btn c2-btn-outline">Tiếp tục mua sắm</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container" style={{ maxWidth: '800px' }}>
        {/* Banner chúc mừng thành công */}
        <div className="c2-card" style={{ textAlign: 'center', padding: '40px 24px 32px', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={36} />
          </div>
          <span style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--copper, #a5754b)', fontWeight: 600 }}>
            Đặt hàng thành công
          </span>
          <h1 className="c2-title" style={{ fontSize: '28px', margin: '8px 0 10px' }}>
            Cảm ơn quý khách đã tin chọn Làng Mộc!
          </h1>
          <p className="c2-subtitle" style={{ maxWidth: '540px', margin: '0 auto' }}>
            Đơn hàng của quý khách đã được ghi nhận vào hệ thống. Nghệ nhân và xưởng nghề đang chuẩn bị kiện hàng thủ công chu đáo nhất.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(73,52,33,0.04)', padding: '10px 20px', borderRadius: '30px', marginTop: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted, #7c6a57)' }}>Mã đơn hàng:</span>
            <strong style={{ fontSize: '15px', color: 'var(--brown, #493421)', letterSpacing: '0.5px' }}>
              {order.order_number}
            </strong>
          </div>
        </div>

        {/* Chi tiết đơn hàng snapshot */}
        <div className="c2-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 18px', color: 'var(--brown, #493421)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageCheck size={18} /> Thông tin nhận hàng (COD)
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px', lineHeight: 1.8, marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line, #c8b99e)' }}>
            <div>
              <span style={{ color: 'var(--muted, #7c6a57)', display: 'block', fontSize: '11px' }}>NGƯỜI NHẬN HÀNG</span>
              <strong>{order.recipient_name}</strong>
              <div>{order.phone}</div>
            </div>
            <div>
              <span style={{ color: 'var(--muted, #7c6a57)', display: 'block', fontSize: '11px' }}>ĐỊA CHỈ NHẬN HÀNG</span>
              <div>{order.shipping_address}</div>
            </div>
            <div>
              <span style={{ color: 'var(--muted, #7c6a57)', display: 'block', fontSize: '11px' }}>THỜI GIAN ĐẶT & THANH TOÁN</span>
              <div>{new Date(order.created_at).toLocaleString('vi-VN')}</div>
              <div style={{ color: 'var(--copper, #a5754b)', fontWeight: 600 }}>Thanh toán tiền mặt khi nhận hàng (COD)</div>
            </div>
          </div>

          {order.note && (
            <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(73,52,33,0.03)', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Ghi chú giao hàng:</strong> {order.note}
            </div>
          )}


          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px', color: 'var(--brown, #493421)' }}>
            Danh sách sản phẩm ({order.items.reduce((s, i) => s + i.quantity, 0)})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {order.items.map((item, idx) => (
              <div key={item.id || idx} style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '13px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--line, #c8b99e)', flexShrink: 0 }}>
                  <ProductImage src={item.product_image_url || ''} alt={item.product_name} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--brown, #493421)' }}>{item.product_name}</div>
                  <div style={{ color: 'var(--muted, #7c6a57)', fontSize: '12px' }}>
                    {formatMoney(item.unit_price_vnd)} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--brown, #493421)' }}>
                  {formatMoney(item.line_total_vnd)}
                </div>
              </div>
            ))}
          </div>


          <div className="c2-summary-rows" style={{ maxWidth: '340px', marginLeft: 'auto' }}>
            <div className="c2-summary-row">
              <span>Tạm tính</span>
              <span>{formatMoney(order.subtotal_vnd)}</span>
            </div>
            <div className="c2-summary-row">
              <span>Phí vận chuyển</span>
              <span>{formatMoney(order.shipping_fee_vnd)}</span>
            </div>
            {order.discount_vnd > 0 && (
              <div className="c2-summary-row" style={{ color: '#047857' }}>
                <span>Giảm giá {order.promotion_code ? `(${order.promotion_code})` : ''}</span>
                <strong>-{formatMoney(order.discount_vnd)}</strong>
              </div>
            )}
            <div className="c2-summary-divider" />
            <div className="c2-summary-row c2-summary-total">
              <span>Số tiền thanh toán khi nhận (COD)</span>
              <strong style={{ fontSize: '18px', color: '#b91c1c' }}>
                {formatMoney(order.total_vnd)}
              </strong>
            </div>
          </div>
        </div>


        <div style={{ padding: '16px 20px', background: 'rgba(165,117,75,0.06)', borderRadius: '6px', fontSize: '12px', lineHeight: 1.7, color: 'var(--cafe, #3b352d)', marginBottom: '28px', border: '1px solid rgba(165,117,75,0.2)' }}>
          <strong>💡 Hướng dẫn nhận hàng COD:</strong> Quý khách sẽ thanh toán số tiền <strong>{formatMoney(order.total_vnd)}</strong> bằng tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện hàng. Mọi thông tin chi tiết xin tham khảo tại <a href="#/policies/shipping" style={{ textDecoration: 'underline', color: 'inherit' }}>Chính sách giao nhận & đổi trả</a>.
        </div>

        {/* Nút hành động */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#/orders" className="c2-btn c2-btn-primary" style={{ padding: '12px 24px', fontSize: '13px' }}>
            Xem đơn hàng của tôi <ArrowRight size={16} />
          </a>
          <a href="#/catalog" className="c2-btn c2-btn-outline" style={{ padding: '12px 24px', fontSize: '13px' }}>
            <ShoppingBag size={16} /> Tiếp tục mua sắm
          </a>
        </div>
      </div>
    </main>
  );
}
