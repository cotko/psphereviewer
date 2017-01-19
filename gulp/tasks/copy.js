'use stict'

let conf = config.copy

gulp.task(
  'copy',
  () => {
    let promises = []
    for(let cpy of conf.srcs) {
      //console.log(cpy.src, cpy.dest)
      let job = gulp.src(cpy.src)
      if(conf.watch) job = gulpPlugs.watch(cpy.src)
      if(cpy.pipe) job = job.pipe(cpy.pipe)
      job = job.pipe(gulp.dest(cpy.dest))
      promises.push( job )
    }
    return P.all(promises)
  }
);
