import { useCallback, useState } from 'react';
import { ApiError } from '../../lib/api';

export function useAdminAccess() {
  const [denied, setDenied] = useState(false);

  const handle = useCallback((error: unknown): string => {
    if (error instanceof ApiError && error.status === 401) {
      const redirect = window.location.hash.replace(/^#/, '') || '/admin/orders';
      window.location.hash = `#/login?redirect=${encodeURIComponent(redirect)}`;
      return 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.';
    }
    if (error instanceof ApiError && error.status === 403) {
      setDenied(true);
      return 'Không có quyền truy cập dữ liệu quản trị.';
    }
    return error instanceof Error ? error.message : 'Không thể hoàn thành yêu cầu. Vui lòng thử lại.';
  }, []);

  return { denied, handle };
}
