import React from 'react';
import { POLICIES, type PolicyDocument } from '../content/policies';
import { Truck, RotateCcw, ShieldAlert, ArrowLeft, AlertTriangle } from 'lucide-react';
import { isMockMode } from '../config/site';

interface PoliciesPageProps {
  subroute?: string;
}

export default function PoliciesPage({ subroute }: PoliciesPageProps) {
  // Chuẩn hóa subroute: 'shipping' | 'returns' | 'warranty', mặc định là 'shipping'
  let activeSlug: 'shipping' | 'returns' | 'warranty' = 'shipping';
  if (subroute === 'returns') activeSlug = 'returns';
  else if (subroute === 'warranty') activeSlug = 'warranty';

  const doc: PolicyDocument = POLICIES[activeSlug] || POLICIES.shipping;

  return (
    <main id="main" className="c2-page-wrap">
      <div className="c2-main-container">
        {/* Breadcrumb & Tiêu đề */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted, #7c6a57)', marginBottom: '4px' }}>
            <a href="#/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</a> ›{' '}
            <strong>Chính sách dịch vụ</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="c2-title" style={{ margin: 0 }}>Chính sách Làng Mộc</h1>
              <p className="c2-subtitle" style={{ margin: '4px 0 0' }}>
                Quy định về giao nhận COD, đổi trả hàng vỡ và bảo quản sản phẩm thủ công truyền thống.
              </p>
            </div>
            {isMockMode && <span className="c2-mock-badge">⚙️ CHÍNH SÁCH TĨNH</span>}
          </div>
        </div>

        {/* Thanh Tabs điều hướng giữa 3 chính sách (Không dùng neo hash để tránh xung đột router) */}
        <div className="c2-tabs" style={{ marginBottom: '24px' }}>
          <a
            href="#/policies/shipping"
            className={`c2-tab-btn ${activeSlug === 'shipping' ? 'active' : ''}`}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Truck size={14} /> Vận chuyển & Giao nhận COD
          </a>
          <a
            href="#/policies/returns"
            className={`c2-tab-btn ${activeSlug === 'returns' ? 'active' : ''}`}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={14} /> Đổi trả & Bồi hoàn
          </a>
          <a
            href="#/policies/warranty"
            className={`c2-tab-btn ${activeSlug === 'warranty' ? 'active' : ''}`}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldAlert size={14} /> Bảo hành & Bảo quản
          </a>
        </div>

        {/* Khung nội dung chính sách */}
        <div className="c2-card" style={{ padding: '32px' }}>
          <header style={{ borderBottom: '1px solid var(--line, #c8b99e)', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', color: 'var(--brown, #493421)', margin: '0 0 6px' }}>
              {doc.title}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted, #7c6a57)' }}>
              {doc.shortDescription}
            </p>
          </header>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {doc.sections.map(section => (
              <section key={section.id} id={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--cafe, #3b352d)' }}>
                  {section.heading}
                </h3>

                <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--cafe, #3b352d)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {section.content.map((p, idx) => {
                    const isBullet = p.startsWith('• ');
                    const isSubBullet = p.startsWith('  - ');
                    const isHeaderLine = p.endsWith(':') && !isBullet && !isSubBullet;

                    return (
                      <p
                        key={idx}
                        style={{
                          margin: 0,
                          paddingLeft: isSubBullet ? '24px' : isBullet ? '12px' : '0',
                          fontWeight: isHeaderLine ? 600 : 'normal',
                          color: isHeaderLine ? 'var(--brown, #493421)' : 'inherit'
                        }}
                      >
                        {p}
                      </p>
                    );
                  })}
                </div>

                {/* Bảng phân loại chính sách đặc thù (nếu có) */}
                {section.table && (
                  <div style={{ overflowX: 'auto', margin: '8px 0', borderRadius: '6px', border: '1px solid var(--line, #c8b99e)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ background: '#f5efe6', borderBottom: '1px solid var(--line, #c8b99e)' }}>
                          {section.table.headers.map((h, i) => (
                            <th
                              key={i}
                              style={{
                                padding: '10px 12px',
                                fontWeight: 600,
                                color: 'var(--brown, #493421)',
                                whiteSpace: i === 0 || i === 1 ? 'nowrap' : 'normal',
                                width: i === 0 ? '15%' : i === 1 ? '20%' : i === 2 ? '32%' : '33%'
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{
                              borderBottom: rIdx < section.table!.rows.length - 1 ? '1px solid #e7ded4' : 'none',
                              background: rIdx % 2 === 1 ? 'rgba(245, 239, 230, 0.35)' : '#ffffff'
                            }}
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                style={{
                                  padding: '10px 12px',
                                  verticalAlign: 'top',
                                  color: 'var(--cafe, #3b352d)',
                                  fontWeight: cIdx === 0 ? 600 : 'normal',
                                  lineHeight: '1.6'
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Nhãn CẦN NHÓM CHỐT hiển thị nổi bật theo yêu cầu M5 */}
                {section.pendingDecision && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      background: '#fffbeb',
                      border: '1px dashed #f59e0b',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#92400e',
                      marginTop: '6px',
                      lineHeight: '1.5'
                    }}
                  >
                    <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ letterSpacing: '0.3px' }}>[CẦN NHÓM CHỐT]:</strong>{' '}
                      {section.pendingDecision.replace(/^CẦN NHÓM CHỐT:\s*/i, '')}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>

          <footer style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid var(--line, #c8b99e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted, #7c6a57)' }}>
              * {doc.lastUpdated}. Nội dung tuân thủ tài liệu đặc tả học phần e-commerce Làng Mộc.
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="#/contact" className="c2-btn c2-btn-outline c2-btn-sm" style={{ textDecoration: 'none' }}>
                Gửi phản hồi / Góp ý →
              </a>
              <a href="#/" className="c2-btn c2-btn-outline c2-btn-sm" style={{ textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Về trang chủ
              </a>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
