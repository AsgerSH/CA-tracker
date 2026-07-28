const crypto = require('crypto');

const STATE_KEY = 'ca-tracker-state-v1';
const SESSION_COOKIE = 'ca_tracker_admin';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function config(){
  const redisUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const authSecret = process.env.AUTH_SECRET || '';
  return { redisUrl, redisToken, adminPassword, authSecret };
}

function hasBackendConfig(){
  const c = config();
  return !!(c.redisUrl && c.redisToken);
}

function getMissingBackendConfig(){
  const c = config();
  const missing = [];
  if(!c.redisUrl) missing.push('UPSTASH_REDIS_REST_URL');
  if(!c.redisToken) missing.push('UPSTASH_REDIS_REST_TOKEN');
  return missing;
}

function hasAuthConfig(){
  const c = config();
  return !!(c.adminPassword && c.authSecret);
}

function getMissingAuthConfig(){
  const c = config();
  const missing = [];
  if(!c.adminPassword) missing.push('ADMIN_PASSWORD');
  if(!c.authSecret) missing.push('AUTH_SECRET');
  return missing;
}

function sendJson(res, status, payload, headers = {}){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function readJson(req){
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if(!raw){ resolve({}); return; }
      try{
        resolve(JSON.parse(raw));
      }catch(error){
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(header){
  return (header || '').split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if(index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if(key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function base64Url(input){
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function hmac(input){
  const { authSecret } = config();
  return crypto.createHmac('sha256', authSecret).update(input).digest('base64url');
}

function createSessionToken(){
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(exp);
  return `${payload}.${hmac(payload)}`;
}

function verifySessionToken(token){
  const { authSecret } = config();
  if(!token || !authSecret) return false;
  const [payload, signature] = token.split('.');
  if(!payload || !signature) return false;
  const exp = Number(payload);
  if(!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if(a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isAuthed(req){
  const cookies = parseCookies(req.headers.cookie || '');
  return verifySessionToken(cookies[SESSION_COOKIE]);
}

function cookieAttributes(maxAge){
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if(process.env.VERCEL || process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

function sessionHeader(token){
  return cookieAttributes(SESSION_SECONDS).replace(`${SESSION_COOKIE}=`, `${SESSION_COOKIE}=${encodeURIComponent(token)}`);
}

function clearSessionHeader(){
  return cookieAttributes(0);
}

async function redisRequest(command, args = [], options = {}){
  const { redisUrl, redisToken } = config();
  if(!redisUrl || !redisToken) throw new Error('Redis backend is not configured');
  const method = options.method || 'POST';
  const headers = { Authorization: `Bearer ${redisToken}` };
  const init = { method, headers };
  if(method === 'GET'){
    const url = `${redisUrl}/${command}/${args.map(part => encodeURIComponent(String(part))).join('/')}`;
    const response = await fetch(url, init);
    const text = await response.text();
    let data = null;
    try{ data = text ? JSON.parse(text) : null; }catch(error){ /* ignore */ }
    if(!response.ok || (data && data.error)) throw new Error((data && data.error) || text || `Upstash ${response.status}`);
    return data ? data.result : null;
  }

  init.headers['Content-Type'] = 'application/json';
  init.body = JSON.stringify([command.toUpperCase(), ...args.map(part => String(part))]);
  const response = await fetch(redisUrl, init);
  const text = await response.text();
  let data = null;
  try{ data = text ? JSON.parse(text) : null; }catch(error){ /* ignore */ }
  if(!response.ok || (data && data.error)) throw new Error((data && data.error) || text || `Upstash ${response.status}`);
  return data.result;
}

async function getState(){
  if(!hasBackendConfig()) throw new Error('State backend is not configured');
  const raw = await redisRequest('get', [STATE_KEY]);
  if(!raw) return { checks: {} };
  try{
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed === 'object') return parsed;
  }catch(error){
    return { checks: {} };
  }
  return { checks: {} };
}

async function setState(state){
  if(!hasBackendConfig()) throw new Error('State backend is not configured');
  await redisRequest('set', [STATE_KEY, JSON.stringify(state)]);
  return state;
}

module.exports = {
  clearSessionHeader,
  createSessionToken,
  getMissingBackendConfig,
  getState,
  hasAuthConfig,
  hasBackendConfig,
  getMissingAuthConfig,
  isAuthed,
  readJson,
  sendJson,
  setState,
  sessionHeader,
  verifySessionToken,
};