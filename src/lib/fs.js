'use strict'

const TAG = 'fs'

const spawn = require('child_process').spawn
const fs = require('fs')
const xml2js = require('xml2js')
const path = require('path')
const commandexists = require('command-exists')

const fsListDir = Rx.Observable.bindNodeCallback(fs.readdir)
const fsStatFile = Rx.Observable.bindNodeCallback(fs.lstat)
const fsRealPath = Rx.Observable.bindNodeCallback(fs.realpath)

export const readdirSync = dir => {
  try {
    return fs.readdirSync(dir)
  } catch (e) {
    return []
  }
}

export const execute = (cmd, args) =>
  new P((res, rej) => {
    console.log(TAG, 'execute', cmd, args)
    let pcs = spawn(cmd, args)
    pcs.on('error', rej)
    pcs.on('close', res)
  })

export const commandExists = cmd =>
  new P((res, rej) => {
    commandexists(cmd, (e, exists) => {
      if (e) return rej(e)
      res(exists)
    })
  })

export const readFile = file => {
  return new P((res, rej) => {
    fs.readFile(file, (err, data) => {
      if (err) return rej(err)
      res(data)
    })
  })
}

export const writeFile = (file, data) => {
  return new P((res, rej) => {
    fs.writeFile(file, data, (err, data) => {
      if (err) return rej(err)
      res(data)
    })
  })
}

export const deleteFile = file => {
  return new P((res, rej) => {
    fs.unlink(file, (err, data) => {
      if (err) return rej(err)
      res(data)
    })
  })
}

export const list = (dir, absolute = false) => {
  let list$ = fsListDir(dir)
    .flatMap(entry => entry)
  if (absolute) list$ = list$.map(entry => path.join(dir, entry))
  return list$
}

export const listWithInfo = dir => {
  // let list$ = list(dir, true)
  //  .catch( err => {
  //    console.warn('error scanning dir', dir, err)
  //    return Rx.Observable.of([])
  //  })

  // let stat$ = list$
  //  .flatMap( entry => fsStatFile(entry) )

  return list(dir, true)
  // return list$
    //  .zip( stat$, (entry, stat) => ({
    //      path: entry,
    //      parent: path.dirname(entry),
    //      name: path.basename(entry),
    //      is_file: stat.isFile(),
    //      is_dir: stat.isDirectory(),
    //      is_link: stat.isSymbolicLink(),
    //      is_socket: stat.isSocket()
    //    })
    //  )
    .catch(err => {
      console.warn('error scanning dir', dir, err)
      return Rx.Observable.from([])
    })
    .mergeMap(
      entry => fsStatFile(entry),
      // entry => {console.log('ERR?', entry); return fsStatFile(entry)},
      (entry, stat) => ({
        path: entry,
        parent: path.dirname(entry),
        name: path.basename(entry),
        is_file: stat.isFile(),
        is_dir: stat.isDirectory(),
        is_link: stat.isSymbolicLink(),
        is_socket: stat.isSocket(),
        size: stat.size,
        // https://nodejs.org/api/fs.html#fs_class_fs_stats
        // birthtime can be unavailable or on some systems
        // defautls to 0 time.. in that case just use the ctime
        created_at: stat.birthtime && stat.birthtime.getTime() > 0 ?
          stat.birthtime : stat.ctime
      })
    )
    .mergeMap(info => {
      if (!info.is_link) return Rx.Observable.of(info)
      return fsRealPath(info.path)
        .catch(err => {
          console.log('error stating link', info.path, err)
          info.error = err
          return Rx.Observable.of(null)
        })
        .mergeMap(real_path => {
          info.real_path = real_path
          if (!real_path) return Rx.Observable.of(info)
          return fsStatFile(real_path)
          .map(lstat => {
            info.link_is_file = lstat.isFile()
            info.link_is_dir = lstat.isDirectory()
            return info
          })
        })
    })
}

export const traverse = (dir, ignored = {}) => {
  return listWithInfo(dir)
    .flatMap(info => {
      if (!info.is_dir && !info.link_is_dir) { return Rx.Observable.of(info) }
      // already checked ?
      let dpath = info.real_path || info.path
      if (dpath && ignored[dpath]) {
        console.log('skipping', dpath)
      }
      if (!dpath || ignored[dpath]) {
        return Rx.Observable.of(info)
      }
      ignored[dpath] = true
      return listWithInfo(dpath)
    })
}

