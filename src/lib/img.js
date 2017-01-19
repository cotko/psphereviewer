'use strict'

import sharp from 'sharp'

const canvasPool = () => {}
const exifreader = require('exif-reader')
import { hex2dec } from './util'

const CANVAS_POOL = []

const releaseCanvas = canvas => {
  for(let cnv of CANVAS_POOL) {
    if(canvas === cnv.canvas) {
      if(!cnv.in_use) {
        console.error('ERR wrong usage, canvas not in use!')
      }
      cnv.in_use = false
    }
  }
}

const getCanvas = () => {
  for(let cnv of CANVAS_POOL) {
    if(!cnv.in_use) {
      cnv.in_use = true
  console.log('>> reusing canvas')
      return cnv.canvas
    }
  }

  console.log('>> adding NEW  canvas to the pool')
  let canvas = document.createElement('canvas')
  CANVAS_POOL.push({
    canvas,
    in_use: true
  })

  return canvas
}

const getIMGSize = path => {
  return new P( (res, rej) => {
    let img = new Image()

    img.onerror = rej
    img.onload = () => {
      res([
        img.naturalWidth,
        img.naturalHeight
      ])
    }

    img.src = path

  })
}

export const downscaleImage = opts => {
  return getIMGSize(opts.src)
  .then( size => {
    return new P( res => {
      let type = opts.type
      let quality = opts.quality

      let tmp = new Image()
      let tmp2 = new Image()
      let canvas, context

      let [cW, cH] = size

      type = type || 'image/jpeg'
      quality = Math.min(1, Math.max(.1, quality || 0.5))
      console.log('kva je ? qualith', quality)


      tmp.src = opts.src
      tmp.onload = function() {

        //canvas = document.createElement('canvas')
        canvas = getCanvas()

        cW /= 2
        cH /= 2

        canvas.width = cW
        canvas.height = cH
        context = canvas.getContext('2d')
        context.drawImage(tmp, 0, 0, cW, cH)

        tmp2.src = canvas.toDataURL(type, quality)

        releaseCanvas(canvas)
        if (cW <= opts.maxWidth || cH <= opts.maxHeight) {
          res(tmp2.src)
        } else {
          tmp.src = tmp2.src //recursion
        }
      }
    })
  })
}

export const resizeUsingSharp = opts => {
  let image
  return new P( (res, rej) => {
    // TODO: quality etc?
    image = sharp(opts.file)

    //if(opts.size || !(opts.width && opts.height)) {
      image
        .metadata()
        .then( info => {
          let ret = []
          let size = opts.size || 300
          if(opts.width && opts.height) ret.push(opts.width, opts.height)
          else if(info.width > info.height) ret.push(null, size)
          else ret.push(size, null)
          ret.push(info)
          res(ret)
        })
        .catch( rej )
    //  return
    //}
    //res([opts.maxWidth, opts.maxHeight])
  })
  .then( ([ width, height, meta ]) =>
    new P( (res, rej) =>
      image
      .resize(width, height)
      .toBuffer( (err, buff, info) => {
        if(err) return rej(err)
        res({
          exif: parseExif(meta.exif),
          format: meta.format,
          width: meta.width,
          height: meta.height,
          thumbnail: {
            thumb: `data:image/${info.format};base64,${buff.toString('base64')}`,
            width: info.width,
            height: info.height,
          }
        })
      })
    )
  )
}

export const thumbnailAndExif = (file, quality, type, width, height) =>
  resizeUsingSharp({
    type,
    quality,
    file,
    size: width && !height ? width : undefined,
    maxWidth: width || 250,
    maxHeight: height || 250
  })

export const thumbnailSlow = (file, quality, type, width, height) =>
  downscaleImage({
    type,
    quality,
    src: `file:///${file}`,
    maxWidth: width || 250,
    maxHeight: height || 250
  })


export const parseExif = exif => {
  if(!exif) return false
  try {
    let parsed = exifreader(exif)
    let gps = _.get(parsed, 'gps')
    if(gps) {
      let lat = _.get(gps, 'GPSLatitude')
      let lon = _.get(gps, 'GPSLongitude')
      if(lat) _.set(gps, 'GPSLatitudeDec', hex2dec(lat))
      if(lon) _.set(gps, 'GPSLongitudeDec', hex2dec(lon))
    }
    // map keys to snake case for each object
    // in parsed exif
    for(let key of Object.keys(parsed))
      parsed[key] = _.mapKeys(parsed[key], (val, key) => _.snakeCase(key) )
    return parsed
  } catch (e) {
    return false
  }
}
