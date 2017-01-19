'use strict'

const path = require('path')


import { frame as uiFrame, } from './frame'
import { info as uiInfo } from './info'
import { settings as uiSettigns } from './settings'
import { top as uiTop } from './top'
import { sphereView } from './sphere'


export const main = sources => {


  let framesource = {
    DOM: sources.frame,
    ACTION: sources.ACTION
  }

  let infosource = {
    DOM: sources.info,
    progress$: sources.props.progress$,
    selectedsphere$: sources.props.selectedsphere$,
    ACTION: sources.ACTION
  }

  let settingssource = {
    DOM: sources.settings,
  }

  let topsource = {
    DOM: sources.top,
    sphere$: sources.props.sphere$,
    ACTION: sources.ACTION
  }

  let sphereview = {
    target: document.getElementById('sphereview'),
    selectedsphere$: sources.props.selectedsphere$
  }


  let frame = uiFrame(framesource)
  let settings = uiSettigns(settingssource)
  let info = uiInfo(infosource)
  let top = uiTop(topsource)

  sphereView(sphereview)

  return {
    frame: frame.DOM,
    info: info.DOM,
    settings: settings.DOM,
    top: top.DOM,
    ACTION: Rx.Observable.merge(
      frame.ACTION,
      top.ACTION,
      info.ACTION
    )
    //ACTION: a.ACTION.merge(b.ACTION)
  }

}
