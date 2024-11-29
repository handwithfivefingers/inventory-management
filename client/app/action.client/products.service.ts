import { http } from "~/http";
interface IProductDetails {
  quantity?: number;
  salePrice?: number;
  regularPrice?: number;
  wholeSalePrice?: number;
  costPrice?: number;
  sold?: number;
  VAT?: number;
  createdDate?: string;
}

interface ICreateProductParams {
  data: {
    name: string;
    skuCode?: string;
    code?: string;
    expiredAt?: string;
    description?: string;
    category?: string;
    unit?: string;
    tags?: string;
    images?: string;
    productDetails?: IProductDetails;
    history?: IProductDetails[];
  };
}
interface ICreateProductQueryParams {
  warehouseId: string;
  vendorId: string;
  quantity: string;
}

const API_PATH = {
  products: "/products",
};

const productClientService = {
  createProduct: (params: ICreateProductParams, qsParams: ICreateProductQueryParams) => {
    console.log("params", params);
    const qs = new URLSearchParams({
      warehouseId: qsParams.warehouseId,
      vendorId: qsParams.vendorId,
      quantity: qsParams.quantity,
    });
    return http.post(API_PATH.products + "?" + qs.toString(), params);
  },
};

export { productClientService };