const _getFileDescriptor = (file) => {
  return new P((res, rej) => {
    fs.open(file, 'r', (err, fd) => {
      if (err) return rej(err)
      res(fd)
    })
  })
}

const _closeFileDescriptor = fd => {
  return new P((res, rej) => {
    fs.close(fd, (err, fd) => {
      if (err) return rej(err)
      res()
    })
  })
}

export const _readImageXMLTags = (
  file,
  tags, // {key: [starttag, endtag], key2: [...]}
  buff_len = 4000,
  max_pos = 8000
) => {
  let default_max_pos = 8000
  let result = {}

  for (let tag in tags) {
    result[tag] = {
      start_tag: tags[tag][0],
      end_tag: tags[tag][1],
      found: null
    }
  }

  max_pos = parseInt(max_pos) || default_max_pos

  let increase_max_pos_on_found =
    max_pos === default_max_pos

  let position = 0
  let length = parseInt(buff_len) || 256
  let found_all = false

  let buff = new Buffer(length)
  let read = fd => {
    return new P((res, rej) => {
      if (position > max_pos) return res('')
      fs.read(fd, buff, 0, length, position, (err, num) => {
        if (err) return rej(err)
        position += num
        if (num < length) return res(buff.slice(0, num).toString())
        res(buff.toString())
      })
    })
  }

  let getPosForTags = (string, end_tags = false) => {
    let pos = -1
    for (let key in result) {
      let ref = result[key]
      if (ref.found) continue // this one was already collected,
// console.log('testing for', key, end_tags ? ref.end_tag : ref.start_tag, string.substring(0, 200), max_pos)
      pos = string.indexOf(
        end_tags ? ref.end_tag : ref.start_tag
      )
      if (pos > -1) return { pos, key }
    }
    return { pos: -1, key: null }
  }

  let readXMLTags = fd => {
    let current = ''
    let trimmed = false
    let found = false

    let next = () => {
      return read(fd)
      .then(part => {
        if (!part.length) return
        current += part

        let pos = -1

        if (!trimmed) {
          found = getPosForTags(current, false)
          // pos = current.indexOf(start_tag)
          pos = found.pos
          if (~pos) {
            current = current.substr(pos)
            trimmed = true

            // let's be smart and increase
            // the max default if found
            if (increase_max_pos_on_found) {
              max_pos *= 20
            }
          }
          pos = -1
        } else {
          // pos = current.indexOf(end_tag)
          found = getPosForTags(current, true)
          pos = found.pos

          if (~pos) {
            // current = current.substr(0, pos + end_tag.length)
            // found = true

            let ref = result[found.key]
            // current = current.substr(0, pos + ref.end_tag.length)
            // ref.found = current
            let end_pos = pos + ref.end_tag.length
            let [
              string,
              remaining
            ] = [
              current.slice(0, end_pos),
              current.slice(end_pos)
            ]
            ref.found = string

            // all collected, or read further?
            found_all = _
              .chain(result)
              .reduce(
                (m, v, a) => m && !!v.found,
                true
              )
              .value()
            if (found_all) return
            // found one of the tag parirs,
            // reset the flags and continue..
            trimmed = false
            current = remaining
          }
        }

        return next()
      })
    }

    return next()
      .then(() =>
        _closeFileDescriptor(fd)
        .catch(err => {
          console.log('error closing fd', file, err)
        })
      )
      .then(() => {
        result.found_all = found_all
        return result
      })
  }

  return _getFileDescriptor(file)
  .then(fd => readXMLTags(fd))
}

