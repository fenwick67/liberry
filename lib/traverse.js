/*

traverse an object and get sequential keys, or null

EX:

var o = {
  deep:{
    nested:{
      object:'value'
    }
  }
}

traverse(o,'deep','nested','object')
// => 'value'

traverse(o,'some','keys','it','does','not','have')
// => null

*/

module.exports = function(obj,...keys){

  let currObj = obj;

  for (let i = 0; i < keys.length; i ++){
    if(typeof(currObj) == 'undefined' || currObj === null ){
      return null;
    }
    currObj = currObj[keys[i]];
  }

  if(typeof(currObj) == 'undefined' || currObj === null ){
    return null;
  }

  return currObj;

}
