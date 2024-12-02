export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export interface IResponse<T> {
  data: T;
}
