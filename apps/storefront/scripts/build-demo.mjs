// Builds the clickable preview: the whole storefront with sample data and the
// look switcher, folded into one HTML file that opens with no server.
// Usage: npm run build:demo  ->  dist-demo/vikipat-demo.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'dist-demo');

process.env.VITE_DEMO = '1';
process.env.VITE_API_URL = 'https://demo.invalid/api';
await build({ root, logLevel: 'warn', build: { outDir, emptyOutDir: true } });

const read = (href) => fs.readFileSync(path.join(outDir, href.replace(/^\.\//, '')));
let html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+\.css)"[^>]*>/g, (_, href) => `<style>\n${read(href)}\n</style>`);
html = html.replace(/<script type="module"[^>]*src="(\.\/assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, href) => {
  // A literal "</script" inside the bundle would end the inline tag early.
  const js = read(href).toString().replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});
html = html.replace(/<link rel="modulepreload"[^>]*>\n?/g, '');
html = html.replace(/href="\.\/((?:favicon|apple-touch-icon)\.png)"/g, (_, file) => `href="data:image/png;base64,${read(file).toString('base64')}"`);

const leftovers = html.match(/(?:src|href)="\.\/[^"]+"/g);
if (leftovers) throw new Error(`The demo still points at separate files: ${leftovers.join(', ')}`);

const out = path.join(outDir, 'vikipat-demo.html');
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
