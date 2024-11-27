import { http } from "~/http";
interface IProductDetails {
  inStock?: number;
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
const API_PATH = {
  products: "/products",
};

const productClientService = {
  createProduct: (params: ICreateProductParams) => {
    console.log("productClientService params", params);
    return http.post(API_PATH.products, params);
  },
};

export { productClientService };
