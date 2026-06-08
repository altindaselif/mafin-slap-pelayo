# 👋 #MAFIN — Slap Pelayo Olivares

> _7.500.000+ slaps from fans across the world._  
> A fan interaction page for the _Sueños de Libertad_ fandom — complete with a global country leaderboard, a ghost companion, Mafin quote unlocks, and zero paid promotion.

---

## 🔗 Links

- **Live Site:** [View Live Demo](https://mafinslappelayo.netlify.app/)
- **Code:** [View GitHub Repository](https://github.com/altindaselif/30-mafin-slap-pelayo)

---

## 📸 Screenshots

- [View Desktop Version](./desktop-screenshot.png)
- [View Mobile Version](./mobile-screenshot.png)

---

## 🎭 What Is This?

A fan-made page where _Sueños de Libertad_ viewers can slap the fictional villain Pelayo Olivares. Each click is counted, attributed to the user's country, and aggregated into a live global leaderboard. The page crossed **7.5 million slaps** through organic fandom sharing across Spain, Latin America, and Brazil — in three languages.

---

## 💡 Key Features

- **🌍 Live Country Leaderboard:** Every slap is attributed to the user's country and synced to Firebase in real-time. A paginated top-5 leaderboard (flippable with a 3D CSS card flip) shows which country is slapping the hardest, complete with flag emojis rendered via Unicode code points and country names localized using the `Intl.DisplayNames` API.
- **🥇 Winner Celebration:** On first data load, the current #1 country is announced with a confetti burst (canvas-confetti) and a localized congratulations overlay.
- **👻 Fina's Ghost Tracker:** A progress bar counts down from 100. At 50 slaps the ghost peeks in with an encouraging bubble; at 100 it animates across the screen via a CSS keyframe `flyToVideo` anchored with `getBoundingClientRect()` — so it lands precisely on the video regardless of viewport size.
- **💬 Mafin Quote Unlocks:** Starting at 150 slaps, a new Mafin quote (shuffled on load) appears in the ghost's speech bubble every 50 slaps. Each quote has a Play button that opens a video modal with the matching scene. At exactly 500 slaps, a special Marta VIP quote triggers — and launches a flying heart explosion across the screen.
- **📍 Geolocation with Fallback Chain:** Country detection runs through four independent APIs (Cloudflare trace, ipapi.co, country.is, freeipapi.com) in sequence, stopping at the first successful response. While detection is in progress, slaps are queued in `pendingSlaps` and flushed to Firebase the moment the country resolves. The result is cached in `localStorage` so subsequent visits skip the chain entirely.
- **🌐 Three-Language i18n (ES / EN / PT):** Full Spanish, English, and Portuguese support via `data-i18n` attributes and a `translations` object. Leaderboard country names re-render on language switch using the same `Intl.DisplayNames` locale as the selected language.
- **🔒 Bot Protection:** Clicks are rate-limited to 100ms intervals, `e.isTrusted` is verified, and Firebase App Check with reCAPTCHA Enterprise guards all database writes.
- **♿ Accessibility:** `aria-label` on interactive controls, `type="button"` on all non-submit buttons, and `playsinline` on all video elements for iOS compatibility.

---

## 🛠️ Technical Implementation

### Geolocation Fallback Chain

Four geo APIs are tried in sequence inside a `for...of` loop with `try/catch`. Each returns a two-letter country code or throws; the loop breaks on the first valid response. Slaps that arrive before detection completes are buffered in `pendingSlaps` and written to Firebase as a single transaction once the country is known — so no clicks are lost even on slow connections.

### Per-Country Firebase Transactions

Each click fires `countrySlapsRef.child(userCountryCode).transaction(v => (v || 0) + 1)` in parallel with `globalSlapRef.transaction(v => (v || 0) + 1)`. Using transactions instead of `set()` means concurrent clicks from fans in the same country never overwrite each other — Firebase retries automatically until the write lands cleanly.

### CSS 3D Card Flip for the Leaderboard

The stats panel flips between the personal hit counter and the global leaderboard using CSS `transform-style: preserve-3d` and `rotateY(180deg)`. No JavaScript geometry — just a class toggle on the container and `backface-visibility: hidden` on each face.

### Ghost Flight with `getBoundingClientRect()`

At 100 slaps, the ghost element is detached from the flow, positioned absolutely using its current `getBoundingClientRect()` coordinates, and CSS custom properties `--target-x` / `--target-y` are set to the delta between its origin and the video element. The `flyToVideo` keyframe then animates `translate(var(--target-x), var(--target-y))`, guaranteeing a pixel-perfect landing on any screen size without hardcoded offsets.

### Quote Shuffle & Milestone Unlocks

`mafinQuotes` is shuffled in-place with Fisher-Yates on init, so each session reveals quotes in a different order. The milestone check is a single arithmetic expression: `(currentSlaps - QUOTE_START_AT) % QUOTE_INTERVAL === 0`. The 500-slap Marta quote bypasses the shuffle and triggers its own heart animation — 20 floating `❤️` elements spawned with staggered `setTimeout` offsets and removed after 2.5s.

### `Intl.DisplayNames` for Localized Country Names

Country names in the leaderboard are generated on the fly with `new Intl.DisplayNames([locale], { type: 'region' }).of(code)`, so they switch language instantly when the user changes locale — no translation JSON needed for country names.

---

## 🧰 Built With

- **Vanilla JavaScript (ES6+)**
- **CSS3** (Custom Properties, 3D Transforms, Keyframe Animations)
- **Firebase Realtime Database** — atomic per-country and global hit counters
- **Firebase App Check** (reCAPTCHA Enterprise) — bot protection
- **Firebase Analytics** — milestone event tracking
- **canvas-confetti** — winner celebration burst
- **Intl.DisplayNames API** — zero-dependency localized country names

---

## ✍️ Author

- **LinkedIn:** [Elif Altındaş](https://www.linkedin.com/in/elifaltindas/)
- **Frontend Mentor:** [@altindaselif](https://www.frontendmentor.io/profile/altindaselif)
- **GitHub:** [@altindaselif](https://github.com/altindaselif)

---

_Disclaimer: We have nothing but respect for Alejandro Albarracín. He is an amazing actor and seems to be a Mafin fan, just like us. We just really, really hate Pelayo Olivares._
