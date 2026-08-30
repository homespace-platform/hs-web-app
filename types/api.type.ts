export type ApiResponse<T> = {
  code: number;
  message?: string;
  result: T;
};

export type PageResponse<T> = ApiResponse<T[]> & {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
};
