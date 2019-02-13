const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const walkFileTree = require('./walkFileTree.js');
const traverse = require('./traverse.js');
const path = require('path');
const mm = require('music-metadata');
const fs = require('fs-extra');

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  storage: 'liberry.sqlite',
  operatorsAliases: false
});

const User = sequelize.define('user', {
  username: Sequelize.STRING,
  hash: Sequelize.STRING
});

/*
const Session = sequelize.define('session', {
  username: Sequelize.STRING,
  token: Sequelize.STRING,
  expires: Sequelize.DATE
});
*/

const Track = sequelize.define('track',{
  artist: Sequelize.STRING,
  title: Sequelize.STRING,
  album: Sequelize.STRING,
  trackNumber: Sequelize.SMALLINT,
  disc: Sequelize.SMALLINT,
  path: Sequelize.STRING,
  filename: Sequelize.STRING,
  length: Sequelize.FLOAT
});

const Settings = sequelize.define('settings',{
  all: Sequelize.STRING
})

let imReady = false;

let ready = function(callback){
  if (imReady){return callback(null)}
  sequelize.sync()
    .then(db => {
      imReady = true;
      return callback(null);
    })
    .catch(er=>{
      imReady = false;
      return callback(er);
    })
}

// custom methods

// TODO what level of sanitization should be done on this string???
let trackSearch = function(s,limit,skip){
  let str = '%'+s.replace(/[%_]/g,'')+'%';
  return Track.findAll({
    where: {
      [Op.or]: [
        {artist:  {[Op.like]:str}},
        {title:   {[Op.like]:str}},
        {album:   {[Op.like]:str}},
        {filename:{[Op.like]:str}}
      ]
    },
    offset:skip,
    limit:limit,
  });
}

let getArtists = function(limit,skip,done){
  Track.aggregate('artist','DISTINCT',{
    plain:false,
    offset:skip,
    limit:limit
  })
  .map(function(row){ return row.DISTINCT })
  .then(results=>{
    return done(null,results);
  })
  .catch(e=>{
    return done(e);
  })
}

let getAlbums = function(limit,skip,done){
  Track.aggregate('album','DISTINCT',{
    plain:false,
    offset:skip,
    limit:limit
  })
  .map(function(row){ return row.DISTINCT })
  .then(results=>{
    return done(null,results);
  })
  .catch(e=>{
    return done(e);
  })
}

let getSettings = function(callback){
  Settings.findOrCreate({
      where:{
        all:{
          [Op.like]:'%{%'
        }
      },
      defaults:{
        all:`{ "musicDir" : "./music" }`
      }
    }).then((settings)=>{
      callback(null,JSON.parse(settings[0].all))
    }).catch(e=>{
      callback(e);
    })
}

let setSettings = function(settingsObject,callback){
  let settingsStr = JSON.stringify(settingsObject);

  Settings.findOne().then((settings)=>{
    settings.all = settingsStr;
    settings.save()
    .then(()=>callback(null))
    .catch(callback)
  })
  .catch(callback)
}

let setPassword = function(username,password,callback){
  User.findOrCreate({
    where:{
      username:{
        [Op.like]:username
      }
    },
    defaults:{
      username:username,hash:'a'
    }
  })
  .then(users=>{
    let u = users[0];
    u.hash = require('./auth.js').hashPassword(password);
    u.save()
    .then(u=>{
      callback(null);
    })
    .catch(callback)

  })
  .catch(callback)
}

let deleteUser = function(username,callback){
  User.findOne({
    where:{
      username:{
        [Op.like]:username
      }
    }
  }).then(u=>{
    if (!u){
      console.warn('could not find user: ',username)
      return callback(null,false);
    }
    u.destroy()
    .then(u=>{
      return callback(null,true);
    })
    .catch(callback)
  })
  .catch(callback)
}

/*
find a token, make sure the user exists, and return them.

callback is called with (er,user);
*/
let userForSession = function(token,callback){
  Session.findOne({
    where:{
      token:token,
      expires:{
        [Op.gt]:new Date()
      }
    }
  }).then(session=>{
    if (!session){
      return callback(null,null);
    }
    Users.findOne({
      where:{
        username:session.username
      }
    })
    .then(u=>{
      if(!u){
        return callback(null,null);
      }
      return callback(null,user);
    })
    .catch(callback);
  })
  .catch(callback);
}

