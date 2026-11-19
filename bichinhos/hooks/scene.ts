// The animated band for the surfaces that draw an Svg (desktop, mobile).
// Everything moves with SMIL inside the markup, so the hook draws it once
// and the surface plays it: no timers, no redraws.
//
// A dark cave; on its right, a window onto the cave clip (mirrored); along
// the floor, the hat-wearing pixel figure walks and now and then dashes.
import { CLIP, SPRITE } from './assets'

const W = 720
const H = 118
const GROUND = 106

type Key = readonly [t: number, value: number | string]
type Dash = { at: number; dist: number }

const DASH_TIME = 0.25
const SKID_TIME = 0.35
const SKID_DIST = 6

const num = (n: number): string => String(Math.round(n * 100) / 100)

// keyTimes must run from 0 to 1 in order; values follow them one to one.
const keyTimes = (keys: readonly Key[], dur: number): string =>
  keys.map(([t]) => String(Math.round(Math.min(1, Math.max(0, t / dur)) * 10000) / 10000)).join(';')

function timeline(keys: readonly Key[], dur: number): string {
  const values = keys.map(([, v]) => (typeof v === 'number' ? num(v) : v))
  return `values="${values.join(';')}" keyTimes="${keyTimes(keys, dur)}" dur="${dur}s" repeatCount="indefinite"`
}

// A sheet of frames stacked top to bottom, played by stepping its `y`.
function frames(count: number, height: number, ms: number): string {
  const keys: Key[] = Array.from({ length: count }, (_, i) => [i * ms, -i * height] as const)
  const dur = (count * ms) / 1000
  return `values="${keys.map(([, v]) => v).join(';')}" keyTimes="${keys
    .map(([t]) => String(Math.round((t / (count * ms)) * 10000) / 10000))
    .join(';')}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"`
}

// Where the walker stands over the loop: walks at `speed`, bursts forward on
// each dash, skids a little, walks on.
function track(x0: number, speed: number, dur: number, dashes: readonly Dash[]) {
  const keys: Key[] = [[0, x0]]
  const starts: number[] = []
  let x = x0
  let t = 0
  for (const d of dashes) {
    x += speed * (d.at - t)
    keys.push([d.at, x])
    starts.push(x)
    x += d.dist
    keys.push([d.at + DASH_TIME, x])
    x += SKID_DIST
    t = d.at + DASH_TIME + SKID_TIME
    keys.push([t, x])
  }
  x += speed * (dur - t)
  keys.push([dur, x])
  return { keys: keys.map(([kt, kx]) => [kt, `${num(Number(kx))} ${GROUND}`] as const), starts }
}

// 0 most of the loop, `peak` while a dash runs, easing out after it.
function pulse(dashes: readonly Dash[], dur: number, peak: number, rise: number, hold: number, fall: number) {
  const keys: Key[] = [[0, 0]]
  for (const d of dashes) {
    keys.push([d.at - 0.02, 0], [d.at + rise, peak], [d.at + hold, peak], [d.at + hold + fall, 0])
  }
  keys.push([dur, 0])
  return keys
}

// ---------------------------------------------------------------- the walker

const SCALE = 1.6
const SPRITE_W = SPRITE.w * SCALE
const SPRITE_H = SPRITE.h * SCALE
const FEET = 3 * SCALE // the sheet's last rows below the feet

const walkerBody = `
<g id="walker">
  <svg x="${num(-SPRITE_W / 2)}" y="${num(-SPRITE_H + FEET)}" width="${num(SPRITE_W)}" height="${num(SPRITE_H)}" viewBox="0 0 ${SPRITE.w} ${SPRITE.h}">
    <image href="${SPRITE.uri}" width="${SPRITE.w}" height="${SPRITE.h * SPRITE.frames}" style="image-rendering:pixelated">
      <animate attributeName="y" ${frames(SPRITE.frames, SPRITE.h, SPRITE.ms)}/>
    </image>
  </svg>
</g>`

const WALK_DUR = 13
const DASHES: Dash[] = [
  { at: 3.5, dist: 140 },
  { at: 8.5, dist: 140 },
]

