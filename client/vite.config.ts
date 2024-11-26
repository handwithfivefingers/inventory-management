import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
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
});
