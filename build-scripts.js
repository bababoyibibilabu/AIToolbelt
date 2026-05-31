import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log('Building background service worker (IIFE)...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/background/service_worker.js'),
        formats: ['iife'],
        name: 'background',
        fileName: () => 'background.js',
      },
    },
  });

  console.log('Building content script (IIFE)...');
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/content/content.js'),
        formats: ['iife'],
        name: 'content',
        fileName: () => 'content.js',
      },
    },
  });
  console.log('Scripts build completed successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
