'use strict'
const querystring = require('querystring')

import {span, input, label, img, div} from '@cycle/dom'
import {
  relativeDate,
  getCurrentYear
} from '../lib/util'

const TAG = 'UI:TOP'

const renderSpheresBar = spheres$ =>
  spheres$.map( spheres =>
    div('#bar', { attrs: {class:'expanded'}}, [
      renderFilter(),
      renderSpheres(spheres)
    ])
  )

const renderSpheres = spheres =>
  div('.sphere-thumbs', spheres.map(renderItem) )


const renderItem = item =>
  item.is_label ?
    renderLabel(item)
    : sphereView(item)

const renderLabel = item =>
  div('.thumb-group', [
    label('lbl', [ item.label ])
  ])

const sphereView = sphere =>
  div('.sphere-thumb-wrapper', [
    renderThumbnail(sphere)
  ])

const renderThumbnail = sphere => {
  //let thumb = _.get(sphere, 'thumbnail.thumb', '../img/loader_big.gif')
  let thumb = _.get(sphere, 'thumbnail.thumb', false)
  let has_thumb = !!thumb
  return div({
    key: sphere.id,
    attrs: {
      class: 'thumb',
      'sphere-id': sphere.id
    },
    style: {
      'background-size': has_thumb ? 'cover' : 'contain',
      'background-image': `url(${thumb || '../img/loader_big.gif'})`
    }
  })
}

const filterAndNormalizeShperes = (spheres, filter) => spheres
  .filter( s => {
    if(!filter) return true
    // this is also relatively bad.. but let's
    // cache filter text on the fly here directly
    // to shperes
    if(!s._txtfilter) {
      s._txtfilter = [
        s.path,
        _.get(s, 'exif.image.make'),
        _.get(s, 'exif.image.model')
      ]
      .filter( s => !!s )
      .join(' ')
      .toLowerCase()
    }

    let returnonsubmatch = !filter.text

    // if number then check the year too
    if(filter.year.length) {
      if(!s._year) s._year = s.created_at.getFullYear()
      if(!~filter.year.indexOf(s._year))
        return false
    }

    if(returnonsubmatch) return true

    return !!~s._txtfilter.indexOf(filter.text)

  })
  .sort( (s1, s2) => {
    if(s1.created_at < s2.created_at) return -1
    if(s2.created_at < s1.created_at) return 1
    if(s1.name < s2.name) return -1
    if(s2.name < s1.name) return 1
    return 0
  })
  .reverse()
  .reduce( (memo, el, pos) => {
    let dt = relativeDate(el.created_at)
    if(!memo.labels[dt]) {
      memo.labels[dt] = true
      memo.spheres.push({
        label: dt,
        is_label: true
      })
    }
    memo.spheres.push(el)
    return memo

  }, { labels: {}, spheres: [], now: moment() } )
  .spheres

const renderFilter = () =>
  div('.filter-bar', [
    div('.filter-container', [
      input('.filter-input', {
        attrs: {
          placeholder: L.t('filter')
        }
      }),
      div('.filter-hint fa fa-info-circle', [
        div('.hints', [
          span([
            L.t('y=%s to filter by year', getCurrentYear())
          ])
        ])
      ])
    ])
  ])

// handle special filters etc.
const normalizeFilter = text => {
  let ret = false
  if(text) {
    ret = { year: [] }
    let year = text.match(/(\s?(y|year)[=|:]\d{4})/g)
    if(year) {
      for(let match of year) {
        text = text.split(match).join('')
        ret.year.push(
          (match.split(/[=|:]/).pop()|0)
        )
      }
    }
    ret.text = text.trim()
  }
  console.log(TAG, 'normalizeFilter', ret)
  return ret
}

export const top = sources => {

  const filterel = sources.DOM.select('.filter-input')
  const filter$ = Rx.Observable
  .merge(
    filterel.events('keydown'),
    filterel.events('change'),
    filterel.events('paste'),
    filterel.events('cut')
  )
  .flatMap( e =>
    // don't know how to do this with rx..
    // we must delay a bit for cut/paste events
    P.delay(20).then( () =>
      _.chain((
        'Escape' !== e.key && _.get(e, 'target.value')
        // this is bad..
        || (e.target.value = '' && '')
      ))
      .trim()
      .toLower()
      .value()
    )
  )
  .startWith('')
  .distinctUntilChanged()
  .map( normalizeFilter )

  const spheres_result$ = Rx.Observable.combineLatest(
    filter$,
    sources.sphere$
  )
  .map( ([filter, spheres]) =>
    filterAndNormalizeShperes(spheres, filter)
  )



  //const spheres_sorted$ = sources
  //.sphere$
  //.map( sortAndLabelizeSpheres )

  const action$ = sources
  .DOM
  .select('.thumb')
  .events('click')
  .map( e => e.currentTarget.getAttribute('sphere-id') )
  .filter( id => !!id )
  .map( id => `ui:selectsphere?${querystring.encode({id})}` )

  const vtree$ = renderSpheresBar(spheres_result$)

  return {
    DOM: vtree$,
    ACTION: action$
  }

}
