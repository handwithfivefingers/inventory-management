export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export interface IResponse<T> {
  data: T;
  total?: number;
  page?: number;
  pageSize?: number;
  status: number;
  message?: string;
}

export interface BaseQueryParams {
  s?: string;
  page?: string;
  pageSize?: string;
  cookie: string;
}
