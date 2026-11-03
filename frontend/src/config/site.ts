const env = ((import.meta as any).env as Record<string, string> | undefined) || {};

export const SITE_NAME = 'Làng Mộc';
export const SITE_TAGLINE = 'Nét Việt, từ đôi bàn tay';
const confirmedAddress = '57 Bàu Cát 6, Phường Tân Bình, TP.HCM (Phường 14, Quận Tân Bình cũ)';

// Cấu hình Google Maps (Yêu cầu M5: Địa điểm Maps CHƯA_CHỐT, không bịa địa chỉ giả)
export interface SiteMapsConfig {
  status: 'CHƯA_CHỐT' | 'CHỐT';
  query: string | null;
  label: string | null;
}

export const siteMaps: SiteMapsConfig = {
  status: 'CHỐT',
  query: env.VITE_MAPS_QUERY?.trim() || '57 Bàu Cát 6, Tân Bình, Thành phố Hồ Chí Minh',
  label: env.VITE_MAPS_LABEL?.trim() || env.VITE_CONTACT_ADDRESS?.trim() || confirmedAddress
};

export const MAPS_LOCATION = siteMaps.status;

// Thông tin liên hệ sàn thương mại điện tử Làng Mộc (Yêu cầu M5: nếu chưa có thì để null / Đang cập nhật - CẦN NHÓM CHỐT)
export interface SiteContactInfo {
  address: string | null;
  hotline: string | null;
  email: string | null;
  workingHours: string | null;
}

export const siteContact: SiteContactInfo = {
  address: env.VITE_CONTACT_ADDRESS?.trim() || confirmedAddress,
  hotline: env.VITE_CONTACT_HOTLINE?.trim() || '0987223434',
  email: env.VITE_CONTACT_EMAIL?.trim() || 'langmoc.support@gmail.com',
  workingHours: env.VITE_CONTACT_HOURS?.trim() || null
};

export const isMockMode = env.VITE_API_MODE !== 'live';

// Backend Khải đã có DELETE /me/addresses/:id với kiểm tra quyền sở hữu.
export const canDeleteAddress = true;

// Khách có thể mua COD qua API guest; có thể tắt khi triển khai.
export const isGuestCheckoutEnabled = env.VITE_GUEST_CHECKOUT !== 'false';
