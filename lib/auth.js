const db = require('./db.js');
const bcrypt = require('bcryptjs');
const LocalStrategy = require('passport-local').Strategy

function Strategy(){
  return new LocalStrategy(
    function(username, password, done) {
      db.User.findOne({where: {username: username} })
      .then(user=>{
         if (!user) {
           console.log('user not found')
           return done(null, false);
         }

         bcrypt.compare(password, user.hash,function(err,matches){
           if (!matches){
             console.log('wrong pass')
             return done(null, false);
           }else{
             console.log('right pass')
             return done(null, user);
           }
         });
      })
      .catch(e=> done(e,false))
    }
  )
}

function ensureAuthenticated(req,res,next){
  if (!req.user){
    res.status(403);
    return res.send('You are not logged in');
  }
  else{
    return next();
  }
}

// synchronous password hashing
function hashPassword(p){
  return bcrypt.hashSync(p);
}

module.exports = {
  ensureAuthenticated, Strategy, hashPassword
}
