import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En build (producción) usa la subruta del repo
  base: command === "build" ? "/pokedex-app-daci/" : "/",
}));
