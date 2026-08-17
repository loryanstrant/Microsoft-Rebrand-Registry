import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('.deploy-package');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const pages = ['index.html', 'analysis.html'];
await Promise.all([
  ...pages.map(page => cp(page, path.join(output, page))),
  cp('staticwebapp.config.json', path.join(output, 'staticwebapp.config.json')),
  cp('src', path.join(output, 'src'), { recursive: true })
]);

const pageContents = await Promise.all(pages.map(page => readFile(path.join(output, page), 'utf8')));
const data = JSON.parse(await readFile(path.join(output, 'src/data/products.json'), 'utf8'));
const referencedAssets = new Set([
  ...pageContents.flatMap(page => [...page.matchAll(/(?:src|href)="(src\/[^"?#]+)"/g)].map(([, asset]) => asset)),
  ...data.products.map(product => product.logo.src)
]);

const missing = [];
for (const asset of referencedAssets) {
  try {
    if (!(await stat(path.join(output, asset))).isFile()) missing.push(asset);
  } catch {
    missing.push(asset);
  }
}

if (missing.length) {
  throw new Error(`Deployment package is missing referenced assets: ${missing.join(', ')}`);
}

console.log(`● Packaged the app with ${referencedAssets.size} referenced assets.`);
