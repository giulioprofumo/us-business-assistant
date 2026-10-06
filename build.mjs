import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = join(root, 'dist');
try {
  const raw = await readFile(join(root, '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}
await mkdir(out, { recursive: true });
for (const file of ['index.html', 'how-it-works.html', 'chat.html', 'styles.css', 'app.js', 'favicon.svg']) {
  await cp(join(root, file), join(out, file));
}
console.log(`Built static site in ${out}`);
