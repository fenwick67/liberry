const klaw = require('klaw');
const through2 = require('through2');
const path = require('path');

// iteratee gets called with (path,next)
module.exports = function(dir, iteratee, done){

  const excludeDirFilter = through2.obj(function (item, enc, next) {
    if (!item.stats.isDirectory()){
      this.push(item);
    }
    next();
  })

  const execute = through2.obj(function (item, enc, next) {
    this.push(item);
    if (!item.stats.isDirectory()){
      iteratee(item,next);
    }else{
      next();
    }
  })

  klaw(dir,{depthLimit: -1})
    .pipe(excludeDirFilter)
    .pipe(execute)
    .on('end', () => done(null))
    .on('error', e=>done(e));
}
