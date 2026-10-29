import React from 'react';
import { ShoppingBag, CreditCard, CheckCircle2 } from 'lucide-react';

export type CheckoutStep = 'cart' | 'checkout' | 'success';

interface CheckoutProgressBarProps {
  currentStep: CheckoutStep;
}

export function CheckoutProgressBar({ currentStep }: CheckoutProgressBarProps) {
  const steps: { key: CheckoutStep; label: string; number: number; icon: React.ReactNode; href?: string }[] = [
    { key: 'cart', label: 'Giỏ hàng', number: 1, icon: <ShoppingBag size={14} />, href: '#/cart' },
    { key: 'checkout', label: 'Thông tin đặt hàng', number: 2, icon: <CreditCard size={14} />, href: currentStep === 'success' ? '#/checkout' : undefined },
    { key: 'success', label: 'Hoàn tất', number: 3, icon: <CheckCircle2 size={14} /> }
  ];

  return (
    <nav aria-label="Tiến trình đặt hàng" style={{ maxWidth: '640px', margin: '0 auto 28px', padding: '0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {/* Đường nối giữa các bước */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '32px',
            right: '32px',
            height: '2px',
            background: 'var(--c2-line, #d9cfbc)',
            zIndex: 1
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '32px',
            width: currentStep === 'cart' ? '0%' : currentStep === 'checkout' ? '50%' : '100%',
            height: '2px',
            background: 'var(--c2-brown, #a87542)',
            transition: 'width 0.3s ease',
            zIndex: 2
          }}
        />

        {steps.map(s => {
          const isDone = (currentStep === 'checkout' && s.key === 'cart') || (currentStep === 'success' && s.key !== 'success');
          const isCurrent = currentStep === s.key;
          const isUpcoming = !isDone && !isCurrent;

          const circleBg = isDone || isCurrent ? 'var(--c2-brown, #a87542)' : '#fbf9f4';
          const circleColor = isDone || isCurrent ? '#ffffff' : 'var(--c2-muted, #786d5c)';
          const circleBorder = isDone || isCurrent ? 'var(--c2-brown, #a87542)' : 'var(--c2-line, #d9cfbc)';

          const StepElement = s.href && isDone ? 'a' : 'div';

          return (
            <StepElement
              key={s.key}
              href={s.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                zIndex: 3,
                textDecoration: 'none',
                cursor: s.href && isDone ? 'pointer' : 'default'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: circleBg,
                  color: circleColor,
                  border: `2px solid ${circleBorder}`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(168, 117, 66, 0.2)' : 'none'
                }}
              >
                {isDone ? <CheckCircle2 size={16} /> : s.number}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 600 : 500,
                  color: isCurrent ? 'var(--c2-cafe, #3b352d)' : 'var(--c2-muted, #786d5c)'
                }}
              >
                {s.label}
              </span>
            </StepElement>
          );
        })}
      </div>
    </nav>
  );
}
