import axios from "axios";
import { Province, District } from "@/types/province.type";
import {
  VIETNAM_63_PROVINCES,
  VIETNAM_DISTRICTS_MAP,
} from "@/data/vietnam-provinces-data";

// Endpoint chính thức v1 chuẩn của Open API Vietnam (tránh bị 302 redirect)
const PROVINCES_API_URL = "https://provinces.open-api.vn/api/v1";

// In-memory cache for instant 0ms responses across all components
let cachedProvinces: Province[] | null = null;
let provincesPromise: Promise<Province[]> | null = null;
const cachedDistricts: Record<number, District[]> = {};

export const provinceService = {
  /**
   * Lấy danh sách 63 tỉnh thành Việt Nam từ endpoint v1 chính thức
   */
  async getProvinces(): Promise<Province[]> {
    // 1. Trả về ngay lập tức từ memory cache nếu đã có
    if (cachedProvinces && cachedProvinces.length > 0) {
      return cachedProvinces;
    }

    // 2. Tái sử dụng Promise nếu đang có request chạy để tránh gọi trùng lặp
    if (provincesPromise) {
      return provincesPromise;
    }

    provincesPromise = (async () => {
      try {
        const response = await axios.get<Province[]>(`${PROVINCES_API_URL}/p/`, {
          timeout: 5000,
        });
        if (response.data && response.data.length > 0) {
          cachedProvinces = response.data;
          return response.data;
        }
      } catch (error) {
        console.warn("API v1 fallback to administrative dataset:", error);
      }
      cachedProvinces = VIETNAM_63_PROVINCES;
      return VIETNAM_63_PROVINCES;
    })();

    return provincesPromise;
  },

  /**
   * Lấy danh sách quận/huyện theo mã tỉnh thành từ endpoint v1 chính thức
   */
  async getDistrictsByProvince(provinceCode: number): Promise<District[]> {
    // 1. Trả về ngay lập tức từ memory cache nếu đã có
    if (cachedDistricts[provinceCode] && cachedDistricts[provinceCode].length > 0) {
      return cachedDistricts[provinceCode];
    }

    try {
      const response = await axios.get(
        `${PROVINCES_API_URL}/p/${provinceCode}?depth=2`,
        { timeout: 5000 }
      );
      if (response.data?.districts && response.data.districts.length > 0) {
        cachedDistricts[provinceCode] = response.data.districts;
        return response.data.districts;
      }
    } catch (error) {
      console.warn(
        `API v1 fallback to districts dataset for province ${provinceCode}:`,
        error
      );
    }

    const fallback = VIETNAM_DISTRICTS_MAP[provinceCode] || [];
    cachedDistricts[provinceCode] = fallback;
    return fallback;
  },
};

export default provinceService;
