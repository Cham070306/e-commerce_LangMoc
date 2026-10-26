const env = ((import.meta as any).env as Record<string, string> | undefined) || {};

export const SITE_NAME = 'Làng Mộc';
export const SITE_TAGLINE = 'Nét Việt, từ đôi bàn tay';

// Cấu hình Google Maps (Yêu cầu M5: Địa điểm Maps CHƯA_CHỐT, không bịa địa chỉ giả)
export interface SiteMapsConfig {
  status: 'CHƯA_CHỐT' | 'CHỐT';
  query: string | null;
  label: string | null;
}

export const siteMaps: SiteMapsConfig = {
  status: 'CHƯA_CHỐT',
  query: null,
  label: null
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
  address: null,       // Đang cập nhật (CẦN NHÓM CHỐT)
  hotline: null,       // Đang cập nhật (CẦN NHÓM CHỐT)
  email: null,         // Đang cập nhật (CẦN NHÓM CHỐT)
  workingHours: null   // Đang cập nhật (CẦN NHÓM CHỐT)
};

export const isMockMode = env.VITE_API_MODE !== 'live';