let getAlbumArt = function(trackId,done){
  // look up track ID first

  let trackPath = null;

  Track.findOne({where:{id:trackId}})
  .then(track=>{
    trackPath = track.path;
    return mm.parseFile(track.path)
  })
  .then(metadata=>{
    let metadataPic = traverse(metadata,'common','picture',0);
    if (metadataPic){
      return done(null,metadataPic)
    }else{
      // look for .jpg or .mpg, or .png files in this dir, maybe send it
      fs.readdir(path.dirname(trackPath),(er,list)=>{
        if(er){return done(er)}
        let file = null;
        let exts = ['jpg','jpeg','png','bmp','tiff'];

        // todo break earlier
        exts.forEach(ext=>{
          list.forEach(filename=>{
            if (path.extname(filename).slice(1).toLowerCase() == ext){
              file = path.join(path.dirname(trackPath),filename);
            }
          })
        });

        if (!file){
          return done(null);
        }

        // now read and return the file
        let format = 'image/'+path.extname(file).slice(1);

        fs.readFile(file,(er,data)=>{
          if(er){return done(er)}
          return done(null,{format:format,data:data});
        })

      })
    }
  })
  .catch(e=>done(e))

}

// type is title, album, or artist
let getRandom = function(type,n,done){

  let choices = [];
  let indices = [];

  let whereStatement = {}
  whereStatement[type] = {[Op.not]:null};

  Track.count({
    where:whereStatement
  })
  .then(count=>{
    let queries = [];

    for (let i = 0; i < n; i ++){
      let row = Math.floor(Math.random()*count);
      queries.push(Track.findAll({
        where:whereStatement,
        offset:row,
        limit:1
      }))
    }

    return Promise.all(queries);
  })
  .then(sets=>{
    // flatten the sets
    let ret =[];
    sets.forEach(s=>{
      if (s.length > 0){// technically COULD be 0 if a query interrupts us
        ret.push(s[0]);
      }
    })
    return done(null,ret);
  })
  .catch(e=>{
    return done(e);
  })
}

let getAlbum = function(title,done){
  Track.findAll({
    where:{
      album:title
    }
  }).then(tracks=>{
    return done(null,tracks);
  }).catch(e=>{
    return done(e);
  })

}

let scanFilesystem = function(callback){

  let failures = [];

  let isMusic = function(filename){
    let ext = path.extname(filename).toLowerCase().slice(1);
    let musicExts = ['aiff','ape','asf','flac','mp2','mp3','mpc','mp4','m4a','m4v','aac','ogg','vob','wav'];
    for (let i = 0; i < musicExts.length; i ++){
      if (ext == musicExts[i]){
        return true;
      }
    }
    return false;
  }

  // look in fs to find files
  getSettings((er,settings)=>{
    if(er){return callback(er)}

    //remove existing entries
    Track.destroy({where:{filename:{[Op.like]:"%"}}})
    .then(()=>{

      walkFileTree(settings.musicDir,function iteratee(file,next){

        // don't index non-music
        if(!isMusic(file.path)){
          next(null);
          return;
        }

        mm.parseFile(file.path,{native:true, duration:true})
        .then(metadata=>{
          return Track.create({
            filename: path.basename(file.path),
            path: file.path,
            artist: traverse(metadata,"common","artist"),
            length: traverse(metadata,'format','duration'),
            album: traverse(metadata,'common','album'),
            trackNumber: traverse(metadata,'common','track','no'),
            title: traverse(metadata,'common','title'),
            disc: traverse(metadata, 'common','disk','no')
          })
        })
        .then(result=>{
          return next(null)
        })
        .catch(e=>{
          console.error('failed to index file: ',file.path)
          failures.push({error:e,path:file.path})
          return next();
        })


      },function done(e){

        if (failures.length > 0){
          console.warn('failed to index the following '+failures.length+' files:')
          failures.forEach(f=>{
            console.warn(f.path,'for reason',f.error);
            if(f.error.trace){
              console.warn(f.error.trace);
            }
          });
        }else{
          console.log('all files indexed successfully :)')
        }


        if(e){
          return callback(e);
        }else{
          return callback(null);
        }
      })

    })
    .catch(callback);

  });
};


module.exports =  {
  User,
  Track,
  trackSearch,
  ready,
  getSettings,
  setSettings,
  setPassword,
  deleteUser,
  userForSession,
  sequelize,
  scanFilesystem,
  getAlbumArt,
  getArtists,
  getRandom,
  getAlbum
}
