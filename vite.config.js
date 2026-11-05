import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'offline-scoreboard',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = [
        './',
        ...Object.keys(bundle).map(file => `./${file}`),
        './icon.svg',
        './manifest.webmanifest',
      ];
      const template = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
      const hash = createHash('sha256')
        .update(template)
        .update(JSON.stringify(files))
        .update(readFileSync(new URL('./public/icon.svg', import.meta.url)))
        .update(readFileSync(new URL('./public/manifest.webmanifest', import.meta.url)));
      for (const file of Object.values(bundle)) {
        hash.update(file.type === 'asset' ? file.source : file.code);
      }
      const version = hash.digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__CACHE_NAME__', JSON.stringify(`courtside-${version}`))
          .replace('__PRECACHE_FILES__', JSON.stringify(files)),
      });
    },
  }],
});
