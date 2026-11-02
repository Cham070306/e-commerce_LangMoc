/** Chuyển tên thành slug ASCII an toàn: bỏ dấu tiếng Việt, lowercase, nối bằng gạch. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

/** Thêm hậu tố ngắn ổn định để tránh trùng slug khi tên giống nhau. */
export function slugWithSuffix(input: string, suffix: string): string {
  const base = slugify(input) || 'san-pham';
  return `${base}-${suffix}`;
}
