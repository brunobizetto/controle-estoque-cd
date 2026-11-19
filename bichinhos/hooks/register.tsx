import type { Register } from 'claude-code'

import { SCENE_ALT, SCENE_SVG } from './scene'

// A band above the prompt where a little figure walks along and, now and
// then, dashes forward. Desktop and mobile play an animated SVG; the
// terminal steps a text version on its own frame clock.

// What the band was asked to draw, and which clients attached: read back by
// the `status` tool to tell why a surface shows nothing. Lost on a reload,
// which is fine: a reload asks every attached surface to draw again.
type Drawn = { at: number; surface: string; collapsed: boolean; survey: boolean; answer: string }
type Attached = { at: number; surface: string; clientId: string }
const drawn: Drawn[] = []
const attached: Attached[] = []
const remember = <T,>(list: T[], item: T) => {
  list.push(item)
  if (list.length > 30) list.shift()
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'status',
      description:
        'Diagnóstico da barra "bichinhos": superfícies conectadas à sessão, clientes que se conectaram e os últimos pedidos de desenho da barra acima do prompt.',
      isDeferred: false,
    })
    $.ui.toast('Bichinhos ativos: a barra está acima do prompt.')

    return next(e)
  })

  on('session.attach', ($, e, next) => {
    remember(attached, { at: Date.now(), surface: e.surface, clientId: e.clientId })

    return next(e)
  })

  on('tool.run', { tool: /^mcp__bichinhos__status$/ }, async $ => ({
    result: JSON.stringify(
      {
        surfaces: await $.session.surfaces(),
        attached,
        drawn,
        svgChars: SCENE_SVG.length,
        now: Date.now(),
      },
      null,
      2,
    ),
  }))

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    const note = (answer: string) =>
      remember(drawn, {
        at: Date.now(),
        surface: String(e.surface),
        collapsed: e.props.isCollapsed,
        survey: e.props.hasSurvey,
        answer,
      })

    if (e.props.hasSurvey) {
      note('passed: survey')
      return next(e)
    }

    if (e.surface === 'terminal') {
      note('client')
      const { Client } = $.ui.resolve(e)

      return (
        <Client
          key="trilha"
          module="./terminal-walk.tsx"
          props={{ columns: e.props.bodyColumns }}
          width={e.props.bodyColumns}
          height={6}
        />
      )
    }

    note('svg')
    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE_SVG} alt={SCENE_ALT} isInteractive />
  })
}
