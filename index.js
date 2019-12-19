const db = require('./lib/db.js');
const auth = require('./lib/auth.js');
const ensureAuthenticated = require('./lib/auth.js').ensureAuthenticated;
const SameOriginMiddleware = require('./lib/sameOrigin.js');
const argv = require('yargs').argv;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressSession = require("express-session");
const passport = require('passport')
const _ = require('lodash');

const ecstatic = require('ecstatic');
const express = require('express');
const SequelizeStore = require('connect-session-sequelize')(expressSession.Store);

let dieError = (er)=>{if(er){
  console.error("FATAL APPLICATION ERROR: ")
  console.error(er);
  process.exit(1);
}}

function startServer(settings){

  if (!settings.sessionSecret && !settings.sessionsecret){
    console.error('YOU NEED TO SET A SESSION SECRET')
    console.error('use `--set sessionSecret=SOME_SECRETY_THING`')
    process.exit(1);
  }

  let origin = settings.origin || null;
  let app = express();
  let sessionStore = new SequelizeStore({
    db:db.sequelize
  });

  app.use(SameOriginMiddleware(settings.origin));

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({extended:false}));
  app.use(expressSession({
    secret: settings.sessionSecret || settings.sessionsecret,
    resave:false,
    saveUninitialized:true,
    maxAge:1000*60*60*24*28,// 4 weeks
    store:sessionStore
  }));

  sessionStore.sync();

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user.username);
  });

  passport.deserializeUser(function(id, done) {
    db.User.findOne({where:{username:id}})
    .then(u=> done(null,u))
    .catch(e=> done(e))
  });

  passport.use(auth.Strategy());

  app.post('/login', passport.authenticate('local',
    { successRedirect: '/',  failureRedirect: '/login' }
  ));

  app.get('/',function(req,res,next){
    if(!req.user){
      res.redirect('/login');
    }else{
      res.redirect('/index.html');
    }
  })

  // serve public files
  app.use(ecstatic({
    root:'./public'
  }));

  // authenticated routes
  app.use(ensureAuthenticated);

  // serve audio
  app.use(ecstatic({
    baseDir:'music',
    root:settings.musicDir
  }));

  // API

  let makeApiTrack = function(track){
      let t = {}
      let keys = ['artist','title','album','trackNumber','length','id','disc'];
      keys.forEach(key=>{
        t[key]=track[key]
      });

      t.artUrl = '/api/albumArt/'+track.id;
      t.url = '/music/' + require('path').relative(settings.musicDir,track.path);
      return t;
  }

  app.get('/api/search',function(req,res){
    if (!req.query){
      res.status(400);
      return res.send('you forgot a query');
    }
    var stringQuery = req.query.q;
    if (typeof stringQuery != 'string' || stringQuery.length < 1){
      res.status(400);
      return res.send('you forgot a query');
    }

    var limit = Number(req.query.limit) || 100;
    var skip = Number(req.query.skip) || 0;

    db.trackSearch(stringQuery,limit,skip)
    .then(tracks=>{
      res.status(200)
      if (!tracks.length){
        return res.json([]);
      }

      let ts = tracks.map(makeApiTrack);

      return res.json(ts);
    })
    .catch(e=>{
      console.error(e)
      console.error(e.trace)
      res.status(500)
      return res.send(e)
    })

  })

  app.get('/api/albumart/:trackId',function(req,res){
    if (!req.params.trackId){
      res.status(400);
      return res.send('whoops, no track ID in URL')
    }

    db.getAlbumArt(req.params.trackId,(er,art)=>{
      if(er){
        res.status(500);
        console.error(er);
        res.send(er);
        return;
      }

      if(!art){
        res.status(404);
        res.send();
        return;
      }

      res.status(200);
      if(art.format){
        res.header("Content-Type", art.format);
      }
      res.send(art.data);
    });

  })

  app.get('/api/artists',function(req,res){
    let limit = 100000;
    let skip = 0;

    if (req.query){
      if(req.query.skip){
        skip = Number(req.query.skip)||skip;
      }
      if(req.query.limit){
        limit = Number(req.query.limit)||limit;
      }
    }

    db.getArtists(limit,skip,(er,artists)=>{
      if(er){
        res.status(500);
        return res.send(er);
      }
      res.status(200);
      let a = artists.length?artists:[];
      res.json(a);
    })
  })

  let handleRandoms = function(req,res,type){
    let count = 5;

    if (req.query){
      if(req.query.count){
        count = Number(req.query.count)||count;
      }
    }

    db.getRandom(type,count,(er,tracks)=>{
      if(er){
        res.status(500);
        return res.send(er);
      }
      res.status(200);
      let t = tracks.length?tracks:[];
      res.json(t.map(makeApiTrack));
    })
  }

  app.get('/api/randomAlbums',function(req,res){
    handleRandoms(req,res,'album');
  })

  app.get('/api/randomTracks',function(req,res){
    handleRandoms(req,res,'title');
  })

  app.get('/api/randomArtists',function(req,res){
    handleRandoms(req,res,'artist');
  })

  app.get('/api/album',function(req,res){
    if (!req.query || !req.query.title){
      res.status(400);
      return res.send('you forgot a ?title=')
    }

    db.getAlbum(req.query.title,(er,set)=>{
      if(er){
        console.error(er);
        res.status(500);
        return res.send(er);
      }
      if (!set || set.length < 1){
        res.status(404);
        return res.send();
      }
      console.log(set);
      res.status(200);
      let track1 = makeApiTrack(set[0]);
      return res.json({
        title:track1.album,
        artUrl:track1.artUrl,
        artist:track1.artist,
        tracks:_.sortBy(set.map(makeApiTrack),'disc','trackNumber')
      });
    })
  })

  app.get('/api/albums',function(req,res){
    let limit = 100000;
    let skip = 0;

    if (req.query){
      if(req.query.skip){
        skip = Number(req.query.skip)||skip;
      }
      if(req.query.limit){
        limit = Number(req.query.limit)||limit;
      }
    }

    db.getAlbums(limit,skip,(er,albums)=>{
      if(er){
        res.status(500);
        return res.send(er);
      }
      res.status(200);
      let a = albums.length?albums:[];
      res.json(a);
    })
  })


  app.post('/api/reindex',function(req,res){
    db.scanFilesystem(er=>{
      if(er){
        res.status(500);
        res.send(er);
      }else{
        res.status(200)
        res.send();
      }
    })
  });


  let port = process.env.PORT || settings.port || 8080;
  let host = process.env.HOST || settings.host || '127.0.0.1';

  app.listen(port,host,function(){
    console.log('listening on ',host,':',port,', origin is ',settings.origin);
  })

}

