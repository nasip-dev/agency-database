import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Нативный модуль SQLite и exceljs (работает с fs/потоками) не бандлим
  serverExternalPackages: ["better-sqlite3", "exceljs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
