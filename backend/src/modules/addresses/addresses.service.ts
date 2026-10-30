import { z } from 'zod';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { AppError } from '../../common/errors.js';

export const addressSchema = z.object({
  recipient_name: z.string().trim().min(2, 'Tên người nhận tối thiểu 2 ký tự').max(120),
  phone: z
    .string()
    .trim()
    .min(8, 'Số điện thoại không hợp lệ')
    .max(20)
    .regex(/^[0-9+\s.-]+$/, 'Số điện thoại không hợp lệ'),
  province: z.string().trim().min(1, 'Vui lòng chọn tỉnh/thành').max(100),
  district: z.string().trim().min(1, 'Vui lòng chọn quận/huyện').max(100),
  ward: z.string().trim().min(1, 'Vui lòng chọn phường/xã').max(100),
  address_line: z.string().trim().min(3, 'Địa chỉ tối thiểu 3 ký tự').max(255),
  is_default: z.boolean().optional().default(false),
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
  const result = await query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`, [
    addressId,
    userId,
  ]);
  if (result.length === 0) throw AppError.notFound('Không tìm thấy địa chỉ của bạn.');
}
