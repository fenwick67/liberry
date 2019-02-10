module.exports = function sameOriginMiddleware(configuredOrigin){

  return function(req,res,next){
    if (configuredOrigin && configuredOrigin!= '*' && req.get('origin') && req.get('origin') != configuredOrigin){
      res.status(403);
      res.send();
    }else{
      next();
    }
  }

}