function walker() {
  const { keys, starts } = track(-50, 44, WALK_DUR, DASHES)
  const fx = pulse(DASHES, WALK_DUR, 1, 0.03, DASH_TIME, 0.35)
  const lean = pulse(DASHES, WALK_DUR, -10, 0.05, DASH_TIME, 0.2)
  const dust = starts
    .map((x, i) => {
      const d = DASHES[i]!
      const op = timeline([[0, 0], [d.at - 0.01, 0], [d.at + 0.03, 0.55], [d.at + 0.65, 0], [WALK_DUR, 0]], WALK_DUR)
      const r = (max: number) => timeline([[0, 1.5], [d.at, 1.5], [d.at + 0.65, max], [WALK_DUR, max]], WALK_DUR)
      return `<g fill="#7d8bb3">
        <circle cx="${num(x - 8)}" cy="${GROUND - 3}" r="1.5" opacity="0"><animate attributeName="opacity" ${op}/><animate attributeName="r" ${r(8)}/></circle>
        <circle cx="${num(x - 18)}" cy="${GROUND - 2}" r="1.5" opacity="0"><animate attributeName="opacity" ${op}/><animate attributeName="r" ${r(5.5)}/></circle>
        <circle cx="${num(x)}" cy="${GROUND - 2}" r="1.5" opacity="0"><animate attributeName="opacity" ${op}/><animate attributeName="r" ${r(4.5)}/></circle>
      </g>`
    })
    .join('')
  return `${dust}
  <g>
    <animateTransform attributeName="transform" type="translate" ${timeline(keys, WALK_DUR)}/>
    <circle cx="0" cy="-32" r="46" fill="url(#lantern)"/>
    <ellipse cx="0" cy="0.5" rx="20" ry="3" fill="#000" opacity="0.35"/>
    <g>
      <animateTransform attributeName="transform" type="skewX" ${timeline(lean, WALK_DUR)}/>
      <g opacity="0">
        <animate attributeName="opacity" ${timeline(fx, WALK_DUR)}/>
        <path d="M-96,-20 L-40,-20 M-84,-38 L-38,-38 M-104,-54 L-46,-54" stroke="#9fb8ff" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>
        <path d="M-72,-29 L-40,-29 M-90,-46 L-52,-46" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
        <use href="#walker" x="-48" opacity="0.18" filter="url(#ghost)"/>
        <use href="#walker" x="-25" opacity="0.36" filter="url(#ghost)"/>
      </g>
      <use href="#walker"/>
    </g>
  </g>`
}

// ------------------------------------------------------------ the cave window

const PANEL_W = Math.round((H * CLIP.w) / CLIP.h)
const PANEL_X = W - PANEL_W

const cavePanel = `
<g mask="url(#fade)">
  <svg x="${PANEL_X}" y="0" width="${PANEL_W}" height="${H}" viewBox="0 0 ${CLIP.w} ${CLIP.h}" preserveAspectRatio="xMidYMid slice">
    <image href="${CLIP.uri}" width="${CLIP.w}" height="${CLIP.h * CLIP.frames}">
      <animate attributeName="y" ${frames(CLIP.frames, CLIP.h, CLIP.ms)}/>
    </image>
  </svg>
</g>`

// ------------------------------------------------------------ the backdrop

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function motes() {
  const r = rand(7)
  let out = ''
  for (let i = 0; i < 16; i++) {
    const x = num(16 + r() * (PANEL_X - 10))
    const dur = num(6 + r() * 6)
    const begin = num(-r() * 12)
    const size = num(0.8 + r() * 1.5)
    out += `<circle cx="${x}" cy="${GROUND}" r="${size}" fill="#b9ccff" opacity="0">
      <animate attributeName="cy" values="${GROUND - 4};8" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;0.75;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    </circle>`
  }
  return out
}

function stalactites() {
  const r = rand(21)
  let d = `M0,0 L${W},0 L${W},6`
  for (let x = W; x > 0; ) {
    const w = 18 + r() * 40
    const depth = 6 + r() * (r() < 0.25 ? 26 : 12)
    d += ` Q${num(x - w / 2)},${num(depth * 2)} ${num(x - w)},6`
    x -= w
  }
  return `<path d="${d} L0,6 Z" fill="#090d18"/>`
}

function rocks() {
  const r = rand(5)
  let out = ''
  for (let x = 0; x < W; ) {
    const w = 10 + r() * 22
    out += `<ellipse cx="${num(x + w / 2)}" cy="${num(GROUND + 5 + r() * 4)}" rx="${num(w / 2 + 2)}" ry="${num(5 + r() * 3)}" fill="${r() < 0.5 ? '#141b30' : '#11172a'}"/>`
    x += w
  }
  return out
}

export const SCENE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0d1222"/>
    <stop offset="1" stop-color="#1c2642"/>
  </linearGradient>
  <radialGradient id="lantern">
    <stop offset="0" stop-color="#9fb8ff" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#9fb8ff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="fadeGrad" gradientUnits="userSpaceOnUse" x1="${PANEL_X}" y1="0" x2="${PANEL_X + 56}" y2="0">
    <stop offset="0" stop-color="#000"/>
    <stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <mask id="fade" maskUnits="userSpaceOnUse" x="${PANEL_X}" y="0" width="${PANEL_W}" height="${H}">
    <rect x="${PANEL_X}" y="0" width="${PANEL_W}" height="${H}" fill="url(#fadeGrad)"/>
  </mask>
  <filter id="ghost"><feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.8  0 0 0 0 1  0 0 0 1 0"/></filter>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  ${walkerBody}
</defs>
<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stalactites()}
  ${cavePanel}
  ${rocks()}
  <line x1="0" y1="${GROUND}" x2="${PANEL_X + 20}" y2="${GROUND}" stroke="#FE5000" stroke-width="1.4" opacity="0.55"/>
  ${motes()}
  ${walker()}
</g>
</svg>`

export const SCENE_ALT =
  'Animação: numa caverna escura, um bonequinho em pixel art de chapéu de palha caminha pela barra e, de vez em quando, dá um dash para frente; à direita, uma janela mostra um clipe da caverna espelhado.'
