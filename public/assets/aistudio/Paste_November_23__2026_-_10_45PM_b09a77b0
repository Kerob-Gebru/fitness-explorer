# NAÏADE — Jewellery Camera-Move Storefront Rebuild Prompt

> One-shot prompt for an AI code generator (Claude Code, Cursor, v0, Bolt, etc.). Paste this entire file as a single prompt into an empty directory. It contains the exact, complete source of every file in the project — follow it literally and the result is pixel-for-pixel the original.

## What this project is

"NAÏADE — The Deep End" is a storefront for a fictional fine-jewellery house built as **one continuous camera move** on the scrollbar. It opens at night on a woman in black seated at the edge of a lit pool, Paraíba-blue stones at her ears, throat and hand. Scrolling cranes up to her face, then into a macro of the earring, down her neck to the pendant and down to the ring on her hand — and each time the camera lands on a piece, an ivory product card slides in from the side with its name, a specification table, a price and an add-to-bag button (`Undertow Drops`, `Deep End Pendant`, `Night Swim Ring`), while the film narrows to keep the jewel in view. Then the film rewinds fast to the wide shot, an ivory sheet with rounded shoulders rises over the last frame holding all three pieces and the set, and the page closes on a huge `NAÏADE` wordmark with a private-viewing form. A thin rail on the right ticks off each piece as the camera travels; a preloader holds on the wordmark until the film is ready; a slide-in bag drawer confirms every add. Type is Bodoni Moda over Albert Sans with Martian Mono labels; the palette is night water, ivory and Paraíba teal.

## How the page works — read this before touching any number

This is **one long pinned stage**, and three things are load-bearing:

- **One rAF loop runs the page.** `src/lib/scroll.ts` advances Lenis and then lets every scroll-driven component read its own position and write styles directly. Nothing goes through React state while scrolling, so the page never re-renders mid-scroll. Do not move any of it into `useState`, and do not add a second scroll or animation library.
- **The timeline is the page.** `src/lib/timeline.ts` lays out the whole camera move — hero, crane to the face, earring, pendant, ring, rewind — as windows of scroll progress, and the Stage reads them every frame to place the film, the cards and the rail. Change a window and every beat after it moves.
- **Cards and film share the screen on desktop.** When a card slides in from an edge, the Stage narrows the film so the jewel stays in view beside it; on phones the card comes up from the bottom instead.

Checks that must pass before you call it done: no sideways scroll at 390, 768, 1280 or 1920; each card arrives exactly as the camera settles on its piece; and the rewind lands on the wide shot before the closing sheet rises.

## Reproduce this exactly

The goal is a **byte-identical rebuild**, not an interpretation. Every file below is the real, final source of a shipped project. Write each one out verbatim.

- **Do not "improve" anything.** Not the copy, not the colour values, not the timing constants, not the breakpoints.
- **Do not substitute libraries or approaches.** The dependency list below is complete and exact.
- **Use the pinned versions in `package.json` as written** — do not run `npm install <pkg>@latest`.
- **Do not add files.** The complete file list is exactly what appears under **File:** below, plus the downloaded assets.
- **Keep every accessibility attribute** — `aria-label`, `aria-hidden`, `alt` text, and every reduced-motion branch.
- **Keep the comments.** They record why each number has the value it does.
- If a scaffolding tool generates boilerplate (`App.css`, the Vite SVG logos, a starter `App.tsx`, a `README.md`), **delete it** rather than merging it in.

## Tech stack (required — do not substitute)

- Vite 6 + React 19 + **TypeScript** (`npm run lint` is `tsc --noEmit`)
- `@vitejs/plugin-react` — the React plugin
- Tailwind CSS v4 via the **`@tailwindcss/vite`** plugin — there is **no** `tailwind.config.js`; colours, fonts and type scale are an `@theme` block in `src/index.css`.
- **Lenis** for smooth scrolling, advanced from the page's single rAF loop. There is **no** GSAP, no Motion and no animation library: every scroll beat is plain arithmetic on scroll progress.
- Fonts by `<link>` in `index.html` from Google Fonts: **Bodoni Moda** for display, **Albert Sans** for text and **Martian Mono** for labels. That host is built to be linked to; leave the link as it is.
- The dependency list in `package.json` below is complete and exact — do not add, remove, or substitute a package.

### package.json

```json
{
  "name": "naiade",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "lenis": "^1.3.11",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.4",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

## Assets — download them, do not hotlink

Every picture and film this page shows lives in `public/`, and none of it is in the code: 965 files, about 17MB. They ship as one archive; download and unpack it into `public/` as the **first build step**, so the files land under `public/frames/`, `public/media/`:

```bash
mkdir -p public
curl -L -o assets.zip "https://pub-1e5b4001b36b47e28e6a2fb775966a79.r2.dev/prompt-assets/naiade/assets.zip"
unzip -q assets.zip -d public/
rm assets.zip
```

**The download URL above must not appear anywhere in the project you generate** — not in `index.html`, not in a component, not in CSS, not in a config file. It is the template library's own storage, not a CDN licensed to serve your site's traffic. A page that hotlinks it breaks the moment the asset is moved, and it bills your visitors' bandwidth to someone else. Download it once, commit it with your project, and serve it from your own hosting like any other asset you own.

## Steps to build

1. Scaffold a new Vite React + TypeScript project named `naiade`, then delete every file the scaffolder generated under `src/` and `public/`.
2. Write `package.json` exactly as given above and install with it.
3. Download and unpack the assets as described in **Assets** above — do this before the first run, or the page shows nothing.
4. Write `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore` and everything under `src/` with the exact contents below, starting with `src/lib/` and `src/hooks/` — every component reads from them.
5. Re-read **How the page works** above before you touch a timing constant or a scroll window.
6. Run `npm run dev` and go through the page slowly from top to bottom, then run `npm run lint` and `npm run build`; both must be clean.

## File: `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#060809" />
    <title>NAÏADE — The Deep End</title>
    <meta
      name="description"
      content="NAÏADE fine jewellery: pear-cut Paraíba tourmaline in 18K white gold. The Deep End — earrings, pendant and ring."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Martian+Mono:wght@300;400&display=swap"
      rel="stylesheet"
    />
    <link rel="preload" as="image" href="/frames/d/c001.webp" fetchpriority="high" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## File: `package.json`

```json
{
  "name": "naiade",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "lenis": "^1.3.11",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.4",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

## File: `vite.config.ts`

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Frame sequence and loop video live in public/ and are served as-is.
    target: 'es2020',
  },
});
```

## File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

## File: `.gitignore`

```
node_modules
dist
```

## File: `src/main.tsx`

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// The pinned stages depend on scroll position; always start at the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## File: `src/App.tsx`

```tsx
import {useCallback, useEffect, useState} from 'react';
import {startScroll} from './lib/scroll';
import {useReducedMotion} from './hooks/useReducedMotion';
import {Nav} from './components/Nav';
import {Stage} from './components/Stage';
import {Closing} from './components/Closing';
import {Footer} from './components/Footer';
import {BagDrawer} from './components/BagDrawer';
import {Preloader} from './components/Preloader';

export default function App() {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const onProgress = useCallback((p: number) => setProgress((cur) => Math.max(cur, p)), []);

  useEffect(() => startScroll(reduced), [reduced]);

  return (
    <div id="top">
      <Preloader progress={progress} />
      <Nav />
      <main>
        <Stage onProgress={onProgress} />
        <Closing />
      </main>
      <Footer />
      <BagDrawer />
      <div className="grain" aria-hidden />
    </div>
  );
}
```

