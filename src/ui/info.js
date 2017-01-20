'use strict'
const querystring = require('querystring')

import {div, label} from '@cycle/dom'

import {
  relativeDate,
  traverseDOMForAttr
} from '../lib/util'

// display:
//  currently selected sphere
//  last update date
//  current scan
//  # of spheres
//

const viewSelected = stream$ =>
  stream$
  .map(selected => _.pick(selected, [
    'id',
    'name', 'parent', 'path',
    'created_at',
    'exif'
  ]))
  .map(spheredata => {
    if (!spheredata.id) return label('none')
    let has_gps = _.get(spheredata, 'exif.gps.gps_latitude')
    return div('#selected', {
      attrs: {
        'sphere-id': spheredata.id,
        'sphere-path': spheredata.path
      }
    }, [
      div('.path', [
        label('.folder', spheredata.parent),
        label('.name', spheredata.name),
        div('.open', [
          label('.reveal-file', L.t('show in folder')),
          label('.open-external', L.t('open')),
          // only show gps related if available
          has_gps && label('.show-on-google-maps', L.t('google maps')) || false
        ])
      ]),
      div('.meta', [
        div('.created-date', [
          label('.date', moment(spheredata.created_at).format('YYYY MMM DD')),
          label('.time', moment(spheredata.created_at).format('H:mm:ss'))
        ])
      ])
    ])
  })

const getClickForSphere = (selector, tag, DOM) =>
  DOM
  .select(selector)
  .events('click')
  .map(e => traverseDOMForAttr(e.currentTarget, 'sphere-id'))
  .filter(s => !!s)
  .map(id => `${tag}?${querystring.encode({id})}`)

export const info = sources => {
  const action$ = Rx.Observable.merge(
    getClickForSphere('.reveal-file', 'ui:revealfile', sources.DOM),
    getClickForSphere('.open-external', 'ui:openfile', sources.DOM),
    getClickForSphere('.show-on-google-maps', 'ui:showongooglemaps', sources.DOM)
  )

  const progress$ = sources
    .progress$
    .map(evt => {
      let lbl = evt.args && evt.args.dir ?
        `${evt.args.dir}/${evt.args.file} ${evt.args.spheres}/${evt.args.files}`
        : null

      return lbl
    })
    .filter(id => id)

  const vtree$ = progress$
  .map(val => {
    return div('#progress', [
      label(val)
    ])
  })
  .startWith('no process yet')

  return {
    // DOM: vtree$
    DOM: viewSelected(sources.selectedsphere$),
    ACTION: action$
  }
}
