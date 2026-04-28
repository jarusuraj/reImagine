
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },

    define: {
      "import.meta.env.TMT_API_URL":    JSON.stringify(env.TMT_API_URL    ?? ""),
      "import.meta.env.TMT_API_KEY":    JSON.stringify(env.TMT_API_KEY    ?? ""),

      
      "import.meta.env.APP_TITLE":    JSON.stringify(env.APP_TITLE    ?? "reImagine"),
      "import.meta.env.APP_SUBTITLE": JSON.stringify(env.APP_SUBTITLE ?? "Translation Engine"),
      "import.meta.env.APP_FOOTER":   JSON.stringify(env.APP_FOOTER   ?? "reImagine · 2026"),
    },

    build: {
      outDir:      "dist",
      emptyOutDir: true,
      sourcemap:   false,
      rollupOptions: {
        input: {
          main:       path.resolve(__dirname, "index.html"),
          background: path.resolve(__dirname, "src/background.ts"),
          content:    path.resolve(__dirname, "src/content.ts"),
        },
        output: {
          entryFileNames: (chunk) =>
            ["background", "content"].includes(chunk.name)
              ? "[name].js"
              : "assets/[name]-[hash].js",
          chunkFileNames:  "assets/[name]-[hash].js",
          assetFileNames:  "assets/[name]-[hash][extname]", 
        },
      },
    },
    test: {
      environment: "jsdom",
      env: {
        TMT_API_URL: env.TMT_API_URL,
        TMT_API_KEY: env.TMT_API_KEY
      }
    }
  };
});
// Configuration file for the Vite build tool and extension packaging.
