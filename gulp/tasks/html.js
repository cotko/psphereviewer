'use stict'

let conf = config.html

gulp.task(
  'html',
  () => {
    return gulp
      .src(conf.src)
      .pipe(gulpPlugs.if(
        config.watch,
        gulpPlugs.watch(conf.src)
      ))
      .pipe(
        gulpPlugs
        .pug()
        .on('error', onError('HTML (pug)'))
      )
      .pipe(gulp.dest(conf.dest))
  }
)
