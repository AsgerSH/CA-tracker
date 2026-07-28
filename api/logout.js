const { clearSessionHeader, sendJson } = require('./_lib');

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
    return;
  }
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionHeader() });
};