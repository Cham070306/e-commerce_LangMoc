export const CHECKOUT_TERMS = {
  intro: 'Tôi đã đọc và đồng ý với',
  requiredMessage: 'Vui lòng đồng ý với điều khoản để đặt hàng',
  policies: [
    { label: 'Chính sách vận chuyển', href: '#/policies/shipping' },
    { label: 'Chính sách đổi trả', href: '#/policies/returns' },
    { label: 'Chính sách bảo hành', href: '#/policies/warranty' }
  ]
} as const;

export function requiresCheckoutTermsAcceptance(hasAcceptedTerms: boolean): boolean {
  return !hasAcceptedTerms;
}
