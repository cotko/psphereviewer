'use strict'

global.RESIZE = require('../lib/img').downscaleImage

import {
  findSpheresByFileNameIdentifiers,
  scanForSpheres,
  scanForSpheresMultiDir,
  sphere$,
  selectedsphere$,
  selectSphereById,
  getSphereById
} from '../lib/sphere'

import {
  progress$
} from '../lib/progress'

require('../lib/sphere_cache')

global.findSpheresByFileNameIdentifiers = findSpheresByFileNameIdentifiers
global.scanForSpheres = scanForSpheres
global.scanForSpheresMultiDir = scanForSpheresMultiDir

// setTimeout( () => {
//  console.log('jaaaa??')
//  progress$.subscribe(
//    data => console.log('onprogress', data.tag, data.text, data.args)
//  )
// }, 300)

const selectSphere = ctx => selectSphereById(ctx.id)

export const bridge = {
  findSpheresByFileNameIdentifiers,
  scanForSpheresMultiDir,
  scanForSpheres,
  progress$,
  sphere$,
  selectedsphere$,
  selectSphere,
  getSphereById
}
