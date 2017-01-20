'use stict'

let conf = config.download

gulp.task(
  'download',
  () => {
    return gulpPlugs
      .download(conf.src)
      .pipe(gulp.dest(conf.dest))
  }
)

