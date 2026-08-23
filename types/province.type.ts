export interface Province {
  code: string | number;
  name: string;
  full_name?: string;
  type?: string;
  type_name?: string;
  division_type?: string;
  codename?: string;
  phone_code?: number;
  postal_code_prefixes?: string[];
  districts?: District[];
}

export interface District {
  code: string | number;
  name: string;
  full_name?: string;
  type?: string;
  type_name?: string;
  division_type?: string;
  codename?: string;
  province_code?: string | number;
  postal_code?: string | null;
  wards?: Ward[];
}

export interface Ward {
  code: string | number;
  name: string;
  full_name?: string;
  type?: string;
  type_name?: string;
  division_type?: string;
  codename?: string;
  province_code?: string | number;
  district_code?: string | number;
  postal_code?: string | null;
}
