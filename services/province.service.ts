import axios from "axios";
import { Province, District, Ward } from "@/types/province.type";
import {
  VIETNAM_63_PROVINCES,
  VIETNAM_DISTRICTS_MAP,
} from "@/data/vietnam-provinces-data";

// Base URL cấu hình từ .env (NEXT_PUBLIC_LOCATION_SERVICE_URL) hoặc fallback http://localhost:9999
const LOCATION_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_LOCATION_SERVICE_URL || "http://localhost:9999";

const API_V1_URL = `${LOCATION_SERVICE_BASE_URL}/api/v1`;

// In-memory cache for instant 0ms responses across all components
let cachedProvinces: Province[] | null = null;
let provincesPromise: Promise<Province[]> | null = null;
const cachedWardsByProvince: Record<string, Ward[]> = {};

export const provinceService = {
  async getCurrentProvinces(): Promise<Province[]> {
    const response = await axios.get<Province[]>(`${API_V1_URL}/provinces`, {
      timeout: 5000,
    });
    return response.data;
  },

  async getCurrentWardsByProvince(provinceCode: string | number): Promise<Ward[]> {
    const key = String(provinceCode).padStart(2, "0");
    const response = await axios.get<Ward[]>(`${API_V1_URL}/provinces/${key}/wards`, {
      timeout: 5000,
    });
    return response.data;
  },

  /**
   * Lấy danh sách tất cả các Tỉnh / Thành phố từ hs-location-service
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
        const response = await axios.get<Province[]>(`${API_V1_URL}/provinces`, {
          timeout: 2500,
        });
        if (response.data && response.data.length > 0) {
          cachedProvinces = response.data;
          return response.data;
        }
      } catch (error) {
        console.warn(
          `[LocationService] Could not reach ${API_V1_URL}/provinces. Using local dataset fallback.`,
          error
        );
      }
      cachedProvinces = VIETNAM_63_PROVINCES;
      return VIETNAM_63_PROVINCES;
    })();

    return provincesPromise;
  },

  /**
   * Lấy thông tin chi tiết một Tỉnh / Thành phố theo mã code
   */
  async getProvince(code: string | number): Promise<Province | null> {
    const formattedCode = String(code).padStart(2, "0");
    try {
      const response = await axios.get<Province>(
        `${API_V1_URL}/provinces/${formattedCode}`,
        { timeout: 2500 }
      );
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      // Fallback tìm trong local cache
      const list = await this.getProvinces();
      return (
        list.find((p) => String(p.code) === String(code) || String(p.code) === formattedCode) ||
        null
      );
    }
    return null;
  },

  /**
   * Lấy danh sách Phường / Xã / Đơn vị hành chính trực thuộc theo mã Tỉnh / Thành
   */
  async getWardsByProvince(provinceCode: string | number): Promise<Ward[]> {
    const key = String(provinceCode).padStart(2, "0");

    // 1. Trả về ngay lập tức từ memory cache nếu đã có
    if (cachedWardsByProvince[key] && cachedWardsByProvince[key].length > 0) {
      return cachedWardsByProvince[key];
    }

    try {
      const response = await axios.get<Ward[]>(
        `${API_V1_URL}/provinces/${key}/wards`,
        { timeout: 2500 }
      );
      if (response.data && response.data.length > 0) {
        cachedWardsByProvince[key] = response.data;
        return response.data;
      }
    } catch (error) {
      console.warn(
        `[LocationService] Could not fetch wards for province ${key}. Using local fallback.`,
        error
      );
    }

    // Fallback sang local dataset
    const numCode = Number(provinceCode);
    const fallback = (VIETNAM_DISTRICTS_MAP[numCode] || []) as unknown as Ward[];
    cachedWardsByProvince[key] = fallback;
    return fallback;
  },

  /**
   * Tương thích ngược: Lấy danh sách quận/huyện hoặc phường/xã theo tỉnh thành
   */
  async getDistrictsByProvince(provinceCode: string | number): Promise<District[]> {
    const wards = await this.getWardsByProvince(provinceCode);
    return wards as unknown as District[];
  },

  /**
   * Lấy chi tiết thông tin một Phường / Xã theo mã code
   */
  async getWard(code: string | number): Promise<Ward | null> {
    try {
      const response = await axios.get<Ward>(`${API_V1_URL}/wards/${code}`, {
        timeout: 2500,
      });
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.warn(`[LocationService] Could not fetch ward ${code}`);
    }
    return null;
  },
};

export default provinceService;
