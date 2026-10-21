
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      allowedHosts: ['4f0b-181-86-112-70.ngrok-free.app'],
    },
  },
});
