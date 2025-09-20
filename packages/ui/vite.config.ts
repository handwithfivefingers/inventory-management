import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
// declare global {
//   const __dirname: string;
// }
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "TMUI",
      fileName: (format) => `tmui.${format}.js`,
      formats: ["es", "cjs", "umd", "iife"],
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },
  resolve: {
    alias: [
      {
        find: "~/",
        replacement: resolve(__dirname, "./src") + "/",
      },
    ],
    extensions: [".mdx", ".mjs", ".js", ".ts", ".tsx", ".jsx"],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import '/src/assets/global.css';
        `,
      },
    },
  },
});
