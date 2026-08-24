# HolyShit.app — Next Session Briefing
*Updated after the OpenStreetMap rebuild — August 2026*

---

## Current Status

- Live at holyshit.app
- **Toilets now come live from OpenStreetMap** — the whole world, not just Australia
- No bundled dataset. The app queries the Overpass API for whatever part of
  the map you're looking at, then caches it for the session
- Map tiles: OpenFreeMap (OSM vector styles, keyless)
- Routing: FOSSGIS OSRM at routing.openstreetmap.de (keyless)
- 5-button bottom nav: 💩 Near Me | ♿ Accessible | 🚼 Baby | 🆓 Free | 🕐 24/7
- Map type FAB + travel mode FAB + Locate FAB stacked on the right
- Splash screen with tap-to-start (fixes iOS location permission)
- Auto-start when coming from landing page (no double tap)
- Opens centred on the user; no GPS = world view + prompt to enable location

### Files currently deployed:
- `app.html` — main app (all OSM logic lives here)
- `index.html` — landing page
- `privacy.html` / `terms.html` — legal, updated for the OSM switch
- `sw.js` — service worker v4 (app shell + versioned CDN assets only)

### How the data layer works
- The world is diced into a 0.05° grid (≈5.5 km cells). Each cell is fetched
  from Overpass at most once per session; `loadedCells` remembers which.
- Requests are serialised and rate-limited (1.2 s apart) so panning fast can't
  hammer the public Overpass servers.
- Three Overpass mirrors are tried in order; the app sticks with whichever
  answers. A failed area is *not* marked loaded, so it retries later.
- Below zoom 11 nothing is fetched — the viewport is too big to be useful.
- The last ~2,500 records seen are kept in localStorage for a week, purely so
  something shows up when Overpass is unreachable.
- Query: `amenity=toilets` on nodes, ways and relations.

### Tags surfaced on the card
`wheelchair`, `changing_table`, `fee` / `charge`, `opening_hours`, `access`,
`unisex`, `shower`, `drinking_water` — plus a link to edit the listing on
openstreetmap.org.

---

## Priority 1 — Widen what counts as a toilet

Right now the app only asks OSM for `amenity=toilets`. The obvious next step is
a second query for venues that *have* a toilet but aren't one:

```
node["toilets"="yes"](bbox);
node["amenity"~"fuel|fast_food|cafe"]["toilets"="yes"](bbox);
```

Apply the stranger rule: **if a stranger can walk in without showing a card or
paying first — it's in.** Tag those results as daytime-only (☀️) and put them
behind a nav toggle so the core map stays clean.

Worth doing at the same time: OSM's `opening_hours` is already on the card, so
a night mode (below) can filter on it rather than guessing.

---

## Priority 2 — Night Mode

**Logic:** Device clock, automatic, no user input.

- **6am–10pm:** Show everything, ☀️ on daytime venues
- **10pm–6am:** Night mode — only 24hr dedicated public toilets

**Toast when opening in night mode:**
> "🌙 Night mode — only showing 24hr public facilities"

---

## Priority 3 — Location Status Icons

- ☀️ = Daytime only
- 🚫 = Not reliably accessible  
- No icon = Always open

---

## Priority 4 — Analytics Dashboard

Anonymous, no cookies:
- User region
- Markers tapped
- Device type
- Session length
- Near Me usage

**Stack:** Netlify Analytics (free) + Supabase (already have for Say G'day)
**Goal:** 10,000 MAU to show Garmin/Strava

---

## Priority 5 — Monetisation (low urgency)

- "Buy us a coffee ☕" tip jar (Ko-fi or Buy Me a Coffee)
  - Copy: "💩 Saved your run? Buy us a coffee ☕"
- Longer term: Garmin/Strava pitch with real numbers
- Portfolio play: sell whole UPD8 portfolio

---

## UPD8 App Engine — The Bigger Picture

HolyShit is the engine. Every other app = reskin:
- Same map, FABs, nav, GPS, directions, street view, reporting
- Swap dataset + pin colour + brand

**Portfolio:** DogBowl, BabyChange, WattNow, LittleLibrary, 3AMFood, PublicBBQ

**whilecharging.app** — Register this domain ASAP!
Find toilets/food/coffee while your EV charges. Captive 20-30 min audience.
Works for ferries, airports, waiting rooms too.

---

## Known Issues / Watch List
- `netlify.toml` causes pin rendering issues — left out for now
- No Supabase yet — Report button uses Netlify Forms only
- Leaderboard, Settings, Share Run = SOON badges, not built yet
- Route planner + run tracker in codebase but no nav trigger (intentional)

---

## Bugs Fixed This Session
1. Orphaned JS before DOCTYPE — broke Samsung Internet
2. Infinite recursion in setMode() — crashed on mode tap
3. startCenter out of scope in loadData() — allLoos always empty (Bren's bug!)
4. cycleMapType() vs cycleMapMode() mismatch — map type FAB did nothing
5. cycleMapMode() referenced missing DOM elements
6. Race condition: auto-start before Google Maps loaded on iOS
7. findNearest() silent when data empty
8. updateTravelModeLabel() referenced missing nav elements
9. Mode buttons not highlighted on load
10. Toast overflow on small screens
11. State data reloaded every GPS tick — now cached
12. No cross-border data reload — now auto-detects