## File: `src/index.css`

```css
@import 'tailwindcss';

/* Colours sampled from the renders: the Paraíba stone, the aqua pool light,
   the bone of the product backdrop. Everything else stays near-black. */
@theme {
  --color-ink: #060809;
  --color-ink-2: #0d1112;
  --color-ink-3: #161b1d;
  --color-bone: #ece8e2;
  --color-bone-2: #e3ded7;
  --color-stone: #d6d1cb;
  --color-mist: #8d9696;
  --color-graphite: #2a2f31;
  --color-paraiba: #2bf0ee;
  --color-paraiba-deep: #07b9cf;
  --color-pool: #9ff2f6;

  --font-display: 'Bodoni Moda', 'Didot', 'Bodoni 72', serif;
  --font-sans: 'Albert Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Martian Mono', ui-monospace, monospace;

  --text-micro: 0.625rem;
  --text-micro--line-height: 1.5;
  --text-micro--letter-spacing: 0.14em;

  --ease-silk: cubic-bezier(0.2, 0.7, 0.1, 1);
  --ease-drawer: cubic-bezier(0.7, 0, 0.2, 1);
}

/* Lenis */
html.lenis,
html.lenis body {
  height: auto;
}
.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}
.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}
.lenis.lenis-stopped {
  overflow: hidden;
}

html {
  background: var(--color-ink);
  color: var(--color-bone);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
body {
  background: var(--color-ink);
  font-family: var(--font-sans);
  overflow-x: clip;
}
::selection {
  background: var(--color-paraiba);
  color: var(--color-ink);
}

/* Bodoni at display sizes: high optical size, tight, swashy italics. */
.display {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 96;
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 0.86;
}
.display em,
.display .it {
  font-style: italic;
  letter-spacing: -0.035em;
}
.label {
  font-family: var(--font-mono);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 300;
}

/* One-shot entrances */
[data-reveal] {
  opacity: 0;
  transform: translate3d(0, 28px, 0);
  filter: blur(8px);
  transition:
    opacity 1.1s var(--ease-silk),
    transform 1.1s var(--ease-silk),
    filter 1.1s var(--ease-silk);
  transition-delay: var(--d, 0ms);
}
[data-reveal].is-in {
  opacity: 1;
  transform: none;
  filter: blur(0);
}

/* Projected-film grain */
.grain {
  position: fixed;
  inset: -50%;
  z-index: 60;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  animation: grain 0.6s steps(3) infinite;
}
@keyframes grain {
  0% { transform: translate3d(0, 0, 0); }
  33% { transform: translate3d(-3%, 2%, 0); }
  66% { transform: translate3d(2%, -3%, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

/* Paraíba glint that sweeps across buttons and the wordmark */
@keyframes glint {
  0% { transform: translateX(-120%) skewX(-18deg); }
  60%, 100% { transform: translateX(320%) skewX(-18deg); }
}
.glint {
  position: relative;
  overflow: hidden;
}
.glint::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 35%;
  background: linear-gradient(90deg, transparent, rgb(43 240 238 / 0.35), transparent);
  transform: translateX(-120%) skewX(-18deg);
  pointer-events: none;
}
.glint:hover::after {
  animation: glint 1.2s var(--ease-silk);
}

@keyframes bump {
  0% { transform: scale(1); }
  35% { transform: scale(1.45); }
  100% { transform: scale(1); }
}
.bump {
  animation: bump 0.6s var(--ease-silk);
}

@keyframes loader-line {
  from { transform: scaleX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .grain { animation: none; }
  [data-reveal] { transition: none; opacity: 1; transform: none; filter: none; }
}
```

## File: `src/content.ts`

```ts
/**
 * All copy lives here. NAÏADE is a placeholder concept brand for this demo —
 * the pieces, prices and specs are invented.
 */

export const brand = {
  name: 'NAÏADE',
  collection: 'The Deep End',
  tagline: 'Fine jewellery for after hours',
};

export const nav = ['Collections', 'Atelier', 'The Deep End', 'Journal'];

export const hero = {
  // Headline lines: roman parts render as capitals, italic parts stay lower-case.
  headline: [
    [{t: 'Born', i: true}, {t: ' in'}],
    [{t: 'still water.'}],
    [{t: 'Worn '}, {t: 'after', i: true}, {t: ' dark.'}],
  ],
  line: 'Pear-cut Paraíba tourmaline, set in 18K white gold.',
};

export type Product = {
  id: string;
  index: string;
  eyebrow: string;
  name: [string, string];
  material: string;
  description: string;
  image: string;
  specs: [label: string, value: string][];
  price: number;
};

const media = (f: string) => `${import.meta.env.BASE_URL}media/${f}`;

export const products: Product[] = [
  {
    id: 'undertow-drops',
    index: '01',
    eyebrow: 'Fine earrings',
    name: ['Undertow', 'Drops'],
    material: '18K white gold & Paraíba tourmaline',
    description:
      'A pair of pear-cut Paraíba drops hung from round brilliant studs on a hidden articulated link, so they move a half-beat after you do.',
    image: media('earrings.webp'),
    specs: [
      ['Paraíba', '2 × 2.05 ct'],
      ['Diamonds', '0.42 ct, D–F'],
      ['Drop', '28 mm'],
    ],
    price: 12400,
  },
  {
    id: 'deep-end-pendant',
    index: '02',
    eyebrow: 'Pendant necklace',
    name: ['Deep End', 'Pendant'],
    material: '18K white gold & Paraíba tourmaline',
    description:
      'One 3.1 ct pear in a four-claw basket, a single diamond at the bail and a chain fine enough to disappear against the skin.',
    image: media('pendant.webp'),
    specs: [
      ['Paraíba', '3.10 ct'],
      ['Chain', '42 + 3 cm'],
      ['Metal', '18K white gold'],
    ],
    price: 9600,
  },
  {
    id: 'night-swim-ring',
    index: '03',
    eyebrow: 'Cocktail ring',
    name: ['Night Swim', 'Ring'],
    material: '18K white gold, Paraíba & pavé halo',
    description:
      'A pear-cut Paraíba ringed in a halo of hand-set micro-pavé, raised on a slim knife-edge band that sits flush with the finger beside it.',
    image: media('ring.webp'),
    specs: [
      ['Paraíba', '3.40 ct'],
      ['Halo', '28 × 0.01 ct'],
      ['Band', '1.8 mm'],
    ],
    price: 16200,
  },
];

export const outro = {
  line1: 'Three pieces.',
  line2: ['One ', 'night swim.'],
};

export const closing = {
  eyebrow: 'The complete set',
  title: ['Take the whole', 'deep end'],
  body: 'Earrings, pendant and ring, cut from stones of the same parcel so their colour matches under any light. Delivered in one case, hand-finished in our atelier.',
  setNote: 'Set of three',
};

export const footer = {
  columns: [
    ['Shop', ['The Deep End', 'Earrings', 'Necklaces', 'Rings']],
    ['Atelier', ['Our stones', 'Bespoke', 'Care & repairs', 'Book a viewing']],
    ['House', ['Journal', 'Stockists', 'Contact', 'Careers']],
  ] as [string, string[]][],
  concept: 'NAÏADE is a concept brand made for a design study. Pieces, prices and imagery are fictional.',
};

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(n);
```

## File: `src/components/BagDrawer.tsx`

