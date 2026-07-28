const { getState, hasBackendConfig, isAuthed, sendJson, setState, readJson } = require('./_lib');

module.exports = async function handler(req, res){
  if(req.method === 'GET'){
    try{
      const state = await getState();
      sendJson(res, 200, { state });
    }catch(error){
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if(req.method === 'POST'){
    if(!isAuthed(req)){
      sendJson(res, 401, { error: 'Login required' });
      return;
    }
    if(!hasBackendConfig()){
      sendJson(res, 500, { error: 'Storage backend is not configured' });
      return;
    }
    try{
      const body = await readJson(req);
      if(!body || typeof body !== 'object' || typeof body.checks !== 'object'){
        sendJson(res, 400, { error: 'Invalid state payload' });
        return;
      }
      const state = { checks: body.checks };
      await setState(state);
      sendJson(res, 200, { ok: true, state });
    }catch(error){
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
};