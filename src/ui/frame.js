'use strict'
import {div, label, input, hr, h1, makeDOMDriver} from '@cycle/dom'

const buttons = [{
  action: 'ui:close',
  class: 'fa fa-close'
}, {
  action: 'ui:minimize',
  class: 'fa fa-chevron-down'
}, {
  action: 'ui:restore',
  class: 'fa fa-chevron-up'
}, {
  action: 'ui:settings',
  class: 'fa fa-gear'
}, {
  action: 'ui:about',
  class: 'fa fa-info'
}, {
  action: 'ui:reload',
  class: 'fa fa-refresh'
}]

export const frame = sources => {

  const vtree$ = Rx.Observable.of(
    div('#buttons', buttons.map( button =>
      div(
        `.button ${button.action.split(':').pop()}`,
        {attrs: {action: button.action}, key: button.action}, [
          label(`.${button.class}`)
        ]
      ))
    )
  )

  const action$ = sources
    .DOM
    .select('.button')
    .events('click')
    .map( e => e.currentTarget.getAttribute('action') )

  return {
    DOM: vtree$,
    ACTION: action$
  }

}
