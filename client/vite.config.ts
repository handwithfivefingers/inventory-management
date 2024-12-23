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
            route("/", "routes/auth/layout.tsx", () => {
              route("login", "routes/auth/login/route.tsx", { index: true, id: "Login" });
              route("register", "routes/auth/register/route.tsx", { id: "Register" });
            });

            route("", "routes/main/layout.tsx", () => {
              route("", "routes/main/home/route.tsx", { index: true, id: "Home" });
              route("orders", "routes/main/orders/route.tsx", { id: "Order" });

              route("orders/add", "routes/main/orders/add/route.tsx", { id: "Order-Add" });
              route("products/add", "routes/main/products/add/route.tsx", { id: "Product-Add" });
              route("products/:id", "routes/main/products/edit/route.tsx", { id: "Product-Edit" });
              route("products", "routes/main/products/route.tsx", { id: "Product" });

              route("categories/add", "routes/main/categories/add/route.tsx", { id: "Category-Add" });
              route("categories/:id", "routes/main/categories/edit/route.tsx", { id: "Category-Edit" });
              route("categories", "routes/main/categories/route.tsx", { id: "Categories" });
            
              route("units/add", "routes/main/units/add/route.tsx", { id: "Unit-Add" });
              route("units/:id", "routes/main/units/edit/route.tsx", { id: "Unit-Edit" });
              route("units", "routes/main/units/route.tsx", { id: "Unit" });

              route("tags/add", "routes/main/tags/add/route.tsx", { id: "Tag-Add" });
              route("tags/:id", "routes/main/tags/edit/route.tsx", { id: "Tag-Edit" });
              route("tags", "routes/main/tags/route.tsx", { id: "Tag" });

              route("import-order/add", "routes/main/import-order/add/route.tsx", { id: "ImportOrder-Add" });
              route("import-order/:id", "routes/main/import-order/$id/route.tsx", { id: "ImportOrder-Edit" });
              route("import-order", "routes/main/import-order/route.tsx", { id: "ImportOrder" });

              route("warehouses/add", "routes/main/warehouses/add/route.tsx", { id: "WareHouses-Add" });
              route("warehouses/:id", "routes/main/warehouses/$id/route.tsx", { id: "WareHouses-Edit" });
              route("warehouses", "routes/main/warehouses/route.tsx", { id: "WareHouses" });

              route("providers/add", "routes/main/providers/add/route.tsx", { id: "Provider-Add" })
              route("providers/:id", "routes/main/providers/$id/route.tsx", { id: "Providers-Edit" });
              route("providers", "routes/main/providers/route.tsx", { id: "Providers" });
              
              route("financial/add", "routes/main/financial/add/route.tsx", { id: "financial-Add" })
              route("financial/:id", "routes/main/financial/$id/route.tsx", { id: "financial-Edit" });
              route("financial", "routes/main/financial/route.tsx", { id: "financial" });

              route("setting", "routes/main/setting/route.tsx", { id: "setting" });
            });
            route("/api/auth", "routes/api/auth/route.ts", { id: "Auth-API" });
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
    server: {
      port: 3000,
    },
  };
});
