/* Rewrite the ?v=<hash> on every asset link so it matches the file on disk.
 *
 *   node tools/rehash.js
 *
 * Run this after editing anything under assets/css or assets/js, and before
 * committing. It is safe to run at any time: when nothing has changed it
 * rewrites nothing.
 *
 * Why it matters
 * --------------
 * GitHub Pages serves our HTML with a short cache life but assets with a long
 * one — roughly ten minutes against sixteen days. The ?v= value is the only
 * thing that tells a returning visitor's browser to fetch a new stylesheet or
 * script. Ship an edit without updating it and those visitors keep running the
 * old copy for a fortnight while the HTML around it moves on. That has already
 * caused one live breakage here, when image paths changed but browsers held an
 * old projects.js.
 *
 * The hash is the first 8 characters of the file's MD5 — content, not a date,
 * so an unchanged file keeps its URL and stays cached.
 *
 * The script also verifies after writing and reports anything still stale, so
 * a silent no-op (a typo in a path, say) shows up instead of looking like
 * success.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.argv[2] || path.join(__dirname, '..');
/* group 1: the asset path, group 2: the hash currently written in the page */
const LINK = /(assets\/(?:css|js)\/[A-Za-z0-9.\-_]+)\?v=([0-9a-f]{8})/g;

const hash = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8);

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
if (!pages.length) {
  console.error('no .html files in ' + root + ' — run this from the repository root');
  process.exit(1);
}

let missing = 0, updated = 0, rewritten = 0;

pages.forEach(page => {
  const file = path.join(root, page);
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(LINK, (match, asset) => {
    const onDisk = path.join(root, asset);
    if (!fs.existsSync(onDisk)) {
      console.log('  missing asset: ' + asset + ' (linked from ' + page + ')');
      missing++;
      return match;
    }
    const fresh = asset + '?v=' + hash(onDisk);
    if (fresh !== match) updated++;
    return fresh;
  });
  if (out !== src) {
    fs.writeFileSync(file, out);
    rewritten++;
  }
});

console.log('pages scanned ' + pages.length + ' | rewritten ' + rewritten + ' | links updated ' + updated);

/* Verify, so a regex that quietly matched nothing cannot pass for success. */
let stale = 0;
pages.forEach(page => {
  const src = fs.readFileSync(path.join(root, page), 'utf8');
  for (const m of src.matchAll(LINK)) {
    const onDisk = path.join(root, m[1]);
    if (fs.existsSync(onDisk) && hash(onDisk) !== m[2]) {
      console.log('  STALE ' + page + ' -> ' + m[1]);
      stale++;
    }
  }
});

console.log('stale links remaining: ' + stale + (missing ? ' | missing assets: ' + missing : ''));
process.exit(stale || missing ? 1 : 0);
