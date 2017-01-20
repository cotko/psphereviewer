'use strict'

const cache = require('./cache')
  .factory('sphere')

// cache.clear().then( a => console.log('CACHECLEARED %s', a) )

cache.read({})
  .then(data => {
    console.log('shpere cache', data)

    cache.write('kvaje')

    // cache.write({
    //  kba: 23,
    //  werwer: 3,
    //  a: [2,5,5,4,424,2],
    //  name: 'kvaje name?'
    // })
  }
)

