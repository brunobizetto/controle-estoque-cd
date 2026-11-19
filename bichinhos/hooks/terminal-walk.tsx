// The terminal's version of the band: the same two walkers in text cells,
// stepped on the surface's own frame clock.
import type { ClientModule } from 'claude-code'

type Paint = { fg?: string; bg?: string }
type Cell = { ch: string } & Paint

type Walker = { x: number; dash: number; trail: number; cool: number; frame: number; wait: number }
type Scene = { k: Walker; h: Walker; seed: number; tick: number }

const ROWS = 6
const TICK_MS = 90

const PAINT: Record<string, Paint> = {
  w: { fg: '#f4f4f6' },
  M: { fg: '#111111', bg: '#f4f4f6' },
  B: { fg: '#5a64a8' },
  k: { fg: '#8a8fa3' },
  p: { fg: '#ff7c90' },
  P: { fg: '#ffd1d9' },
  t: { fg: '#9a7a6a' },
  R: { fg: '#d04a44' },
  s: { fg: '#c9ced8' },
}

// Each sprite: rows of glyphs over rows of paint letters, bottom-aligned.
type Sprite = { glyphs: string[]; paint: string[] }

const knight = (legs: string, flame: string, flamePaint: string): Sprite => ({
  glyphs: [` \\ / ${flame}`, ' ● ● |', '/▓▓▓\\|', legs],
  paint: [` w w ${flamePaint}`, 'MMMMMt', 'BBBBBt', 'kkkkkk'],
})

const hornet = (legs: string, dashing: boolean): Sprite => ({
  glyphs: ['  | |  ', '  ● ●  ', dashing ? '  /▓\\──◇' : '\\ /▓\\  ', ' /▓▓▓▓\\', legs],
  paint: ['  w w  ', ' MMMMM ', dashing ? '  RRRsss' : 's RRR  ', ' RRRRRR', 'kkkkkkk'],
})

function knightSprite(w: Walker, tick: number): Sprite {
  const flame = tick % 4 < 2 ? '*' : '^'
  const flamePaint = tick % 6 < 3 ? 'p' : 'P'
  if (w.dash > 0) return knight(' //   ', flame, flamePaint)
  return knight(w.frame ? ' / \\  ' : '  ||  ', flame, flamePaint)
}

function hornetSprite(w: Walker): Sprite {
  if (w.dash > 0) return hornet('  //   ', true)
  return hornet(w.frame ? '  / \\  ' : '   |   ', false)
}

function nextRandom(seed: number): [number, number] {
  const s = (seed * 1664525 + 1013904223) % 4294967296
  return [s, s / 4294967296]
}

function stepWalker(w: Walker, cols: number, every: number, seed: number): [Walker, number] {
  let { x, dash, trail, cool, frame, wait } = w
  let s = seed
  let r: number
  if (dash > 0) {
    x += 5
    dash -= 1
    trail = 6
    if (dash === 0) cool = 28
  } else {
    trail = Math.max(0, trail - 1)
    cool = Math.max(0, cool - 1)
    wait += 1
    if (wait >= every) {
      wait = 0
      x += 1
      frame = frame ? 0 : 1
    }
    ;[s, r] = nextRandom(s)
    if (cool === 0 && x > 0 && r < 1 / 40) dash = 3
  }
  if (x > cols + 2) {
    ;[s, r] = nextRandom(s)
    x = -9 - Math.floor(r * 14)
    dash = 0
    trail = 0
  }
  return [{ x, dash, trail, cool, frame, wait }, s]
}

function step(scene: Scene, cols: number): Scene {
  const [k, s1] = stepWalker(scene.k, cols, 3, scene.seed)
  const [h, s2] = stepWalker(scene.h, cols, 3, s1)
  return { k, h, seed: s2, tick: scene.tick + 1 }
}

function stamp(grid: Cell[][], sprite: Sprite, x: number, cols: number) {
  const top = ROWS - 1 - sprite.glyphs.length
  sprite.glyphs.forEach((line, row) => {
    const glyphs = Array.from(line)
    const paint = Array.from(sprite.paint[row] ?? '')
    glyphs.forEach((ch, i) => {
      const col = x + i
      const letter = paint[i] ?? ' '
      if (col < 0 || col >= cols || letter === ' ') return
      const target = grid[top + row]
      if (target) target[col] = { ch, ...PAINT[letter] }
    })
  })
}

function streak(grid: Cell[][], w: Walker, rows: number[], colors: [string, string], cols: number) {
  if (w.trail === 0) return
  const length = w.dash > 0 ? 9 : w.trail
  for (const row of rows) {
    for (let i = 1; i <= length; i++) {
      const col = w.x - i
      const target = grid[row]
      if (!target || col < 0 || col >= cols || target[col]?.ch !== ' ') continue
      const ch = i < 3 ? '═' : i < 6 ? '─' : '·'
      target[col] = { ch, fg: i < 4 ? colors[0] : colors[1] }
    }
  }
}

const INITIAL: Scene = {
  k: { x: 14, dash: 0, trail: 0, cool: 20, frame: 0, wait: 0 },
  h: { x: 0, dash: 0, trail: 0, cool: 40, frame: 1, wait: 1 },
  seed: 20261119,
  tick: 0,
}

let liveColumns = 0

const TerminalWalk: ClientModule<{ columns: number }, Scene> = (props, surface) => {
  const { Box, Text } = surface.elements
  liveColumns = surface.columns || props.columns || 60

  if (surface.state === undefined) {
    let scene = INITIAL
    surface.every(TICK_MS, () => {
      scene = step(scene, liveColumns)
      surface.setState(scene)
    })
    surface.setState(scene)
  }

  const scene = surface.state ?? INITIAL
  const cols = Math.max(10, liveColumns)
  const grid: Cell[][] = Array.from({ length: ROWS }, () => Array.from({ length: cols }, () => ({ ch: ' ' })))

  streak(grid, scene.h, [2, 3], ['#d04a44', '#7a2d2b'], cols)
  streak(grid, scene.k, [3, 4], ['#5a64a8', '#30365c'], cols)
  stamp(grid, hornetSprite(scene.h), scene.h.x, cols)
  stamp(grid, knightSprite(scene.k, scene.tick), scene.k.x, cols)
  const ground = grid[ROWS - 1]
  if (ground) ground.forEach((cell, i) => (ground[i] = { ...cell, ch: '─', fg: '#FE5000' }))

  return (
    <Box flexDirection="column">
      {grid.map((row, r) => {
        const runs: { text: string; paint: Paint }[] = []
        for (const cell of row) {
          const last = runs[runs.length - 1]
          if (last && last.paint.fg === cell.fg && last.paint.bg === cell.bg) last.text += cell.ch
          else runs.push({ text: cell.ch, paint: { fg: cell.fg, bg: cell.bg } })
        }
        return (
          <Text key={`r${r}`} wrap="truncate">
            {runs.map((run, i) => (
              <Text key={`c${i}`} color={run.paint.fg} backgroundColor={run.paint.bg}>
                {run.text}
              </Text>
            ))}
          </Text>
        )
      })}
    </Box>
  )
}

export default TerminalWalk
