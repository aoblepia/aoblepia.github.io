import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/powerhour/',   // <-- critical for GitHub Pages
  plugins: [react()],
});