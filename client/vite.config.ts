import { vitePlugin as remix } from "@remix-run/dev";
import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { flatRoutes } from "remix-flat-routes";
import tailwindcss from "@tailwindcss/vite";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}
function autoContextPlugin() {
  return {
    name: "auto-context-injector",
    transform(code: string, id: string) {
      // Chỉ can thiệp vào các file route trong Remix và khi build cho Server
      if (id.includes("app/routes/") && (id.endsWith(".tsx") || id.endsWith(".ts"))) {
        let newCode = code;
        const hasLoader = code.includes("export async function loader");
        const hasAction = code.includes("export async function action");

        if (hasLoader || hasAction) {
          // Inject hàm bọc vào đầu file
          newCode = `import { autoWrapContext } from "~/action.server/context.server";\n` + newCode;

          if (hasLoader) {
            // Thay thế export loader mặc định bằng loader đã bọc
            newCode = newCode.replace(/export\s+async\s+function\s+loader\b/g, "async function _originalLoader");
            newCode += `\nexport const loader = autoWrapContext(_originalLoader);`;
          }

          if (hasAction) {
            // Thay thế export action mặc định bằng action đã bọc
            newCode = newCode.replace(/export\s+async\s+function\s+action\b/g, "async function _originalAction");
            newCode += `\nexport const action = autoWrapContext(_originalAction);`;
          }
        }
        return { code: newCode, map: null };
      }
    },
  };
}
function autoImportTailwindToScss() {
  return {
    name: "auto-import-tailwind-to-scss",
    enforce: "pre", // Chạy TRƯỚC KHI các bộ tiền xử lý (Sass-loader) hoạt động
    transform(code: string, id: string) {
      // Kiểm tra nếu file là .scss hoặc .module.scss
      if (id.endsWith(".scss") || id.endsWith(".module.scss")) {
        // Chèn đoạn mã reference của Tailwind v4 vào đầu file
        const targetCssPath = path.resolve(__dirname, "./app/assets/styles/tailwind.css");

        // 2. Tính toán đường dẫn tương đối chính xác từ file SCSS hiện tại (id) đến file tailwind.css
        const currentFileDir = path.dirname(id);
        let relativePath = path.relative(currentFileDir, targetCssPath);

        // Định dạng lại đường dẫn chuẩn cho môi trường Windows (thay \ bằng /)
        relativePath = relativePath.replace(/\\/g, "/");

        // Đảm bảo đường dẫn bắt đầu bằng ./ nếu ở cùng cấp hoặc cấp con
        if (!relativePath.startsWith(".")) {
          relativePath = "./" + relativePath;
        }

        // 3. Tiến hành chèn mã với đường dẫn đã được tính toán tự động
        return {
          code: `@reference "${relativePath}";\n${code}`,
          map: null,
        };
      }
      return null;
    },
  } as const;
}

export default defineConfig(({}) => {
  return {
    plugins: [
      autoContextPlugin(),
      autoImportTailwindToScss(),
      tailwindcss(),
      remix({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
          v3_lazyRouteDiscovery: true,
        },
        routes(defineRoutes) {
          return flatRoutes("routes", defineRoutes, {
            ignoredRouteFiles: ["**/.*"], // Ignore dot files (like .DS_Store)
            //appDir: 'app',
            //routeDir: 'routes',
            //basePath: '/',
            paramPrefixChar: "$",
            nestedDirectoryChar: "+",
            // routeRegex: /((\${nestedDirectoryChar}[\/\\][^\/\\:?*]+)|[\/\\]((index|route|layout|page)|(_[^\/\\:?*]+)|([^\/\\:?*]+\.route)))\.(ts|tsx|js|jsx|md|mdx)$$/,
          });
        },
        // routes: async (definedRoutes) => {
        //   return definedRoutes((route) => {
        //     route("/", "routes/auth/layout.tsx", () => {
        //       route("login", "routes/auth/login/route.tsx", { index: true, id: "Login" });
        //       route("register", "routes/auth/register/route.tsx", { id: "Register" });
        //     });

        //     route("", "routes/main/layout.tsx", () => {
        //       route("", "routes/main/home/route.tsx", { index: true, id: "Home" });
        //       route("orders", "routes/main/orders/route.tsx", { id: "Order" });

        //       route("orders/add", "routes/main/orders/add/route.tsx", { id: "Order-Add" });
        //       route("products/add", "routes/main/products/add/route.tsx", { id: "Product-Add" });
        //       route("products/:id", "routes/main/products/edit/route.tsx", { id: "Product-Edit" });
        //       route("products", "routes/main/products/route.tsx", { id: "Product" });

        //       route("categories/add", "routes/main/categories/add/route.tsx", { id: "Category-Add" });
        //       route("categories/:id", "routes/main/categories/edit/route.tsx", { id: "Category-Edit" });
        //       route("categories", "routes/main/categories/route.tsx", { id: "Categories" });

        //       route("units/add", "routes/main/units/add/route.tsx", { id: "Unit-Add" });
        //       route("units/:id", "routes/main/units/edit/route.tsx", { id: "Unit-Edit" });
        //       route("units", "routes/main/units/route.tsx", { id: "Unit" });

        //       route("tags/add", "routes/main/tags/add/route.tsx", { id: "Tag-Add" });
        //       route("tags/:id", "routes/main/tags/edit/route.tsx", { id: "Tag-Edit" });
        //       route("tags", "routes/main/tags/route.tsx", { id: "Tag" });

        //       route("import-order/add", "routes/main/import-order/add/route.tsx", { id: "ImportOrder-Add" });
        //       route("import-order/:id", "routes/main/import-order/$id/route.tsx", { id: "ImportOrder-Edit" });
        //       route("import-order", "routes/main/import-order/route.tsx", { id: "ImportOrder" });

        //       route("warehouses/add", "routes/main/warehouses/add/route.tsx", { id: "WareHouses-Add" });
        //       route("warehouses/:id", "routes/main/warehouses/$id/route.tsx", { id: "WareHouses-Edit" });
        //       route("warehouses", "routes/main/warehouses/route.tsx", { id: "WareHouses" });

        //       route("providers/add", "routes/main/providers/add/route.tsx", { id: "Provider-Add" });
        //       route("providers/:id", "routes/main/providers/$id/route.tsx", { id: "Providers-Edit" });
        //       route("providers", "routes/main/providers/route.tsx", { id: "Providers" });

        //       route("financial/add", "routes/main/financial/add/route.tsx", { id: "financial-Add" });
        //       route("financial/:id", "routes/main/financial/$id/route.tsx", { id: "financial-Edit" });
        //       route("financial", "routes/main/financial/route.tsx", { id: "financial" });

        //       route("setting", "routes/main/setting/route.tsx", { id: "setting" });
        //     });
        //     route("/api/auth", "routes/api/auth/route.ts", { id: "Auth-API" });
        //   });
        // },
      }),
      tsconfigPaths(),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern",
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    server: {
      port: 3333,
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "app"),
      },
    },
  };
});
