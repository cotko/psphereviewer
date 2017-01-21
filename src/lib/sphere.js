'use strict'

const TAG = 'spherescanner'

import {
  extractImageRDF,
  traverse
} from './fs'

import {
  updateProgressTagged
} from './progress'

import { thumbnailAndExif } from './img'
import { duration, hmsTime2Label } from './util'

const notifyProgress = updateProgressTagged(TAG)

const SPHERES = []
const sphereSubject = new Rx.BehaviorSubject(SPHERES)
const selectedSphereSubject = new Rx.BehaviorSubject(null)

export const sphere$ = sphereSubject
export const selectedsphere$ = selectedSphereSubject

const nextId = (function () {
  let id = 0
  return {
    next: () => ++id,
    used: _id => {
      if (_id == id) id++
      else if (_id > id) id = _id + 1
    }
  }
})()

const IMAGE_EXTENSIONS = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'bmp': 'image/jpeg'
}

const add2Sphere = sphere => {
  // handling unique - by paths
  let file_map = SPHERES.reduce((m, s) => {
    m[s.real_path || s.path] = true
    return m
  }, {})

  if (!_.isArray(sphere)) {
    sphere = [sphere]
  }

  sphere = sphere.filter(s => !file_map[s.real_path || s.path])

  if (!sphere.length) {
    return
  }

  SPHERES.push(...sphere)
  assureIds(sphere)
  assureThumbnails(sphere)
  sphereSubject.next(SPHERES)
}

const populateInfoFromExif = (info, exif) => {
  // if created_at is not found in xmp
  // try getting if from the exif
  if (info.created_at === info.created_at_file) {
    info.created_at = _.chain(exif)
      .get('image')
      .pick(['date_time_digitized', 'date_original', 'modify_date'])
      .toArray()
      .compact()
      .push(info.created_at) // as a fallback
      .first()
      .value()
  }
}

// if any data found in xmp can
// in place of other file data
// like created_at etc..
const populateInfoFromXMP = (info, xmp) => {
  info.created_at_file = info.created_at
  info.created_at = _.chain(xmp)
    .get('data')
    .pick(['GPano:FirstPhotoDate', 'GPano:LastPhotoDate'])
    .toArray()
    .compact()
    .tap(dates => {
      if (dates.length !== 2) return

      // we can calculate the time used
      // to capture the sphere here :)
      info.duration_capturing_sphere = duration(
        dates[0],
        dates[1]
      )

      info.duration_capturing_sphere_label =
        hmsTime2Label(info.duration_capturing_sphere)
    })
    .push(info.created_at) // as a fallback
    .first()
    .value()
}

const getFileExt = file_path => file_path
  .toLowerCase()
  .split('.')
  .pop()

const assureIds = spheres =>
  spheres.forEach(sphere => {
    if (!sphere.id) sphere.id = nextId.next()
    else nextId.used(sphere.id)
  })

const assureThumbnails = spheres => P
  .resolve(spheres)
  .each(sphere =>
    thumbnailAndExif(
      sphere.path,
      0.1,
      IMAGE_EXTENSIONS[getFileExt(sphere.path)],
      220
      // 250
    )
    .then(res => {
      _.merge(sphere, res)
      if (sphere.exif) populateInfoFromExif(sphere, sphere.exif)
      sphereSubject.next(SPHERES)
    })
    .catch(e => console.error(TAG, 'assureThumbnails', e))
  )

export const scanForSpheres = (dir, map_to = {}, concurrency) => {
  let files = 0

  concurrency = parseInt(concurrency) || 4

  notifyProgress('scan started', {dir})

  return traverse(dir, {})
    .do(null, null, () => {
      console.log(TAG, 'done traversing')
      notifyProgress('scanned', {dir})
    })
    .filter(info =>
      !map_to[info.real_path || info.path] &&
      (info.is_file || info.link_is_file) &&
      // just keep image extension files
      IMAGE_EXTENSIONS[ getFileExt(info.real_path || info.path) ]
    )
    .do(() => files++, null, () => {
      notifyProgress('possible image files filtered', {files})
    })
    .mergeMap(
      info => extractImageRDF(info.real_path || info.path),
      (info, xmp) => {
        if (map_to[info.real_path]) map_to[info.real_path] = xmp

        map_to[info.path] = xmp
        info.xmp = xmp

        if (_.get(info, 'xmp.is_sphere')) {
          populateInfoFromXMP(info, xmp)
          add2Sphere(info)
        }

        notifyProgress('file scanned', {
          file: info.name,
          dir: info.parent,
          spheres: SPHERES.length,
          files
        })

        return info
      },
      concurrency
    )
}

export const scanForSpheresMultiDir = (dirs = [], map_to = {}, concurrency) => {
  dirs = _
    .chain(dirs)
    .castArray()
    .compact()
    .flatten()
    .uniq()
    .value()

  notifyProgress('scanning directories for spheres', {
    dirs
  })

  return Rx.Observable
    .from(dirs)
    .mergeMap(
      dir => scanForSpheres(dir, map_to, concurrency),
      null,
      1
    )
    .do(null, null, () => {
      notifyProgress('scanning multiple dirs done', {
        dirs
      })
    })
}

export const selectSphereById = id => {
  let sphere = getSphereById(id)
  selectedSphereSubject.next(sphere)
}

export const getSphereById = id => {
  if (!id) return null
  for (let sp of SPHERES) if (sp.id == id) return sp
  return null
}
