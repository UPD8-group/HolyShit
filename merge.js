#!/usr/bin/env node
/**
 * merge.js
 * Merges chains.json into toilets-au.json.
 * Deduplicates: any chain entry within 30m of an existing entry is skipped.
 *
 * Usage:  node merge.js
 * Output: toilets-au.json (updated in place)
 */

const fs = require('fs');

const TOILETS_FILE = 'toilets-au.json';
const CHAINS_FILE  = 'chains.json';
const DEDUP_METRES = 30; // skip if within this distance of existing entry

function haversineM(la1, lo1, la2, lo2) {
  const R  = 6371000;
  const dL = (la2 - la1) * Math.PI / 180;
  const dO = (lo2 - lo1) * Math.PI / 180;
  const a  = Math.sin(dL/2)**2
            + Math.cos(la1*Math.PI/180) * Math.cos(la2*Math.PI/180) * Math.sin(dO/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const toilets = JSON.parse(fs.readFileSync(TOILETS_FILE, 'utf8'));
const chains  = JSON.parse(fs.readFileSync(CHAINS_FILE,  'utf8'));

console.log(`Existing entries: ${toilets.length}`);
console.log(`Chain entries:    ${chains.length}`);

let added = 0, skipped = 0;

for (const chain of chains) {
  // Check if there's already an entry very close to this one
  const duplicate = toilets.some(t =>
    haversineM(t.lat, t.lon, chain.lat, chain.lon) < DEDUP_METRES
  );
  if (duplicate) { skipped++; continue; }
  toilets.push(chain);
  added++;
}

console.log(`\nAdded:   ${added}`);
console.log(`Skipped: ${skipped} (too close to existing entry)`);
console.log(`Total:   ${toilets.length}`);

fs.writeFileSync(TOILETS_FILE, JSON.stringify(toilets));
console.log(`\n✅ ${TOILETS_FILE} updated`);
