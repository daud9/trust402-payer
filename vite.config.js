import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  build: {
    minify: false,
    sourcemap: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
});