// NOTE: server settings changes will require restart (oh well)
db.ready(er=>{
  dieError(er);

  // set a setting
  if (argv['set']){

    if(typeof argv['set'] !='string'){
      console.error('please specify like this: --set setting=value')
      process.exit(1)
    }

    let splitStr = argv['set'].split('=');
    let key = splitStr.shift();
    let value = splitStr.join('=');

    if(typeof key !='string' || typeof value != 'string' || key.length < 1 || value.length < 1 ){
      console.error('please specify like this: --set setting=value')
      process.exit(1)
    }

    db.getSettings((er,settings)=>{
      dieError(er);
      settings[key] = value;
      db.setSettings(settings,(er)=>{
        dieError(er);
        console.log('set setting ',key,' to ',value);
        console.log('settings are now :','\n',JSON.stringify(settings,null,2))
        process.exit(0);
      })
    })
  }

  // clear a setting
  else if (argv['clear']){
    let key = argv['clear']

    db.getSettings((er,settings)=>{
      dieError(er);
      delete settings[key];
      db.setSettings(settings,(er)=>{
        dieError(er);
        console.log('cleared setting ',key);
        console.log('settings are now :','\n',JSON.stringify(settings,null,2))
        process.exit(0);
      })
    })
  }

  // read settings
  else if (argv['settings']){

    db.getSettings((er,settings)=>{
      dieError(er);
      console.log('settings are:','\n',JSON.stringify(settings,null,2));
    })
  }

  else if (argv['index']){
    db.scanFilesystem(er=>{
      dieError(er);
      console.log('indexed music')
    })
  }

  // set a user's password
  else if (argv['set-password']){
    let username = argv['set-password'];
    let password = argv._[0];
    db.setPassword(username,password,function(e){
      dieError(e);
      console.log('password set for user ',username);
      process.exit(0);
    })
  }

  // delete a user
  else if (argv['delete-user']){
    let username = argv['delete-user'];
    db.deleteUser(username,(er,existed)=>{
      dieError(er);
      if(existed){
        console.log('deleted user ',username);
      }else{
        console.log('could not find user ',username);
      }
      process.exit(0);
    })
  }

  else{
    db.getSettings((er,settings)=>{
      dieError(er);
      startServer(settings);
    })
  }

})
