'use strict'

const GOOGLE_MAPS_URL = `https://www.google.com/maps`

import {
  commandExists,
  execute
} from './fs'

const path = require('path')

const HMS_POS_MAP = {
  0: 'h',
  1: 'm',
  2: 's'
}

let now = moment()

setTimeout( () => now = moment(), 60 * 1 * 1000 )

const revealFileDefault = file => NW.nw.Shell.showItemInFolder(file)

const revealFileInDolphin = file => {
  return execute('dolphin', [
    file,
    '--select'
  ])
}

let revealFile = path => {
  // kde - dolphin
  commandExists('dolphin')
  .then( exists => {
    if(exists) revealFile = revealFileInDolphin
    else revealFile = revealFileDefault
  })
  .catch( e => revealFile = revealFileDefault )
  .then( () => revealFile(path) )
}

export const relativeDate = date => {
  let dur = moment.duration(-now.diff(date))
  if(Math.abs(dur.asDays() > 5)) return dur.humanize(true)
  return moment(date).format('YYYY MMM DD')
}

export const openUrl = url => NW.nw.Shell.openExternal(url)
export const openFile = file => NW.nw.Shell.openItem(file)
export const revealFileInFolder = file => revealFile(file)

export const traverseDOMForAttr = (el, attr, limit=5) => {
  if(!el) return false
  let attrdata = el.getAttribute(attr)
  if(attrdata) return attrdata
  if(--limit < 0) return false
  return traverseDOMForAttr(el.parentElement, attr, limit)
}

export const hex2dec = ([h, m, s]) => {
  return h + (m/60) + (s / 3600)
}

// returns duration from - to in [h, m, s]
export const duration = (from, to) =>
  moment
  .utc(
    moment.duration(
      moment(to).diff(from)
    )
    .asMilliseconds()
  )
  .format('H*m*s')
  .split('*')
  .map( _.toInteger )

export const hmsTime2Label = hms_array =>
  hms_array
  .reduce( (memo, val, pos) => {
    if(!val) return memo
    if(memo.length && val < 9) val = `0${val}`
    memo.push(`${val}${HMS_POS_MAP[pos]}`)
    return memo
  }, [])
  .join(' ')

export const googleMapsUrlFromSphereData = (sphere, zoom=15, search=true) =>
  _.chain(sphere)
  .get('exif.gps')
  .pick([
    'gps_latitude',
    'gps_latitude_ref',
    'gps_longitude',
    'gps_longitude_ref'
  ])
  .toArray()
  // picked coords are in corresponding order
  .chunk(2)
  .map( pair => [
      // S and W coords translate to negative decimals
      ~'SW'.indexOf(pair[1]) && '-' || '',
      hex2dec(pair[0])
    ].join('')
  )
  .thru( coords => {

    // google maps: gmapsurl.com/place/coords/@coords opens a place
    if(search===true)
      search = `place/${coords.join(',')}`

    // add zoom level
    coords.push(`${zoom || ''}z`)


    return [
      GOOGLE_MAPS_URL,
      search || '',
      `@${coords.join(',')}`
    ]

  })
  .compact()
  .join('/')
  .value()
