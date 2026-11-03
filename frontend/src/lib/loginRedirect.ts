export function loginDestination(raw: string | null, fallback = '/'): string {
  let target = raw || fallback;
  for (let i = 0; i < 5; i++) {
    if (!target.startsWith('/') || target.startsWith('//') || /[\\\r\n]/.test(target) || target.includes('://')) return fallback;
    if (target.split('?')[0] !== '/login') return target;
    target = new URLSearchParams(target.split('?').slice(1).join('?')).get('redirect') || fallback;
  }
  return fallback;
}

export function redirectToLogin(target?: string) {
  const current = window.location.hash.replace(/^#/, '');
  if (current.split('?')[0] === '/login') return;
  if (!target && !/^\/(account|orders|order-success|admin|checkout)(\/|[?]|$)/.test(current)) return;
  window.location.hash = '/login?redirect=' + encodeURIComponent(loginDestination(target || current));
}
