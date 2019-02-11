const klaw = require('klaw');
const through2 = require('through2');
const path = require('path');
const async = require('async');

// iteratee gets called with (path,next)

// TODO now it makes a big list of every file, then indexes them.
// really we should pipe the klaw stream into a function that calls iteratee each one
// so we don't have to keep filenames in memory. YOLO

module.exports = function(dir, iteratee, done){

  let files = [];

  klaw(dir,{depthLimit: -1})
    //.pipe(execute)
    .on('data',(item)=>{
      if (!item.stats.isDirectory()){
        files.push(item)
      }
    })
    .on('end', () => {
      // now actually iterate
      async.eachLimit(files,10,iteratee,done);
    })
    .on('error', e=>done(e));
}
