import axios from "axios";
import { Province, District, Ward } from "@/types/province.type";

const LOCATION_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_LOCATION_SERVICE_URL || "http://localhost:9999";

const API_V1_URL = `${LOCATION_SERVICE_BASE_URL}/api/v1`;

export const provinceService = {
  /**
   * Lấy danh sách tất cả các Tỉnh / Thành phố từ hs-location-service
   */
  async getCurrentProvinces(): Promise<Province[]> {
    try {
      const response = await axios.get<Province[]>(`${API_V1_URL}/provinces`, {
        timeout: 5000,
      });
      return response.data ?? [];
    } catch (err) {
      console.warn("[LocationService] Could not reach provinces API:", err);
      return [];
    }
  },

  async getProvinces(): Promise<Province[]> {
    return this.getCurrentProvinces();
  },

  /**
   * Lấy danh sách Phường / Xã trực thuộc theo mã Tỉnh / Thành
   */
  async getCurrentWardsByProvince(provinceCode: string | number): Promise<Ward[]> {
    try {
      const key = String(provinceCode).padStart(2, "0");
      const response = await axios.get<Ward[]>(`${API_V1_URL}/provinces/${key}/wards`, {
        timeout: 5000,
      });
      return response.data ?? [];
    } catch (err) {
      console.warn(`[LocationService] Could not reach wards API for province ${provinceCode}:`, err);
      return [];
    }
  },

  async getWardsByProvince(provinceCode: string | number): Promise<Ward[]> {
    return this.getCurrentWardsByProvince(provinceCode);
  },

  /**
   * Lấy chi tiết thông tin một Tỉnh / Thành phố theo mã code
   */
  async getProvince(code: string | number): Promise<Province | null> {
    try {
      const formattedCode = String(code).padStart(2, "0");
      const response = await axios.get<Province>(
        `${API_V1_URL}/provinces/${formattedCode}`,
        { timeout: 5000 }
      );
      return response.data ?? null;
    } catch (err) {
      console.warn(`[LocationService] Could not reach province API for code ${code}:`, err);
      return null;
    }
  },

  /**
   * Lấy danh sách quận/huyện hoặc phường/xã theo tỉnh thành
   */
  async getDistrictsByProvince(provinceCode: string | number): Promise<District[]> {
    const wards = await this.getCurrentWardsByProvince(provinceCode);
    return wards as unknown as District[];
  },

  /**
   * Lấy chi tiết thông tin một Phường / Xã theo mã code
   */
  async getWard(code: string | number): Promise<Ward | null> {
    try {
      const response = await axios.get<Ward>(`${API_V1_URL}/wards/${code}`, {
        timeout: 5000,
      });
      return response.data ?? null;
    } catch (err) {
      console.warn(`[LocationService] Could not reach ward API for code ${code}:`, err);
      return null;
    }
  },
};

export default provinceService;
