import { http } from "~/http";

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
};

export { productService };
