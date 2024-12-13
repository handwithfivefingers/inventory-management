export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export interface IResponse<T> {
  data: T;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface BaseQueryParams {
  s?: string;
  page?: number | string;
  pageSize?: number | string;
}
