import { z } from 'zod';
import divisions from '../../data/vietnam-addresses.json' with { type: 'json' };
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { AppError } from '../../common/errors.js';

export const addressSchema = z.object({
  recipient_name: z.string().trim().min(2, 'Tên người nhận tối thiểu 2 ký tự').max(120),
  phone: z
    .string()
    .regex(/^0[235789][0-9]{8}$/, 'Số điện thoại phải gồm 10 chữ số hợp lệ, bắt đầu bằng 0'),
  province: z.string().trim().min(1, 'Vui lòng chọn tỉnh/thành').max(100),
  district: z.string().trim().max(100).default(''),
  ward: z.string().trim().min(1, 'Vui lòng chọn phường/xã').max(100),
  address_line: z.string().trim().min(3, 'Địa chỉ tối thiểu 3 ký tự').max(255),
  is_default: z.boolean().optional().default(false),
}).superRefine((value, ctx) => {
  const name = value.province.replace(/^(Thành phố|Tỉnh)\s+/i, '').replace(/^TP[. ]+/, '').replace(/^HCM$/, 'Hồ Chí Minh');
  const province = divisions.find(p => p.name === name);
  if (!province) ctx.addIssue({code:'custom',path:['province'],message:'Vui lòng chọn tỉnh/thành trong danh sách.'});
  else if (!province.wards.some(w => w.name === value.ward.replace(/^(Phường|Xã|Đặc khu)\s+/i,'')))
    ctx.addIssue({code:'custom',path:['ward'],message:'Phường/xã không thuộc tỉnh/thành đã chọn.'});
});

export type AddressInput = z.infer<typeof addressSchema>;

export interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  address_line: string;
  is_default: boolean;
}

const SELECT_COLUMNS = `id, recipient_name, phone, province, district, ward, address_line, is_default`;

export async function listAddresses(userId: string): Promise<Address[]> {
  return query<Address>(
    `SELECT ${SELECT_COLUMNS}
       FROM addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, recipient_name ASC`,
    [userId],
  );
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  return withTransaction(async (client) => {
    // Tuần tự hóa thay đổi địa chỉ của cùng tài khoản, kể cả khi chưa có địa chỉ.
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    // Nếu đây là địa chỉ đầu tiên, luôn đặt làm mặc định.
    const countRow = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM addresses WHERE user_id = $1`,
      [userId],
    );
    const isFirst = (countRow.rows[0]?.count ?? '0') === '0';
    const makeDefault = input.is_default || isFirst;

    if (makeDefault) {
      await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1 AND is_default`, [userId]);
    }

    const inserted = await client.query<Address>(
      `INSERT INTO addresses
         (user_id, recipient_name, phone, province, district, ward, address_line, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SELECT_COLUMNS}`,
      [
        userId,
        input.recipient_name,
        input.phone,
        input.province,
        input.district,
        input.ward,
        input.address_line,
        makeDefault,
      ],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error('Không tạo được địa chỉ.');
    return row;
  });
}

export async function getOwnedAddress(userId: string, addressId: string): Promise<Address | null> {
  return queryOne<Address>(
    `SELECT ${SELECT_COLUMNS} FROM addresses WHERE id = $1 AND user_id = $2`,
    [addressId, userId],
  );
}

export async function requireOwnedAddress(userId: string, addressId: string): Promise<Address> {
  const address = await getOwnedAddress(userId, addressId);
  if (!address) throw AppError.notFound('Không tìm thấy địa chỉ của bạn.');
  return address;
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const result = await client.query<{ is_default: boolean }>(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING is_default',
      [addressId, userId],
    );
    if (!result.rows.length) throw AppError.notFound('Không tìm thấy địa chỉ của bạn.');
    if (result.rows[0]!.is_default) {
      await client.query(`UPDATE addresses SET is_default = true WHERE id = (
        SELECT id FROM addresses WHERE user_id = $1 ORDER BY id LIMIT 1
      )`, [userId]);
    }
  });
}
