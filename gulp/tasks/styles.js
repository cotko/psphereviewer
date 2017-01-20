'use stict'

let conf = config.styles

gulp.task(
  'styles',
  () => {
    let run = () => {
      return gulp
        .src(conf.src)
        .pipe(
          gulpPlugs
          .less()
          .on('error', onError('CSS (less)'))
        )
        .pipe(gulp.dest(conf.dest))
    }

    if (config.watch) {
      gulpPlugs.watch(conf.src_watch, run)
    }

    return run()
  }
)
