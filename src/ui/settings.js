'use strict'
import {p, div, label, input, hr, h1, makeDOMDriver} from '@cycle/dom'

export const settings = sources => {

  const vtree$ = Rx.Observable.of(
    div([
      label('kvaje...'),
      p('kvaje...')
    ])
  )

  return {
    DOM: vtree$
    //ACTION: action$
  }

}
