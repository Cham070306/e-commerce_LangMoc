import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/** Trả `{ data }` theo quy ước chung. */
export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

/** Trả `{ data, meta }` cho danh sách. */
export function sendList<T>(res: Response, data: T[], meta: PaginationMeta, extra?: Record<string, unknown>): void {
  res.status(200).json({ data, meta, ...(extra ?? {}) });
}

/** Trả `{ error: { code, message, fields? } }`. */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): void {
  res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
}
