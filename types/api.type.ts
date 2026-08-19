export type ApiResponse<T> = {
  code: number;
  message?: string;
  result: T;
};
