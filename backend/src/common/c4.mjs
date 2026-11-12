export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message); Object.assign(this, {status, code, fields});
  }
}
export const invalid = (message = 'Dữ liệu không hợp lệ') => new ApiError(400, 'VALIDATION_ERROR', message);
export const conflict = message => new ApiError(409, 'CONFLICT', message);
export const missing = () => new ApiError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
export function text(value, name, max, optional = false) {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw invalid(`${name} không hợp lệ (tối đa ${max} ký tự)`);
  return value.trim();
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw invalid('ID phải là UUID');
  return value;
}
export function integer(value, min = 1, max = 2147483647) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw invalid('Số nguyên ngoài phạm vi cho phép');
  return value;
}
export function money(value) {
  const result = BigInt(value);
  if (result < 0n || result > BigInt(Number.MAX_SAFE_INTEGER)) throw invalid('Số tiền ngoài phạm vi hỗ trợ');
  return Number(result);
}
export function pagination(query = {}) {
  const parse = (value, fallback, max) => {
    if (value === undefined || value === null) return fallback;
    if (!/^\d+$/.test(String(value))) throw invalid('Phân trang không hợp lệ');
    return integer(Number(value), 1, max);
  };
  const page = parse(query.page, 1, 1000000), limit = parse(query.limit, 12, 100);
  return {page, limit, offset: (page - 1) * limit};
}
export function requireUser(user) {
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập');
  uuid(user.id);
  return user;
}
export function requireAdmin(user) {
  requireUser(user);
  if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Không có quyền');
  return user;
}
export async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
// Every C4 cart mutation and checkout takes this same lock, including an empty cart.
export const lockCart = (client, userId) => client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`c4-cart:${userId}`]);
export const monetary = row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k, k.endsWith('_vnd') && v !== null ? money(v) : v]));
