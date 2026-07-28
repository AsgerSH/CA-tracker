const { isAuthed, sendJson } = require('./_lib');

module.exports = async function handler(req, res){
  if(req.method !== 'GET'){
    sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
    return;
  }
  sendJson(res, 200, { authenticated: isAuthed(req) });
};