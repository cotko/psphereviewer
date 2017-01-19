'use strict'

const TAG = 'LNG'

import { readdirSync } from './fs'

export const register = (locales_dir, register_to, locales) => {

  locales = _
    .chain(locales)
    .toArray()
    .concat(
      readdirSync(locales_dir)
      .map( l => l.split('.json').shift() )
    )
    .uniq()
    .value()


  console.debug(TAG, 'register locales', locales)

  let i18n = require('i18n')

  i18n.configure({
    // setup some locales - other locales default to en silently
    locales,

    // fall back from Dutch to German
    fallbacks:{'nl': 'de'},

    // you may alter a site wide default locale
    //defaultLocale: 'de',

    // where to store json files - defaults to './locales' relative to modules directory
    directory: locales_dir,

    // watch for changes in json files to reload locale on updates - defaults to false
    autoReload: false,

    // whether to write new locale information to disk - defaults to true
    updateFiles: true,

    // sync locale information accros all files - defaults to false
    syncFiles: true,

    // what to use as the indentation unit - defaults to "\t"
    indent: "\t",

    // setting extension of json files - defaults to '.json' (you might want to set this to '.js' according to webtranslateit)
    extension: '.json',

    // setting prefix of json files name - default to none '' (in case you use different locale files naming scheme (webapp-en.json), rather then just en.json)
    prefix: '',

    // enable object notation
    objectNotation: true,

    // setting of log level DEBUG - default to require('debug')('i18n:debug')
    logDebugFn: function (msg) {
        console.debug('i18n', msg)
    },

    // setting of log level WARN - default to require('debug')('i18n:warn')
    logWarnFn: function (msg) {
        console.warn('i18n', msg)
    },

    // setting of log level ERROR - default to require('debug')('i18n:error')
    logErrorFn: function (msg) {
        console.error('i18n', msg);
    },

    // object or [obj1, obj2] to bind the i18n api and current locale to - defaults to null
    register: register_to,

    // hash to specify different aliases for i18n's internal methods to apply on the request/response objects (method -> alias).
    // note that this will *not* overwrite existing properties with the same name
    api: {
      '__': 't',  //now req.__ becomes req.t
      '__n': 'tn' //and req.__n can be called as req.tn
    },

    // Downcase locale when passed on queryParam; e.g. lang=en-US becomes
    // en-us.  When set to false, the queryParam value will be used as passed;
    // e.g. lang=en-US remains en-US.
    preserveLegacyCase: true
  })
}
