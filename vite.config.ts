import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { fs: { deny: ['.env', '.env.*', '**/.git/**', '**/data/reference/**'] } } });
