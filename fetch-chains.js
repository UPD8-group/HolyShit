#!/usr/bin/env node
/**
 * fetch-chains.js
 * Fetches Australian chain store / venue locations from OpenStreetMap via Overpass API.
 * Outputs chains.json in HolyShit.app format: { lat, lon, n, a, e, c }
 *
 * Usage:  node fetch-chains.js
 * Then:   node merge.js   (merges chains.json into toilets-au.json)
 *
 * Requires no npm packages — uses Node built-in https.
 * Run from your repo root.
 */

const https = require('https');
const fs    = require('fs');

// Australia bounding box
const BBOX = '-44,112,-10,154';

// Chains to fetch — each gets its own Overpass query
// name_regex: case-insensitive regex matched against OSM name tag
// tags: OSM tags to narrow the search (amenity, shop etc)
// emoji + cat: how it appears in the HolyShit card
const CHAINS = [
  {
    label: "McDonald's",
    query: `node["amenity"="fast_food"]["name"~"McDonald",i](${BBOX});way["amenity"="fast_food"]["name"~"McDonald",i](${BBOX});`,
    emoji: '🍔', cat: 'fast_food'
  },
  {
    label: 'KFC',
    query: `node["amenity"="fast_food"]["name"~"KFC|Kentucky Fried",i](${BBOX});way["amenity"="fast_food"]["name"~"KFC|Kentucky Fried",i](${BBOX});`,
    emoji: '🍗', cat: 'fast_food'
  },
  {
    label: 'Hungry Jack\'s',
    query: `node["amenity"="fast_food"]["name"~"Hungry Jack",i](${BBOX});way["amenity"="fast_food"]["name"~"Hungry Jack",i](${BBOX});`,
    emoji: '🍔', cat: 'fast_food'
  },
  {
    label: 'Subway',
    query: `node["amenity"="fast_food"]["name"~"^Subway$",i](${BBOX});way["amenity"="fast_food"]["name"~"^Subway$",i](${BBOX});`,
    emoji: '🥖', cat: 'fast_food'
  },
  {
    label: 'Oporto',
    query: `node["amenity"="fast_food"]["name"~"Oporto",i](${BBOX});way["amenity"="fast_food"]["name"~"Oporto",i](${BBOX});`,
    emoji: '🍗', cat: 'fast_food'
  },
  {
    label: 'Guzman y Gomez',
    query: `node["amenity"="fast_food"]["name"~"Guzman",i](${BBOX});way["amenity"="fast_food"]["name"~"Guzman",i](${BBOX});`,
    emoji: '🌮', cat: 'fast_food'
  },
  {
    label: 'Domino\'s',
    query: `node["amenity"="fast_food"]["name"~"Domino",i](${BBOX});way["amenity"="fast_food"]["name"~"Domino",i](${BBOX});`,
    emoji: '🍕', cat: 'fast_food'
  },
  {
    label: 'Bunnings',
    query: `node["shop"~"doityourself|hardware"]["name"~"Bunnings",i](${BBOX});way["shop"~"doityourself|hardware"]["name"~"Bunnings",i](${BBOX});`,
    emoji: '🔨', cat: 'hardware'
  },
  {
    label: 'Woolworths',
    query: `node["shop"="supermarket"]["name"~"^Woolworths$",i](${BBOX});way["shop"="supermarket"]["name"~"^Woolworths$",i](${BBOX});`,
    emoji: '🛒', cat: 'supermarket'
  },
  {
    label: 'Coles',
    query: `node["shop"="supermarket"]["name"~"^Coles$",i](${BBOX});way["shop"="supermarket"]["name"~"^Coles$",i](${BBOX});`,
    emoji: '🛒', cat: 'supermarket'
  },
  {
    label: 'Westfield',
    query: `node["shop"="mall"]["name"~"Westfield",i](${BBOX});way["shop"="mall"]["name"~"Westfield",i](${BBOX});relation["shop"="mall"]["name"~"Westfield",i](${BBOX});`,
    emoji: '🛍️', cat: 'shopping_centre'
  },
  {
    label: 'Ampol / Caltex',
    query: `node["amenity"="fuel"]["name"~"Ampol|Caltex",i](${BBOX});way["amenity"="fuel"]["name"~"Ampol|Caltex",i](${BBOX});`,
    emoji: '⛽', cat: 'fuel'
  },
  {
    label: 'BP',
    query: `node["amenity"="fuel"]["name"~"^BP",i](${BBOX});way["amenity"="fuel"]["name"~"^BP",i](${BBOX});`,
    emoji: '⛽', cat: 'fuel'
  },
  {
    label: '7-Eleven',
    query: `node["shop"~"convenience|fuel"]["name"~"7.Eleven|7-Eleven",i](${BBOX});way["shop"~"convenience|fuel"]["name"~"7.Eleven|7-Eleven",i](${BBOX});`,
    emoji: '🏪', cat: 'convenience'
  },
];

function postOverpass(queryBody) {
  return new Promise((resolve, reject) => {
    const fullQuery = `[out:json][timeout:90];\n(\n${queryBody}\n);\nout center;`;
    const payload   = 'data=' + encodeURIComponent(fullQuery);

    const options = {
      hostname: 'overpass-api.de',
      path:     '/api/interpreter',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':     'HolyShit.app/1.0 (hello@holyshit.app)',
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('Bad JSON: ' + raw.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toRecord(el, chain) {
  const lat = el.lat   ?? el.center?.lat;
  const lon = el.lon   ?? el.center?.lon;
  if (!lat || !lon) return null;

  const addr = [
    el.tags?.['addr:housenumber'],
    el.tags?.['addr:street'],
    el.tags?.['addr:suburb'],
    el.tags?.['addr:state'],
  ].filter(Boolean).join(' ');

  return {
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
    n:   el.tags?.name || chain.label,
    a:   addr,
    e:   chain.emoji,
    c:   chain.cat,
  };
}

async function main() {
  const results = [];
  let totalErrors = 0;

  for (const chain of CHAINS) {
    process.stdout.write(`  Fetching ${chain.label.padEnd(20)}`);
    try {
      const data     = await postOverpass(chain.query);
      const elements = data.elements ?? [];
      const records  = elements.map(el => toRecord(el, chain)).filter(Boolean);
      results.push(...records);
      console.log(`${records.length} locations`);
    } catch(e) {
      console.log(`ERROR — ${e.message}`);
      totalErrors++;
    }
    // Polite delay between queries
    await sleep(2000);
  }

  console.log(`\n✅ Total: ${results.length} chain locations`);
  if (totalErrors) console.log(`⚠️  ${totalErrors} chains failed — re-run to retry`);

  fs.writeFileSync('chains.json', JSON.stringify(results, null, 2));
  console.log('📄 Written to chains.json');
}

main().catch(err => { console.error(err); process.exit(1); });
