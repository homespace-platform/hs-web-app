import axios from "axios";
import { Province, District } from "@/types/province.type";

const PROVINCES_API_URL = "https://provinces.open-api.vn/api";

export const provinceService = {
  /**
   * Lấy danh sách toàn bộ 63 tỉnh thành Việt Nam từ Open API (Public Free)
   */
  async getProvinces(): Promise<Province[]> {
    try {
      const response = await axios.get<Province[]>(`${PROVINCES_API_URL}/p/`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch provinces from public API:", error);
      // Fallback data if API is temporarily unavailable
      return [
        { code: 79, name: "Thành phố Hồ Chí Minh" },
        { code: 1, name: "Thành phố Hà Nội" },
        { code: 48, name: "Thành phố Đà Nẵng" },
        { code: 74, name: "Tỉnh Bình Dương" },
        { code: 92, name: "Thành phố Cần Thơ" },
        { code: 31, name: "Thành phố Hải Phòng" },
        { code: 56, name: "Tỉnh Khánh Hòa" },
        { code: 77, name: "Tỉnh Bà Rịa - Vũng Tàu" },
      ];
    }
  },

  /**
   * Lấy danh sách quận/huyện theo mã tỉnh thành
   */
  async getDistrictsByProvince(provinceCode: number): Promise<District[]> {
    try {
      const response = await axios.get(`${PROVINCES_API_URL}/p/${provinceCode}?depth=2`);
      return response.data?.districts || [];
    } catch (error) {
      console.error(`Failed to fetch districts for province ${provinceCode}:`, error);
      return [];
    }
  },
};

export default provinceService;
