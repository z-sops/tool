import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Port isolation: never assume a common development port is free on this
// machine. LISTINGAI_DEV_PORT / PORT allow an isolated port to be selected.
const port = Number(process.env.LISTINGAI_DEV_PORT || process.env.PORT || 3000);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    hmr: {
      port,
    },
  },
});
