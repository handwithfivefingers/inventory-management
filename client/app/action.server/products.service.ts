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

const productService = {
  getProducts: () => {
    return http.get(API_PATH.products);
  },
  getProductById: (documentId: string) => {
    const params = new URLSearchParams({});
    params.append(`populate[0]`, "productDetails");
    params.append(`populate[1]`, "history");
    return http.get(API_PATH.products + "/" + documentId + "?" + params.toString());
  },
  createProduct: (params: ICreateProductParams) => {
    console.log("params", params);
    return http.post(API_PATH.products, params);
  },
};

export { productService };
