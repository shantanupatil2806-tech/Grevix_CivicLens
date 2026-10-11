import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// https://vite.dev/config/
function offlineShellPlugin(): Plugin {
  let outputDir = '';
  let precacheUrls: string[] = [];

  return {
    name: 'civiclens-offline-shell',
    apply: 'build',
    configResolved(config) {
      outputDir = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((fileName) => fileName !== 'sw.js' && !fileName.endsWith('.map'));
      precacheUrls = [...new Set(['/', '/index.html', ...files.map((fileName) => `/${fileName}`)])];
    },
    async closeBundle() {
      const serviceWorkerPath = resolve(outputDir, 'sw.js');
      const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
      const builtServiceWorker = serviceWorker
        .replace('__CIVICLENS_CACHE_NAME__', `civiclens-shell-${Date.now()}`)
        .replace('__CIVICLENS_PRECACHE_URLS__', JSON.stringify(precacheUrls));
      await writeFile(serviceWorkerPath, builtServiceWorker, 'utf8');
    }
  };
}

export default defineConfig({
  plugins: [react(), offlineShellPlugin()],
})
