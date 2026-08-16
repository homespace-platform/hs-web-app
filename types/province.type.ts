export interface Province {
  code: number;
  name: string;
  division_type?: string;
  codename?: string;
  phone_code?: number;
  districts?: District[];
}

export interface District {
  code: number;
  name: string;
  division_type?: string;
  codename?: string;
  province_code?: number;
  wards?: Ward[];
}

export interface Ward {
  code: number;
  name: string;
  division_type?: string;
  codename?: string;
  district_code?: number;
}
