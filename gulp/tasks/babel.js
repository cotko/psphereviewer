'use stict'

let conf = config.babel

gulp.task(
  'babel',
  () => {
    return gulp
      .src(conf.src)
      .pipe(gulpPlugs.if(
        config.watch,
        gulpPlugs.watch(conf.src)
      ))
      .pipe(
        gulpPlugs
        .babel(conf.conf)
        .on('error', onError('JS (bebel)'))
      )
      .pipe(gulp.dest(conf.dest))
  }
);
