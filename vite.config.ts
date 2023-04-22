import { defineConfig } from "vite";

export default defineConfig({
  // easier readability in the sandbox
  clearScreen: false,
  build: {
    outDir: './dist',
    emptyOutDir: true,
    minify: 'esbuild'
  }
});

