'use strict'

global._ = require('lodash')
global.P = require('bluebird')
global.gulp = require('gulp')
global.gulpPlugs = require('gulp-load-plugins')()

const requireDir = require('require-dir')
const path = require('path')

exports = module.exports = (conf) => {
  let watch = _
    .chain(process.argv)
    .map(v => v.toLowerCase())
    .indexOf('--watch')
    .thru(idx => !!~idx)
    .value()

  console.log('runngin gulp, watching:', watch)

  let src = _.get(conf, 'src', './src')
  let dest = _.get(conf, 'dest', './dest')

  let nmpath = path.join(
    __dirname,
    '..',
    'node_modules'
  )

  let fapaths = {
    css: path.join(nmpath, 'font-awesome', 'css'),
    font: path.join(nmpath, 'font-awesome', 'fonts')
  }

  let ospaths = {
    css: path.join(nmpath, 'open-sans-fontface'),
    font: path.join(nmpath, 'open-sans-fontface', 'fonts')
  }

  global.onError = tag => {
    return err => {
      console.log(err)
      gulpPlugs.notify.onError(`${tag} err\n<%= error.message %>`)(err)
    }
  }

  global.config = _.merge({
    watch,
    src,
    dest,
    download: {
      dest: path.join(src, 'vendor'),
      // vendor files
      src: [
        'three.min.js',
        'photo-sphere-viewer.js'
      ].map(script =>
        `https://raw.githubusercontent.com/JeremyHeleine/Photo-Sphere-Viewer/master/${script}`
      )
    },
    html: {
      src: `${src}/ui/pug/**/*.pug`,
      dest: `${dest}/html`
    },
    styles: {
      src: `${src}/ui/styles/index.less`,
      dest: `${dest}/css`,
      src_watch: [`${src}/ui/styles/**/*.less`]
    },
    babel: {
      src: [
        `${src}/**/*.jsx`,
        `${src}/**/*.js`
      ],
      dest: `${dest}`,
      conf: {
        presets: ['react'],
        plugins: [
          ['transform-es2015-modules-commonjs', {
            'allowTopLevelThis': false,
            'strict': false,
            'loose': false
          }]
        ]
      }
    },
    copy: {
      watch: true,
      srcs: [{
        src: `${src}/ui/styles/vendor/**/*.css`,
        dest: `${dest}/css/vendor`
      }, {
        src: `${src}/ui/fonts/**/*`,
        dest: `${dest}/fonts`
      }, {
        src: `${fapaths.css}/font-awesome.css`,
        dest: `${dest}/css`
      }, {
        src: `${fapaths.font}/**/*`,
        dest: `${dest}/fonts`
      }, {
        src: `${src}/ui/img/**/*`,
        dest: `${dest}/img`
      }, {
        src: `${ospaths.font}/**/*`,
        dest: `${dest}/fonts`
      }, {
        src: `${ospaths.css}/**/open-sans.less`,
        dest: `${src}/ui/styles/font/`,
        pipe: gulpPlugs.replace(`"./fonts"`, `"../fonts"`)
      }]
    }
  }, conf)

  // require all tasks
  requireDir('./tasks', { recurse: true })
}
