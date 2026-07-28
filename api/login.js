const { createSessionToken, getMissingAuthConfig, hasAuthConfig, readJson, sendJson, sessionHeader } = require('./_lib');

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
    return;
  }

  if(!hasAuthConfig()){
    const missing = getMissingAuthConfig();
    sendJson(res, 500, { error: missing.length ? `Auth backend is not configured. Missing: ${missing.join(', ')}` : 'Auth backend is not configured' });
    return;
  }

  try{
    const body = await readJson(req);
    const password = (body && body.password ? String(body.password) : '').trim();
    if(password !== (process.env.ADMIN_PASSWORD || '')){
      sendJson(res, 401, { error: 'Invalid password' });
      return;
    }
    const token = createSessionToken();
    sendJson(res, 200, { ok: true, authenticated: true }, { 'Set-Cookie': sessionHeader(token) });
  }catch(error){
    sendJson(res, 400, { error: error.message });
  }
};