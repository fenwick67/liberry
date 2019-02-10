const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const walkFileTree = require('./walkFileTree.js');

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  storage: 'music.sqlite',
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
let trackSearch = function(s){
  let str = '%'+s.replace(/[%_]/g,'')+'%';
  return Track.findAll({
    where: {
      [Op.or]: [
        {artist:  {[Op.like]:str}},
        {title:   {[Op.like]:str}},
        {album:   {[Op.like]:str}},
        {filename:{[Op.like]:str}}
      ]
    }
  });
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
      console.log(settings);
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

let scanFilesystem = function(callback){
  // look in fs to find files
  getSettings((er,settings)=>{
    if(er){return callback(er)}

    //remove existing entries
    Track.destroy({where:{filename:{[Op.like]:"%"}}})
    .then(()=>{

      walkFileTree(settings.musicDir,function iteratee(file,next){
        // TODO parse ID3 tags etc. first
        Track.create({
          filename:file.path
        })
        .then(()=>next())
        .catch(e=>{
          console.error(e);
          next();
        })
      },function done(e){
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
  scanFilesystem
}
