export interface IWareHouse {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isMain: boolean;
  quantity?: number;
  createdAt?: string;
  updatedAt?: string;
}
