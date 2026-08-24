import { resolve } from 'path';
import { defineConfig } from 'vite';

// 多页面静态站点：模拟多个互相链接的“假网站”
const pages = {
  index: resolve(__dirname, 'index.html'),
  forum: resolve(__dirname, 'forum.html'),
  archive: resolve(__dirname, 'archive.html'),
  missing: resolve(__dirname, 'missing.html'),
  gallery: resolve(__dirname, 'gallery.html'),
  guestbook: resolve(__dirname, 'guestbook.html'),
  night: resolve(__dirname, 'night.html'),
  '404': resolve(__dirname, '404.html')
};

export default defineConfig({
  build: {
    rollupOptions: {
      input: pages
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
