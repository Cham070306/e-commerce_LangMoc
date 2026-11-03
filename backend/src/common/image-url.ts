export function isImageUrl(value: string): boolean {
  if (/^\/images\/[A-Za-z0-9_./% -]+$/.test(value) && !value.includes('..')) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
