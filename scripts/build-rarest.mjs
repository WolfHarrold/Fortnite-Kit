// Build data/rarest.json from live fortnite-api.com data. Run by the GitHub Action every day.
//   node scripts/build-rarest.mjs
// No API key needed (cosmetics and shop are public endpoints).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFortniteApiCom } from '../src/sources/fortniteApiCom.js';
import { computeRarity } from '../src/rarity.js';

const out = fileURLToPath(new URL('../data/rarest.json', import.meta.url));
const api = createFortniteApiCom({ timeoutMs: 60000 });

const [all, shop] = await Promise.all([api.cosmeticsAll(), api.shop()]);
const result = computeRarity(all, shop, { now: new Date() });

if (!result.categories.length) {
  console.error('No categories built. Not writing the file.');
  process.exit(1);
}
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(`rarest.json: ${result.categories.length} categories, top12[0]=${result.top12[0]?.name} (${result.top12[0]?.daysAway} days), today=${result.today.length}`);
