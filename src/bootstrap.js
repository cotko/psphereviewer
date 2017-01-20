'use strict'

const TAG = 'BOOTSTRAP'

console.debug(TAG, 'initializing')

global.P = require('bluebird')
global._ = require('lodash')
global.moment = require('moment')
global.Rx = require('rxjs')

const path = require('path')
const querystring = require('querystring')

import { makeDOMDriver } from '@cycle/dom'
import { run } from '@cycle/rxjs-run'
const { main } = require(path.join('..', 'ui'))
const bridge = require(path.join('..', 'bridge')).bridge

const util = require(path.join('..', 'lib', 'util'))

global.L = {}
require(path.join('..', 'lib', 'i18n'))
.register(
  path.join('..', 'i18n'),
  L,
  ['en', 'sl']
)

global.setLocale = locale => {
  L.setLocale(locale)
  moment.locale(locale)
}

setLocale('sl')

global.NW = {
  nw,
  win: nw.Window.get()
}

NW.win.showDevTools()

nw.App.restart = function () {
  let child_process = require('child_process')
  let child

  if (process.platform == 'darwin') {
    child = child_process
      .spawn('open', [
        '-n',
        '-a',
        process.execPath.match(/^([^\0]+?\.app)\//)[1]
      ], {
        detached: true
      }
  )
  } else {
    child = child_process
    .spawn(process.execPath, [], { detached: true })
  }
  child.unref()
  NW.win.hide()
  nw.App.quit()
}

const paramsFromQueryString = qs =>
  querystring.parse(qs)

const handleUIEvents = subject => {
  subject
    .map(evt =>
      _.isString(evt) && evt.startsWith('ui:')
        ? evt.split('ui:').pop() : null
    )
    .filter(evt => evt)
    .subscribe(evt => {
      let parts = evt.split('?')
      evt = parts.shift()
      let qs = parts.pop()
      let params = paramsFromQueryString(qs)
      console.debug(TAG, 'got ui event', evt, params)
      switch (evt) {
        case 'close':
          return nw.App.quit()
        case 'reload':
          return nw.App.restart() // return NW.win.reloadIgnoringCache()
        case 'selectsphere':
          return bridge.selectSphere(params)
        case 'showongooglemaps':
        case 'revealfile':
        case 'openfile':
          let sphere = bridge.getSphereById(params.id)
          if (!sphere) return console.warn(TAG, 'no sphere found by id')
          switch (evt) {
            case 'revealfile': return util.revealFileInFolder(sphere.path)
            case 'openfile': return util.openFile(sphere.path)
            case 'showongooglemaps': return util.openUrl(
                util.googleMapsUrlFromSphereData(sphere, 18, true)
              )
          }
      }
    })
}

const init = () => {
  let action = new Rx.Observable.create()

  run(main, {
    props: () => ({
      progress$: bridge.progress$,
      sphere$: bridge.sphere$,
      selectedsphere$: bridge.selectedsphere$
    }),
    ACTION: subject => {
      handleUIEvents(subject)
      return action
    },
    frame: makeDOMDriver('#frame'),
    top: makeDOMDriver('#top'),
    settings: makeDOMDriver('#settings'),
    info: makeDOMDriver('#info'),
    left: makeDOMDriver('#left')
  })
}

window.onload = () => {
  init()
}
