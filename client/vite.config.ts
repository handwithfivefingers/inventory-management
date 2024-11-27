import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig(({ command }) => {
  process.env["VITE_WARE_HOUSE"] = "Warehouse 1";
  process.env["VITE_VENDOR"] = "Finger Group";
  return {
    plugins: [
      remix({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
          v3_lazyRouteDiscovery: true,
        },
        routes: async (definedRoutes) => {
          return definedRoutes((route) => {
            route("/orders/add", "routes/orders/add/route.tsx", { id: "Order-Add" });
            route("/products/add", "routes/products/add/route.tsx", { id: "Product-Add" });
            route("/products/:documentId", "routes/products/edit/route.tsx", { id: "Product-Edit" });
            route("/import-order/add", "routes/import-order/add/route.tsx", { id: "ImportOrder-Add" });
            route("/import-order/:documentId", "routes/warehouses/$documentId/route.tsx", { id: "ImportOrder-Edit" });
            // route("/products/add", "routes/products/add/route.tsx", { id: "Product-Add" });
            route("/warehouses/add", "routes/warehouses/add/route.tsx", { id: "WareHouses-Add" });
            route("/warehouses/:documentId", "routes/warehouses/$documentId/route.tsx", { id: "WareHouses-Edit" });
            route("/providers/:documentId", "routes/providers/$documentId/route.tsx", { id: "Providers-Edit" });
          });
        },
      }),
      tsconfigPaths(),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: "morden-compiler",
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
  };
});
