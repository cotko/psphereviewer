'use stict'

const del = require('del')

gulp.task(
  'clean',
  () => {
    return del([
      config.dest
    ])
  }
)