```tsx
import {useEffect, useState} from 'react';
import {formatPrice, products} from '../content';
import {bagCount, bagStore, useBag, useBagOpen, useFlash} from '../lib/bag';

/** Slide-in bag on the right, plus the small toast that confirms each add. */
export function BagDrawer() {
  const bag = useBag();
  const open = useBagOpen();
  const flash = useFlash();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const p = products.find((x) => x.id === flash.id);
    setToast(p ? p.name.join(' ') : 'The Deep End set');
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && bagStore.setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const lines = products.filter((p) => bag[p.id]);
  const subtotal = lines.reduce((a, p) => a + p.price * bag[p.id], 0);
  const count = bagCount(bag);

  return (
    <>
      {/* Toast */}
      <div
        role="status"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-700 ease-silk ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-center gap-4 rounded-full bg-ink-2/90 py-2 pr-2 pl-5 text-bone shadow-[0_20px_60px_-15px_rgb(43_240_238/0.35)] ring-1 ring-paraiba/25 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-paraiba shadow-[0_0_12px_2px_rgb(43_240_238/0.8)]" />
          <span className="text-[13px] whitespace-nowrap">
            <span className="text-bone/55">Added</span> {toast}
          </span>
          <button type="button" onClick={() => bagStore.setOpen(true)} className="label rounded-full bg-bone px-4 py-2 text-ink">
            View bag
          </button>
        </div>
      </div>

      {/* Scrim */}
      <div
        aria-hidden
        onClick={() => bagStore.setOpen(false)}
        className={`fixed inset-0 z-50 bg-ink/60 backdrop-blur-[2px] transition-opacity duration-700 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <aside
        aria-label="Shopping bag"
        aria-hidden={!open}
        data-lenis-prevent
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-ink-2 text-bone transition-transform duration-[900ms] ease-drawer ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-bone/10 px-7 py-6">
          <p className="display text-[34px]">
            Your <em className="text-paraiba">bag</em>
          </p>
          <button type="button" onClick={() => bagStore.setOpen(false)} className="label text-bone/60 hover:text-bone">
            Close ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-4">
          {lines.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="display text-[40px] text-bone/80">
                  Still <em>water.</em>
                </p>
                <p className="mt-3 text-[13px] text-bone/45">Your bag is empty — scroll the film and add a piece.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-bone/10">
              {lines.map((p) => (
                <li key={p.id} className="flex gap-4 py-5">
                  <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-[#cfcac5]">
                    <img src={p.image} alt="" className="h-full w-full scale-125 object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="label text-bone/40">N°{p.index}</p>
                    <p className="display mt-1 text-[24px]">
                      {p.name[0]} <em>{p.name[1]}</em>
                    </p>
                    <p className="mt-1 text-[12px] text-bone/45">{p.material}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="label flex items-center rounded-full border border-bone/15 text-bone/70">
                        <button type="button" aria-label="Decrease" className="px-3 py-1.5" onClick={() => bagStore.set(p.id, bag[p.id] - 1)}>
                          −
                        </button>
                        <span className="w-4 text-center tabular-nums">{bag[p.id]}</span>
                        <button type="button" aria-label="Increase" className="px-3 py-1.5" onClick={() => bagStore.set(p.id, bag[p.id] + 1)}>
                          +
                        </button>
                      </div>
                      <p className="text-[14px] tabular-nums">{formatPrice(p.price * bag[p.id])}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-bone/10 px-7 pt-5 pb-7">
          <div className="flex items-baseline justify-between">
            <p className="label text-bone/50">
              Subtotal · {count} item{count === 1 ? '' : 's'}
            </p>
            <p className="display text-[30px] tabular-nums">{formatPrice(subtotal)}</p>
          </div>
          <p className="mt-1 text-[11.5px] text-bone/35">Complimentary insured delivery and engraving.</p>
          <button
            type="button"
            disabled={!lines.length}
            className="glint label mt-5 h-13 w-full rounded-full bg-paraiba py-4 text-ink transition-opacity disabled:opacity-30"
          >
            <span className="relative z-10">Checkout</span>
          </button>
          <p className="mt-3 text-center text-[10.5px] text-bone/30">Concept store — checkout is not connected.</p>
        </div>
      </aside>
    </>
  );
}
```

## File: `src/components/ChapterRail.tsx`

```tsx
import {type Ref} from 'react';
import {products} from '../content';

/**
 * A thin vertical rail on the right edge: one tick per piece, the current one
 * lit with its name, and a Paraíba line filling as the camera travels down.
 * `--fill` and `[data-on]` are written by the Stage.
 */
export function ChapterRail({ref}: {ref?: Ref<HTMLDivElement>}) {
  return (
    <div
      ref={ref}
      aria-hidden
      style={{opacity: 0}}
      className="pointer-events-none absolute top-1/2 right-6 z-20 -translate-y-1/2 transition-opacity duration-700 max-md:hidden"
    >
      <div className="relative flex h-[38vh] flex-col justify-between pr-4">
        <span className="absolute top-0 right-0 h-full w-px bg-bone/15" />
        <span className="absolute top-0 right-0 h-full w-px origin-top bg-paraiba [transform:scaleY(var(--fill,0))]" />
        {products.map((p) => (
          <div key={p.id} data-ch className="group flex items-center justify-end gap-3">
            <span className="label translate-x-2 text-bone opacity-0 transition-all duration-700 ease-silk group-data-[on]:translate-x-0 group-data-[on]:opacity-100">
              {p.name.join(' ')}
            </span>
            <span className="label text-bone/35 transition-colors duration-500 group-data-[on]:text-paraiba">{p.index}</span>
            <span className="absolute right-0 h-px w-2 bg-bone/40 transition-all duration-500 group-data-[on]:w-4 group-data-[on]:bg-paraiba" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## File: `src/components/Closing.tsx`

```tsx
import type {CSSProperties} from 'react';
import {closing, formatPrice, products} from '../content';
import {bagStore} from '../lib/bag';
import {useReveals} from '../hooks/useReveals';

/**
 * After the film unpins: an ivory sheet with rounded shoulders rises over the
 * last frame, holding all three pieces and the set.
 */
export function Closing() {
  const ref = useReveals<HTMLElement>();
  const total = products.reduce((a, p) => a + p.price, 0);

  const addSet = () => {
    products.forEach((p) => bagStore.add(p.id, 1));
    bagStore.flash('set');
  };

  return (
    <section
      ref={ref}
      id="set"
      className="relative z-10 -mt-[12svh] rounded-t-[clamp(28px,4vw,64px)] bg-bone px-5 pt-[clamp(72px,12vh,140px)] pb-[clamp(64px,10vh,120px)] text-ink md:px-10"
    >
      <div className="mx-auto max-w-[1680px]">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p data-reveal className="label text-paraiba-deep">
              {closing.eyebrow}
            </p>
            <h2 data-reveal style={{'--d': '80ms'} as CSSProperties} className="display mt-4 text-[clamp(52px,8.6vw,164px)]">
              <span className="uppercase">{closing.title[0]}</span>
              <br />
              <em>{closing.title[1]}</em>
            </h2>
          </div>
          <p data-reveal style={{'--d': '160ms'} as CSSProperties} className="max-w-[40ch] text-[14px] leading-[1.6] text-ink/60 md:col-span-4 md:justify-self-end">
            {closing.body}
          </p>
        </div>

        <ul className="mt-[clamp(40px,8vh,96px)] grid gap-6 md:grid-cols-3 md:gap-5">
          {products.map((p, i) => (
            <li key={p.id} data-reveal style={{'--d': `${i * 110}ms`} as CSSProperties} className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#cfcac5]">
                <img
                  src={p.image}
                  alt={`${p.name.join(' ')}, ${p.material}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1400ms] ease-silk group-hover:scale-[1.06]"
                />
                <span className="label absolute top-4 left-5 text-ink/45">N°{p.index}</span>
                <button
                  type="button"
                  onClick={() => {
                    bagStore.add(p.id, 1);
                    bagStore.flash(p.id);
                  }}
                  className="glint label absolute right-4 bottom-4 left-4 h-12 translate-y-3 rounded-full bg-ink text-bone opacity-0 transition-all duration-500 ease-silk group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 max-md:translate-y-0 max-md:opacity-100"
                >
                  <span className="relative z-10">Add to bag — {formatPrice(p.price)}</span>
                </button>
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <p className="display text-[clamp(28px,2.4vw,40px)]">
                  {p.name[0]} <em>{p.name[1]}</em>
                </p>
                <p className="text-[14px] tabular-nums text-ink/70">{formatPrice(p.price)}</p>
              </div>
              <p className="mt-1 text-[12.5px] text-ink/50">{p.material}</p>
            </li>
          ))}
        </ul>

        <div
          data-reveal
          className="mt-[clamp(40px,7vh,80px)] flex flex-col gap-6 rounded-[28px] bg-ink px-6 py-6 text-bone md:flex-row md:items-center md:justify-between md:px-10 md:py-7"
        >
          <div className="flex items-center gap-5">
            <div className="flex -space-x-4">
              {products.map((p) => (
                <span key={p.id} className="size-14 overflow-hidden rounded-full bg-[#cfcac5] ring-2 ring-ink">
                  <img src={p.image} alt="" className="h-full w-full scale-150 object-cover" />
                </span>
              ))}
            </div>
            <div>
              <p className="label text-bone/45">{closing.setNote}</p>
              <p className="display mt-1 text-[28px]">
                Earrings, pendant <em>&amp; ring</em>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <p className="display text-[36px] tabular-nums">{formatPrice(total)}</p>
            <button type="button" onClick={addSet} className="glint label h-13 rounded-full bg-paraiba px-8 py-4 text-ink">
              <span className="relative z-10">Add the set</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

## File: `src/components/Footer.tsx`

```tsx
import type {CSSProperties} from 'react';
import {brand, footer} from '../content';
import {useFitText} from '../hooks/useFitText';
import {useReveals} from '../hooks/useReveals';

export function Footer() {
  const ref = useReveals<HTMLElement>();
  const word = useFitText<HTMLSpanElement>();

  return (
    <footer ref={ref} className="relative overflow-hidden bg-ink px-5 pt-[clamp(64px,10vh,120px)] pb-8 text-bone md:px-10">
      <div className="mx-auto max-w-[1680px]">
        <div className="grid gap-10 md:grid-cols-12">
          <div data-reveal className="md:col-span-5">
            <p className="display text-[clamp(34px,3.6vw,56px)]">
              Book a private <em className="text-paraiba">viewing</em>
            </p>
            <form className="mt-6 flex max-w-[440px] items-center border-b border-bone/25 pb-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Your email"
                aria-label="Email"
                className="flex-1 bg-transparent py-2 text-[14px] text-bone placeholder:text-bone/35 focus:outline-none"
              />
              <button type="submit" className="label text-bone/70 hover:text-paraiba">
                Request →
              </button>
            </form>
          </div>
          {footer.columns.map(([title, links], i) => (
            <div key={title} data-reveal style={{'--d': `${(i + 1) * 90}ms`} as CSSProperties} className="md:col-span-2 md:col-start-auto">
              <p className="label text-bone/40">{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#set" className="text-[13.5px] text-bone/75 transition-colors hover:text-paraiba">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-[clamp(56px,10vh,120px)]" aria-hidden>
          <span ref={word} className="display inline-block leading-[0.8] whitespace-nowrap text-bone">
            NA<em className="text-paraiba">Ï</em>ADE
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-bone/10 pt-6 text-[11.5px] text-bone/35 md:flex-row md:justify-between">
          <p>
            © 2026 {brand.name} · {brand.collection}
          </p>
          <p className="max-w-[60ch]">{footer.concept}</p>
        </div>
      </div>
    </footer>
  );
}
```

## File: `src/components/HeroCopy.tsx`

```tsx
import {type Ref} from 'react';
import {formatPrice, hero, products} from '../content';

/**
 * The hero frame's type, kept minimal: a two-line Bodoni headline and one
 * readable line bottom left, a compact teaser for the ring bottom right.
 * A soft shadow sits under the type so it reads over the film.
 * Every `[data-out]` node is blurred away by the Stage as the camera moves.
 */
export function HeroCopy({ref}: {ref?: Ref<HTMLDivElement>}) {
  const ring = products[2];
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10">
      <div
        data-out
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_70%_at_0%_20%,rgb(6_8_9/0.7),transparent_70%),radial-gradient(45%_35%_at_0%_100%,rgb(6_8_9/0.65),transparent_75%)]"
      />

      {/* Headline in the dark space under the logo */}
      <div className="absolute inset-x-0 top-0 mx-auto max-w-[1680px] px-5 pt-[clamp(124px,20vh,210px)] md:px-10">
        <h1 className="display text-paraiba max-md:text-[clamp(36px,9.6vw,56px)] md:text-[clamp(48px,4vw,84px)]">
          {hero.headline.map((line, li) => (
            <span key={li} data-out className="block">
              {line.map((part, pi) =>
                part.i ? (
                  <em key={pi} className="pr-[0.04em]">
                    {part.t}
                  </em>
                ) : (
                  <span key={pi} className="uppercase">
                    {part.t}
                  </span>
                ),
              )}
            </span>
          ))}
        </h1>
      </div>

      <div className="relative mx-auto flex h-full max-w-[1680px] items-end justify-between gap-10 px-5 pb-8 md:px-10 md:pb-12">
        <p data-out className="max-w-[30ch] text-[14px] leading-[1.5] text-bone/80 md:text-[15px]">
          {hero.line}
        </p>
        {/* Compact teaser for the ring on her hand */}
        <div data-out className="flex shrink-0 items-center gap-4 max-md:hidden">
          <div className="text-right">
            <p className="label text-bone/55">N°{ring.index}</p>
            <p className="mt-1.5 text-[14px] font-medium text-bone">{ring.name.join(' ')}</p>
            <p className="display mt-1 text-[22px] text-bone">{formatPrice(ring.price)}</p>
          </div>
          <div className="size-[104px] overflow-hidden rounded-[22px] bg-[#cfcac5] shadow-[0_24px_60px_-18px_rgb(43_240_238/0.3)]">
            <img src={ring.image} alt="" className="h-full w-full scale-[1.3] object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: `src/components/Nav.tsx`

```tsx
import {useEffect, useState} from 'react';
import {brand, nav} from '../content';
import {bagCount, bagStore, useBag, useFlash} from '../lib/bag';

/**
 * Thin top bar, white in `mix-blend-difference` so it reads over both the
 * night film and the ivory cards.
 */
export function Nav() {
  const bag = useBag();
  const flash = useFlash();
  const count = bagCount(bag);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (flash) setBump(flash.at);
  }, [flash]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 text-white mix-blend-difference">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between px-5 md:h-20 md:px-10">
        <a href="#top" className="flex items-baseline gap-3" aria-label={`${brand.name} home`}>
          <span className="display text-[22px] tracking-[0.18em] md:text-[24px]">{brand.name}</span>
        </a>

        <nav className="flex items-center gap-8 max-md:hidden" aria-label="Primary">
          {nav.map((n) => (
            <a key={n} href={n === 'The Deep End' ? '#film' : '#set'} className="group relative text-[12.5px] tracking-[0.02em] text-white/80 transition-colors hover:text-white">
              {n}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-white transition-transform duration-500 ease-silk group-hover:origin-left group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <span className="h-4 w-px bg-white/25 max-md:hidden" />
          <button type="button" aria-label="Account" className="text-white/80 hover:text-white max-md:hidden">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="8" cy="5.2" r="2.7" />
              <path d="M2.8 14c.6-2.8 2.7-4.3 5.2-4.3s4.6 1.5 5.2 4.3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => bagStore.setOpen(true)}
            className="label flex items-center gap-2 text-white/85 hover:text-white"
            aria-label={`Open bag, ${count} item${count === 1 ? '' : 's'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 5.5h10l-.8 8.5H3.8L3 5.5Z" />
              <path d="M5.6 5.5V4.4a2.4 2.4 0 0 1 4.8 0v1.1" />
            </svg>
            <span>Bag</span>
            <span key={bump} className={`inline-block tabular-nums ${bump ? 'bump' : ''}`}>
              ({count})
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
```

## File: `src/components/Outro.tsx`

```tsx
import {type Ref} from 'react';
import {outro} from '../content';

/** The last line, over the rewound wide shot. Lines rise out of masks (driven by the Stage). */
export function Outro({ref}: {ref?: Ref<HTMLDivElement>}) {
  return (
    <div
      ref={ref}
      style={{visibility: 'hidden'}}
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-5 text-center"
    >
      <p className="display text-[clamp(52px,10.5vw,190px)]">
        <span className="block overflow-hidden pb-[0.08em]">
          <span data-line className="block uppercase text-bone [transform:translate3d(0,110%,0)]">
            {outro.line1}
          </span>
        </span>
        <span className="block overflow-hidden pb-[0.12em]">
          <span data-line className="block text-paraiba [transform:translate3d(0,110%,0)]">
            <em>{outro.line2[0]}</em>
            <span className="uppercase">{outro.line2[1]}</span>
          </span>
        </span>
      </p>
    </div>
  );
}
```

## File: `src/components/Preloader.tsx`

```tsx
import {useEffect, useState} from 'react';
import {brand} from '../content';

/**
 * Holds the page on the wordmark while the hero frame and a coarse spread of
 * the film decode, then lifts like a curtain. Gives up waiting after 6 s.
 */
export function Preloader({progress}: {progress: number}) {
  const [gone, setGone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const done = progress >= 1 || timedOut;

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 1600);
    return () => window.clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[70] grid place-items-center bg-ink transition-[clip-path] delay-300 duration-[1200ms] ease-drawer ${
        done ? '[clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0_0_0_0)]'
      }`}
    >
      <div className="text-center">
        <p className="display text-[clamp(44px,8vw,96px)] tracking-[0.2em] text-bone">{brand.name}</p>
        <div className="mx-auto mt-6 h-px w-[min(240px,50vw)] overflow-hidden bg-bone/10">
          <div
            className="h-full origin-left bg-paraiba transition-transform duration-500 ease-silk"
            style={{transform: `scaleX(${done ? 1 : progress})`}}
          />
        </div>
        <p className="label mt-4 text-bone/40">{brand.collection} · Paraíba tourmaline</p>
      </div>
    </div>
  );
}
```

## File: `src/components/ProductCard.tsx`

```tsx
import {useState, type Ref} from 'react';
import {brand, formatPrice, products, type Product} from '../content';
import {bagStore} from '../lib/bag';

type Props = {product: Product; side: 'left' | 'right'; ref?: Ref<HTMLElement>};

/**
 * The add-to-cart card that slides in once the camera has landed on a piece.
 * Desktop: a full-height ivory panel from the left or right edge (the Stage
 * narrows the film so the jewel stays in view). Phones: a bottom sheet.
 * The Stage drives `transform` and the `[data-k]` stagger directly.
 */
export function ProductCard({product, side, ref}: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const add = () => {
    bagStore.add(product.id, qty);
    bagStore.flash(product.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2400);
  };

  return (
    <aside
      ref={ref}
      aria-label={`${product.name.join(' ')} — add to bag`}
      style={{visibility: 'hidden'}}
      className={`absolute z-30 flex flex-col bg-bone text-ink will-change-transform
        max-md:inset-x-0 max-md:bottom-0 max-md:h-[68svh] max-md:rounded-t-[26px] max-md:px-5 max-md:pt-5 max-md:pb-5
        md:inset-y-0 md:w-[clamp(420px,41vw,640px)] md:px-[clamp(28px,3vw,52px)] md:pt-24 md:pb-[clamp(20px,3vh,36px)]
        ${side === 'left' ? 'md:left-0' : 'md:right-0'}`}
    >
      <div data-k className="label flex items-center justify-between text-ink/45">
        <span>
          N°{product.index} <span className="text-ink/25">/ 0{products.length}</span>
        </span>
        <span>{brand.collection}</span>
      </div>

      <div className="mt-[clamp(10px,2.4vh,26px)] max-md:flex max-md:items-end max-md:gap-4">
        <div className="min-w-0 flex-1">
          <p data-k className="label text-paraiba-deep">
            {product.eyebrow}
          </p>
          <h3 data-k className="display mt-2 text-[clamp(40px,4.3vw,78px)] max-md:text-[40px]">
            {product.name[0]} <em>{product.name[1]}</em>
          </h3>
          <p data-k className="mt-2 text-[13px] font-medium text-ink/70">
            {product.material}
          </p>
        </div>
      </div>

      <p data-k className="mt-3 max-w-[46ch] text-[13px] leading-[1.55] text-ink/55 max-md:line-clamp-2 max-md:text-[12.5px]">
        {product.description}
      </p>

      <figure
        data-k
        className="relative mt-[clamp(12px,2.4vh,24px)] min-h-0 flex-1 overflow-hidden rounded-[22px] bg-[radial-gradient(70%_70%_at_50%_45%,#e2ded9,#cbc6c1)]"
      >
        <img
          src={product.image}
          alt={`${product.name.join(' ')}, ${product.material}`}
          className="absolute inset-0 m-auto h-full w-full object-contain [mask-image:radial-gradient(closest-side,black_72%,transparent)]"
        />
        <figcaption className="label absolute bottom-3 left-4 text-ink/40">Paraíba · Brazil</figcaption>
        <span className="label absolute top-3 right-4 text-ink/40">{product.index}</span>
      </figure>

      <dl data-k className="mt-4 grid grid-cols-3 gap-3 border-t border-ink/10 pt-3">
        {product.specs.map(([k, v]) => (
          <div key={k}>
            <dt className="label text-ink/40">{k}</dt>
            <dd className="mt-1 text-[12.5px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div data-k className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          className="glint label h-12 flex-1 rounded-full bg-ink px-5 text-bone transition-colors duration-500 hover:bg-graphite"
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            {added ? (
              <>
                <span className="inline-block size-1.5 rounded-full bg-paraiba" /> Added to bag
              </>
            ) : (
              'Add to bag'
            )}
          </span>
        </button>
        <div className="label flex h-12 items-center rounded-full border border-ink/15 text-ink/70">
          <button type="button" aria-label="Decrease quantity" className="h-full px-3.5" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-4 text-center tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button type="button" aria-label="Increase quantity" className="h-full px-3.5" onClick={() => setQty((q) => Math.min(9, q + 1))}>
            +
          </button>
        </div>
        <p className="display ml-1 text-[clamp(26px,2.2vw,36px)] whitespace-nowrap">{formatPrice(product.price * qty)}</p>
      </div>
    </aside>
  );
}
```

## File: `src/components/Stage.tsx`

```tsx
import {useEffect, useRef} from 'react';
import {DURATION, FPS, FRAME_COUNT, loadFrames, type FrameSet} from '../lib/frames';
import {clamp, pinProgress, range} from '../lib/math';
import {onFrame} from '../lib/scroll';
import {CARDS, HERO_OUT, OUTRO_IN, REMAP, cardAmount, focalAt, holdAmount} from '../lib/timeline';
import {products} from '../content';
import {HeroCopy} from './HeroCopy';
import {ProductCard} from './ProductCard';
import {Outro} from './Outro';
import {ChapterRail} from './ChapterRail';

/** Frames the preloader waits for before lifting (coarse spread across the film). */
const READY_AT = 28;

type Props = {onProgress: (loaded: number) => void};

export function Stage({onProgress}: Props) {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const section = root.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', {alpha: false})!;
    const frames: (HTMLImageElement | undefined)[] = new Array(FRAME_COUNT);
    let loaded = 0;

    const mobile = () => window.innerWidth < 768;
    const set: FrameSet = mobile() ? 'm' : 'd';
    // The hero frame, then every hold frame, so each landing is sharp first.
    const holds = [0, 5, 10, 15, DURATION].map((s) => Math.round(s * FPS));
    const cancel = loadFrames(set, holds, (i, img) => {
      frames[i] = img;
      loaded++;
      if (loaded <= READY_AT + 1) onProgress(Math.min(1, loaded / READY_AT));
      dirty = true;
    });

    // ---- canvas sizing -------------------------------------------------
    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const nearest = (i: number) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (frames[i - d]) return frames[i - d]!;
        if (frames[i + d]) return frames[i + d]!;
      }
      return undefined;
    };

    /** Cover-fit a frame into a rect, cropping around the jewel rather than the centre. */
    const draw = (img: HTMLImageElement, rx: number, ry: number, rw: number, rh: number, fx: number, fy: number, zoom: number) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const s = Math.max(rw / iw, rh / ih) * zoom;
      const vw = rw / s;
      const vh = rh / s;
      const sx = clamp(fx * iw - vw / 2, 0, iw - vw);
      const sy = clamp(fy * ih - vh / 2, 0, ih - vh);
      ctx.drawImage(img, sx, sy, vw, vh, rx, ry, rw, rh);
    };

    // ---- per-frame state ------------------------------------------------
    let playhead = 0;
    let last = performance.now();
    let dirty = true;
    let lastKey = '';
    const cardE = [0, 0, 0];
    const heroEls = () => Array.from(heroRef.current?.querySelectorAll<HTMLElement>('[data-out]') ?? []);
    let heroNodes = heroEls();
    let heroK = -1;
    let outroK = -1;
    let railState = '';

    const styleCard = (el: HTMLElement, e: number, side: 'left' | 'right', isMobile: boolean) => {
      const off = (1 - e) * 100;
      el.style.transform = isMobile
        ? `translate3d(0, ${off}%, 0)`
        : `translate3d(${side === 'left' ? -off : off}%, 0, 0)`;
      el.style.visibility = e < 0.002 ? 'hidden' : 'visible';
      el.style.pointerEvents = e > 0.6 ? 'auto' : 'none';
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((n, i) => {
        const t = clamp((e - 0.3 - i * 0.06) / 0.45);
        n.style.opacity = String(t);
        n.style.transform = `translate3d(0, ${(1 - t) * 22}px, 0)`;
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const {p: u, rect} = pinProgress(section);
      const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
      const isMobile = mobile();

      // Playhead chases the remapped target but never slower than real time.
      const target = REMAP.at(u);
      const diff = target - playhead;
      const step = Math.max(1.25, Math.abs(diff) * 3.2) * dt;
      const prev = playhead;
      playhead = Math.abs(diff) <= step ? target : playhead + Math.sign(diff) * step;
      const velocity = Math.abs(playhead - prev) / Math.max(dt, 1e-3); // film-seconds per second

      // Cards
      let active = -1;
      let activeE = 0;
      CARDS.forEach((w, i) => {
        const e = cardAmount(u, w);
        if (e !== cardE[i]) {
          cardE[i] = e;
          const el = cardRefs.current[i];
          if (el) styleCard(el, e, w.side, isMobile);
          dirty = true;
        }
        if (e > activeE) {
          activeE = e;
          active = i;
        }
      });

      // Hero copy blurs away in a stagger.
      const hk = range(u, HERO_OUT[0], HERO_OUT[1]);
      if (hk !== heroK) {
        heroK = hk;
        if (!heroNodes.length) heroNodes = heroEls();
        const stagger = 0.4 / Math.max(1, heroNodes.length - 1);
        heroNodes.forEach((n, i) => {
          const k = clamp((hk - i * stagger) / 0.6);
          n.style.opacity = String(1 - k);
          n.style.filter = k > 0.001 ? `blur(${(k * 14).toFixed(2)}px)` : 'none';
          n.style.transform = `translate3d(0, ${(-k * 26).toFixed(1)}px, 0)`;
        });
        if (heroRef.current) heroRef.current.style.visibility = hk >= 1 ? 'hidden' : 'visible';
      }

      // Outro lines rise out of their masks.
      const ok = range(u, OUTRO_IN[0], OUTRO_IN[1]);
      if (ok !== outroK && outroRef.current) {
        outroK = ok;
        outroRef.current.style.visibility = ok <= 0 ? 'hidden' : 'visible';
        outroRef.current.querySelectorAll<HTMLElement>('[data-line]').forEach((n, i) => {
          const t = clamp((ok - i * 0.18) / 0.7);
          const e = 1 - Math.pow(1 - t, 3);
          n.style.transform = `translate3d(0, ${(1 - e) * 110}%, 0)`;
        });
        dirty = true;
      }

      // Chapter rail
      const chapter = u < 0.12 || u > 0.9 ? -1 : u < 0.39 ? 0 : u < 0.63 ? 1 : 2;
      const fill = range(u, 0.12, 0.88);
      const rs = `${chapter}|${fill.toFixed(3)}`;
      if (rs !== railState && railRef.current) {
        railState = rs;
        const rail = railRef.current;
        rail.style.opacity = chapter < 0 ? '0' : '1';
        rail.style.setProperty('--fill', fill.toFixed(4));
        rail.querySelectorAll<HTMLElement>('[data-ch]').forEach((n, i) => n.toggleAttribute('data-on', i === chapter));
      }

      if (!onScreen || !W) return;

      const frameIndex = clamp(Math.round(playhead * FPS), 0, FRAME_COUNT - 1);
      const key = `${frameIndex}|${active}|${activeE.toFixed(4)}|${ok.toFixed(3)}|${u.toFixed(4)}`;
      if (!dirty && key === lastKey) return;
      lastKey = key;
      dirty = false;
      const img = nearest(frameIndex);
      if (!img) return;

      // Region left for the film once a card is in.
      let rx = 0;
      let ry = 0;
      let rw = W;
      let rh = H;
      if (active >= 0) {
        const card = cardRefs.current[active];
        if (isMobile) {
          rh = H - (card?.offsetHeight ?? H * 0.66) * activeE;
        } else {
          const cw = (card?.offsetWidth ?? W * 0.42) * activeE;
          rw = W - cw;
          if (CARDS[active].side === 'left') rx = cw;
        }
      }

      const [fx, fy] = focalAt(playhead);
      // Lean in while a card is open, plus a slow drift through each hold.
      const hold = active >= 0 ? holdAmount(u, CARDS[active]) : 0;
      const zoom = 1 + 0.06 * activeE + 0.035 * hold * activeE;

      // Motion blur at speed: let the previous frame linger.
      const persist = clamp((velocity - 2.2) * 0.07, 0, 0.55);
      if (persist > 0.01 && active < 0) {
        ctx.globalAlpha = 1 - persist;
        draw(img, rx, ry, rw, rh, fx, fy, zoom);
        ctx.globalAlpha = 1;
        dirty = true; // keep painting until the trail settles
      } else {
        ctx.globalAlpha = 1;
        draw(img, rx, ry, rw, rh, fx, fy, zoom);
      }

      // Dim under the outro type.
      if (ok > 0) {
        ctx.fillStyle = `rgba(6,8,9,${(ok * 0.5).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const off = onFrame(tick);
    const onResize = () => {
      cardE.fill(-1);
      dirty = true;
    };
    window.addEventListener('resize', onResize);
    return () => {
      off();
      cancel();
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [onProgress]);

  return (
    <section ref={root} id="film" aria-label="The Deep End — film" className="relative h-[1500svh] max-md:h-[1300svh]">
      <div className="sticky top-0 h-svh overflow-hidden bg-ink">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        {/* Lens falloff + a floor of shadow for the type */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgb(6_8_9/0.55))]"
        />
        <HeroCopy ref={heroRef} />
        <Outro ref={outroRef} />
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            product={p}
            side={CARDS[i].side}
          />
        ))}
        <ChapterRail ref={railRef} />
      </div>
    </section>
  );
}
```

## File: `src/hooks/useFitText.ts`

```ts
import {useLayoutEffect, useRef} from 'react';

/**
 * Sizes a single line of text (the element must be `inline-block` and
 * `whitespace-nowrap`) so it spans its parent's content box exactly —
 * the wordmark runs edge to edge at every width without guessing at vw
 * values for a font whose advance widths we don't control.
 */
export function useFitText<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const PROBE = 100;
    const fit = () => {
      el.style.fontSize = `${PROBE}px`;
      const styles = getComputedStyle(parent);
      const available =
        parent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      // offsetWidth is the layout box — unaffected by the per-letter
      // transforms the hero applies while scrolling (scrollWidth is not).
      const natural = el.offsetWidth;
      if (natural > 0) el.style.fontSize = `${(PROBE * available) / natural}px`;
    };

    fit();
    // Re-fit once the web font swaps in; its metrics differ from the fallback.
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  return ref;
}
```

## File: `src/hooks/useReducedMotion.ts`

```ts
import {useEffect, useState} from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

## File: `src/hooks/useReveals.ts`

```ts
import {useEffect, useRef} from 'react';

/**
 * Watches every `[data-reveal]` element inside the returned ref's element and
 * adds `.is-in` the first time each one is seen.
 *
 * Each section owns its own observer (rather than one page-level query at
 * mount) so elements that mount later — or re-mount on hot reload — are
 * never left stuck in their hidden state.
 */
export function useReveals<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      {rootMargin: '0px 0px -10% 0px'},
    );

    const watch = () =>
      root.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    watch();

    // Pick up anything React adds later.
    const mo = new MutationObserver(watch);
    mo.observe(root, {childList: true, subtree: true});

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return ref;
}
```

## File: `src/lib/bag.ts`

```ts
import {useSyncExternalStore} from 'react';

/** A tiny shopping-bag store: product id → quantity, shared by every card. */

type Bag = Record<string, number>;

let bag: Bag = {};
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const bagStore = {
  add(id: string, qty = 1) {
    bag = {...bag, [id]: (bag[id] ?? 0) + qty};
    emit();
  },
  set(id: string, qty: number) {
    const next = {...bag};
    if (qty <= 0) delete next[id];
    else next[id] = qty;
    bag = next;
    emit();
  },
  setOpen(v: boolean) {
    open = v;
    emit();
  },
  /** Announce the last add, for the toast and the bag-count bump. */
  flash(id: string) {
    flash = {id, at: Date.now()};
    emit();
  },
};

let flash: {id: string; at: number} | null = null;

export const useBag = () => useSyncExternalStore(subscribe, () => bag);
export const useBagOpen = () => useSyncExternalStore(subscribe, () => open);
export const useFlash = () => useSyncExternalStore(subscribe, () => flash);
export const bagCount = (b: Bag) => Object.values(b).reduce((a, n) => a + n, 0);
```

## File: `src/lib/frames.ts`

```ts
/**
 * The film runs off a decoded WebP frame sequence rather than a <video>:
 * scrubbing a <video> means async seeks that drop under fast scrolling, while
 * pre-decoded bitmaps make picking a frame an array index.
 *
 * Source: one film of four shots chained through the
 * keyframes (hero → face → earring → pendant → ring), 24 fps.
 */

export const FRAME_COUNT = 481;
export const FPS = 24;
export const DURATION = (FRAME_COUNT - 1) / FPS;

export type FrameSet = 'd' | 'm';

export const frameUrl = (set: FrameSet, i: number) =>
  `${import.meta.env.BASE_URL}frames/${set}/c${String(i + 1).padStart(3, '0')}.webp`;

/** Resting frames first, then every 32nd, every 16th… so a fast scroller always has a neighbour. */
function loadOrder(count: number, priority: number[]): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const push = (i: number) => {
    if (i < 0 || i >= count || seen.has(i)) return;
    seen.add(i);
    order.push(i);
  };
  priority.forEach(push);
  for (let stride = 32; stride >= 1; stride /= 2) for (let i = 0; i < count; i += stride) push(i);
  push(count - 1);
  return order;
}

function loadOne(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const done = () => resolve(img);
    img.decode().then(done, () => (img.complete ? done() : (img.onload = done)));
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
  });
}

/** Streams the sequence coarse-to-fine, six requests at a time. Returns a cancel function. */
export function loadFrames(
  set: FrameSet,
  priority: number[],
  onFrame: (index: number, img: HTMLImageElement) => void,
) {
  const queue = loadOrder(FRAME_COUNT, priority);
  let cancelled = false;

  const worker = async () => {
    while (!cancelled && queue.length) {
      const i = queue.shift()!;
      try {
        const img = await loadOne(frameUrl(set, i));
        if (!cancelled) onFrame(i, img);
      } catch {
        // A missing frame just means its neighbour gets painted instead.
      }
    }
  };

  // The hero frame alone first, so it paints before anything competes.
  const first = queue.shift()!;
  loadOne(frameUrl(set, first))
    .then((img) => !cancelled && onFrame(first, img))
    .catch(() => {})
    .finally(() => {
      for (let k = 0; k < 6; k++) void worker();
    });

  return () => {
    cancelled = true;
  };
}
```

## File: `src/lib/math.ts`

```ts
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where `v` sits between `a` and `b`, clamped to 0–1. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

export const smoothstep = (t: number) => t * t * (3 - 2 * t);

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const easeInQuad = (t: number) => t * t;

/**
 * Scroll progress through a tall section whose child is `position: sticky`.
 * 0 when the section's top meets the viewport top, 1 when the sticky child
 * is about to unpin.
 */
export function pinProgress(el: HTMLElement): {p: number; rect: DOMRect; vh: number} {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const span = Math.max(1, rect.height - vh);
  return {p: clamp(-rect.top / span), rect, vh};
}
```

## File: `src/lib/scroll.ts`

```ts
import Lenis from 'lenis';

/**
 * One rAF loop for the whole page. Lenis advances first, then every
 * scroll-driven component reads its own rect and writes styles directly —
 * nothing here goes through React state, so scrolling never re-renders.
 */

type Tick = (time: number) => void;

const subscribers = new Set<Tick>();
let lenis: Lenis | null = null;

export function startScroll(reducedMotion: boolean): () => void {
  if (!reducedMotion) {
    lenis = new Lenis({lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9});
  }

  let raf = 0;
  const loop = (time: number) => {
    lenis?.raf(time);
    subscribers.forEach((fn) => fn(time));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function onFrame(fn: Tick): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Smooth-scrolls to an in-page hash like `#services`, or to the top for `#top`. */
export function scrollToHash(hash: string) {
  const target = hash === '#top' ? 0 : document.querySelector<HTMLElement>(hash);
  if (target === null) return;
  if (lenis) {
    lenis.scrollTo(target, {duration: 1.6});
  } else if (typeof target === 'number') {
    window.scrollTo({top: target});
  } else {
    target.scrollIntoView();
  }
  history.replaceState(null, '', hash === '#top' ? ' ' : hash);
}

/** Jumps (or glides) to an absolute scroll position — used by drag controls. */
export function scrollToY(y: number, immediate = true) {
  if (lenis) lenis.scrollTo(y, {immediate, duration: immediate ? 0 : 1.6});
  else window.scrollTo({top: y, behavior: immediate ? 'instant' : 'smooth'});
}
```

## File: `src/lib/timeRemap.ts`

```ts
/**
 * Speed ramping, the way an editor does it: scroll progress (0–1) maps to
 * film time through a smooth monotone curve instead of a straight line. Flat
 * stretches of the curve are slow-motion holds on the hero beats; steep
 * stretches are fast-forwards through the travelling shots. Monotone cubic
 * (Fritsch–Carlson) interpolation keeps every ramp eased in and out and
 * guarantees the film never runs backwards while you scroll forwards.
 */

export type Beat = readonly [u: number, seconds: number];

export type Remap = {
  /** Film time in seconds for scroll progress `u`. */
  at: (u: number) => number;
  /** Playback speed at `u`, relative to the film's average (1 = even). */
  speed: (u: number) => number;
};

export function createRemap(beats: readonly Beat[], duration: number): Remap {
  const n = beats.length;
  const xs = beats.map((b) => b[0]);
  const ys = beats.map((b) => b[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));

  // Tangents: harmonic-style mean of neighbouring slopes, zeroed at extrema.
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }

  const segment = (u: number) => {
    let i = 0;
    while (i < n - 2 && u > xs[i + 1]) i++;
    return i;
  };

  const at = (u: number) => {
    const x = Math.min(xs[n - 1], Math.max(xs[0], u));
    const i = segment(x);
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
    );
  };

  const avg = duration / (xs[n - 1] - xs[0]);
  const speed = (u: number) => {
    const e = 0.004;
    return (at(u + e) - at(u - e)) / (2 * e) / avg;
  };

  return {at, speed};
}
```

## File: `src/lib/timeline.ts`

```ts
import {createRemap, type Beat} from './timeRemap';
import {DURATION} from './frames';
import {clamp, easeOutCubic, range} from './math';

/**
 * The whole page is one camera move: hero → crane up to
 * her face → macro on the earring (card) → down the neck to the pendant
 * (card) → down to the ring hand (card) → a fast rewind back to the wide
 * shot for the last line. `u` is scroll progress through the pinned stage.
 *
 * Film seconds: 0–5 hero→face, 5–10 face→earring, 10–15 earring→pendant,
 * 15–20 pendant→ring.
 */

const END = DURATION;

export const BEATS: Beat[] = [
  [0, 0],
  [0.055, 0], // hero holds while its type blurs away
  [0.17, 5], // push in + crane up to her face
  [0.25, 10], // fast push to the earring
  [0.39, 10], // hold — card 01
  [0.49, 15], // tilt down the neck
  [0.63, 15], // hold — card 02
  [0.73, END], // down to the ring hand
  [0.87, END], // hold — card 03
  [0.955, 0], // rewind to the wide shot
  [1, 0],
];

export const REMAP = createRemap(BEATS, DURATION);

export type CardWindow = {inA: number; inB: number; outA: number; outB: number; side: 'left' | 'right'};

export const CARDS: CardWindow[] = [
  {inA: 0.262, inB: 0.296, outA: 0.362, outB: 0.388, side: 'left'},
  {inA: 0.502, inB: 0.536, outA: 0.602, outB: 0.628, side: 'right'},
  {inA: 0.742, inB: 0.776, outA: 0.842, outB: 0.868, side: 'left'},
];

/** 0 → 1 as the card slides in (eased out), 1 → 0 as it leaves (eased in). */
export function cardAmount(u: number, w: CardWindow): number {
  if (u <= w.inA || u >= w.outB) return 0;
  if (u < w.inB) return easeOutCubic(range(u, w.inA, w.inB));
  if (u <= w.outA) return 1;
  const t = range(u, w.outA, w.outB);
  return 1 - t * t * t;
}

/** How far through a card's hold we are (for the slow drift-in while it's open). */
export const holdAmount = (u: number, w: CardWindow) => clamp((u - w.inA) / (w.outB - w.inA));

/** Hero copy out, outro copy in. */
export const HERO_OUT: [number, number] = [0.006, 0.07];
export const OUTRO_IN: [number, number] = [0.93, 0.975];

/**
 * Where the jewel sits in the 16:9 frame (0–1) at each film second. Used to
 * keep the piece in view when a card narrows the film, and to steer the crop
 * on portrait phones.
 */
export const FOCAL: [t: number, x: number, y: number][] = [
  [0, 0.5, 0.5],
  [5, 0.5, 0.36],
  [10, 0.44, 0.56],
  [15, 0.475, 0.8],
  [END, 0.38, 0.47],
];

export function focalAt(t: number): [number, number] {
  let i = 0;
  while (i < FOCAL.length - 2 && t > FOCAL[i + 1][0]) i++;
  const [t0, x0, y0] = FOCAL[i];
  const [t1, x1, y1] = FOCAL[i + 1];
  const k = clamp((t - t0) / (t1 - t0));
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
}
```

## File: `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />
```

## Design notes (context, not instructions to change anything)

- **Why a frame sequence instead of `<video>`.** Scrubbing a `<video>` means writing `currentTime` on every scroll tick, and browsers answer with asynchronous seeks that drop or coalesce under fast scrolling. Decoded WebP frames make choosing one an array index and painting it one draw call. `d` is the landscape cut and `m` the portrait cut for phones. Re-encode the frames as a video and the scrub turns to mush.
- **Scroll is speed-ramped onto film time.** `timeRemap.ts` maps scroll progress to film seconds through a monotone cubic curve: flat stretches are slow-motion holds on the hero beats, steep stretches fast-forward through the travelling shots, and monotonicity guarantees the film never runs backwards while you scroll forwards.
- **The preloader waits for a coarse spread, not the whole film.** It lifts once `READY_AT` frames spread across the film have decoded — enough to scrub without blanks — and gives up after 6 seconds rather than hold the page hostage on a slow connection.
- **The nav uses `mix-blend-difference`.** One white bar reads over both the night film and the ivory cards without ever switching colour in code.
- **The bag is a front-end toy.** `src/lib/bag.ts` is a tiny in-memory store shared by every add button and the drawer; there is no checkout or backend. Wire it to your own commerce platform before you sell anything.
- **NAÏADE is invented.** The house, the pieces, the prices and the specifications are placeholder content; replace them in `src/content.ts` before you ship.