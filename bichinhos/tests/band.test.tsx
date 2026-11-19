import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'bichinhos',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 12,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 11 },
    view: {},
  },
} as const

type Node = { type?: string; children?: unknown }

function textOf(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join('')
  const n = node as Node | null
  return n && typeof n === 'object' ? textOf(n.children) : ''
}

function rowsOf(node: unknown): string[] {
  const kids = (node as Node).children
  return (Array.isArray(kids) ? kids : [kids]).map(textOf)
}

test('the terminal draws the walkers and they move', async $ => {
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.resize({ columns: 60, rows: 6, in: 'trilha' })
  const first = rowsOf(await ui.drawn({ in: 'trilha' }))
  expect(first).toHaveLength(6)
  expect(first.join('\n')).toContain('●')
  await ui.advance(4000)
  const later = rowsOf(await ui.drawn({ in: 'trilha' }))
  expect(later.join('\n')).not.toBe(first.join('\n'))
  await ui.unmount()
})

test('desktop and mobile draw the animated svg', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const svg = await ui.find({ type: 'Svg' })
    expect(svg).toBeDefined()
    const source = String((svg?.props as { source?: unknown } | undefined)?.source ?? '')
    expect(source.length).toBeGreaterThan(1000)
    expect(source.length).toBeLessThan(131072)
    expect(source).toContain('data:image/webp;base64,')
    await ui.unmount()
  }
})