// const _readImageXMP = (file, buff_len=256, max_pos=8000) => {
//  max_pos = parseInt(max_pos) || 8000
//
//  let position = 0
//  let length = parseInt(buff_len) || 256
//
//  let start_tag = '<x:xmpmeta'
//  let end_tag = '</x:xmpmeta>'
//
//  let buff = new Buffer(length)
//  let read = fd => {
//    return new P( (res, rej) => {
//      if(position > max_pos) return res('')
//      fs.read(fd, buff, 0, length, position, (err, num) => {
//        if(err) return rej(err)
//        position += num
//        if(num < length) return res(buff.slice(0, num).toString())
//        res(buff.toString())
//      })
//    })
//  }
//
//  let readXMP = fd => {
//    let current = ''
//    let trimmed = false
//    let found = false
//
//    let next = () => {
//      return read(fd)
//      .then( part => {
//        if(!part.length) return
//        current += part
//
//        let pos = -1
//
//        if(!trimmed) {
//          pos = current.indexOf(start_tag)
//          if(~pos) {
//            current = current.substr(pos)
//            trimmed = true
//          }
//          pos = -1
//        }
//
//        pos = current.indexOf(end_tag)
//        if(~pos) {
//          current = current.substr(0, pos + end_tag.length)
//          found = true
//          return
//        }
//
//        return next()
//      })
//    }
//
//    return next()
//      .then(
//        () => _closeFileDescriptor(fd)
//                .catch( err => {
//                  console.log('error closing fd', file, err)
//                })
//      )
//      .then( () => !found ? false : (current || false) )
//  }
//
//  return _getFileDescriptor(file)
//  .then( fd => readXMP(fd) )
// }
//
// const _extractImageXMP = (file, buff_len, max_pos) => {
//  return _readImageXMP(file, buff_len, max_pos)
//  .then( xml => {
//    if(!xml) return xml
//    return new P( (res, rej) => {
//      xml2js.parseString(xml, (err, data) => {
//        if(err) return rej(err)
//        res(_.get(data, 'x:xmpmeta.rdf:RDF[0].rdf:Description[0].$', false))
//      })
//    })
//  })
//  .then( data => {
//    if(!data) return data
//    for(let key in data) {
//      let val = data[key]
//      if(val === 'True') {
//        val = true
//      } else if(val === 'False') {
//        val = false
//      } else if(~key.indexOf('date')) {
//        val = new Date(val) || val
//      } else {
//        val = parseInt(val)
//        if(isNaN(val)) parseFloat(val)
//        if(isNaN(val)) val = data[key]
//      }
//      data[key] = val
//    }
//    return data
//  })
// }
//
//
// export const extractImageXMP = (file, buff_len, max_pos) =>
//  Rx.Observable.fromPromise( _extractImageXMP(file, buff_len, max_pos) )

const _parseXML = xml => {
  return new P((res, rej) => {
    xml2js.parseString(xml, (err, data) => {
      if (err) return rej(err)
      res(data)
    })
  })
}

export const _extractImageRDF = (file, buff_len, max_pos) => {
  // we'll read two of same tags
  // sometimes there is meta in one
  // and data in another one
  let tags = {
    first: ['<x:xmpmeta', '</x:xmpmeta>'],
    second: ['<x:xmpmeta', '</x:xmpmeta>']
  }
  return _readImageXMLTags(file, tags, buff_len, max_pos)
  .then(result => {
    return _.keys(tags).map(key => {
      let xml = _.get(result, `${key}.found`)
      if (!xml) return {}
      return _parseXML(xml)
    })
  })
  .reduce((memo, val) => {
    let extracted = _.get(val, 'x:xmpmeta.rdf:RDF[0].rdf:Description[0].$', {})
    _.merge(memo, extracted)
    return memo
  }, {})
  .then(data => {
    if (!data) return data
    for (let key in data) {
      let val = data[key]
      let vallc = _.toLower(val)
      if (vallc === 'true') {
        val = true
      } else if (vallc === 'false') {
        val = false
      } else if (~key.toLowerCase().indexOf('date')) {
        val = new Date(val) || val
      } else {
        val = parseInt(val)
        if (isNaN(val)) parseFloat(val)
        if (isNaN(val)) val = data[key]
      }
      data[key] = val
    }
    return data
  })
  .then(data => {
    return {
      file,
      is_sphere: _.get(data, 'GPano:UsePanoramaViewer', false),
      data: _.isEmpty(data) ? false : data
    }
  })
}

export const extractImageRDF = (file, buff_len, max_pos) =>
  Rx.Observable.fromPromise(_extractImageRDF(file, buff_len, max_pos))
