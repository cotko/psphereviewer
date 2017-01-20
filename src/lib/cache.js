'use strict'

const path = require('path')

import {
  readFile,
  writeFile,
  deleteFile
} from './fs'

const read = (file, fallback) => {
  return readFile(file)
  .then(data =>
    data instanceof Buffer ?
      data.toString('utf8')
      : data
  )
  // .then( JSON.parse )
  .then(data => {
    try { return JSON.parse(data) } catch (e) { return data }
  })
  .catch(err => {
    if (_.get(err, 'code') === 'ENOENT') {
      return fallback
    }
    return P.reject(err)
  })
}

const write = (file, data) => {
  if (data instanceof Buffer) {
    data = data.toString('utf8')
  }
  if (typeof data !== 'string') {
    data = JSON.stringify(data)
  }
  return writeFile(file, data)
}

const clear = file => {
  return deleteFile(file)
  .then(() => true)
  .catch(err => {
    if (_.get(err, 'code') === 'ENOENT') {
      return false
    }
    return P.reject(err)
  })
}

export const factory = name => {
  let file = path.join(
    nw.App.dataPath,
    `${name}.cache`
  )
  return {
    read: fallback => read(file, fallback),
    write: data => write(file, data),
    clear: () => clear(file)
  }
}
