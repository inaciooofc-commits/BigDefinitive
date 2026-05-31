#!/usr/bin/env node
'use strict';

try { require('dotenv').config(); } catch (_) {}

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const http = require('http');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
let google = null;
try { google = require('googleapis').google; } catch (_) { google = null; }
let helmet = null, cors = null, morgan = null;
try { helmet = require('helmet'); } catch (_) {}
try { cors = require('cors'); } catch (_) {}
try { morgan = require('morgan'); } catch (_) {}

const APP_NAME = 'Big';
const PORT = Number(process.env.PORT || 8088);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const LOG_DIR = process.env.LOG_DIR || path.join(ROOT, 'logs');
const JWT_TTL = process.env.JWT_TTL || '7d';
const MAX_LOGS = 4000;
const MAX_CHAT = 500;
const MAX_PRIVATE_MESSAGES = 3000;

const files = {
  config: 'config.json',
  users: 'users.json',
  logs: 'logs.json',
  chat: 'chat.json',
  parties: 'parties.json',
  store: 'store.json',
  catalog: 'catalog.json',
  announcements: 'announcements.json',
  sessions: 'sessions.json',
  privateMessages: 'private-messages.json',
  sheetsSync: 'sheets-sync.json',
  secret: 'secret.txt'
};

const defaultConfig = {
  appName: 'Big',
  creator: 'Colômbia',
  company: 'Cl Inc. Enterteiments',
  ageRating: '+16',
  localEmailDomain: 'big.x',
  theme: 'Cyber Beach',
  primaryColor: '#8b5cf6',
  secondaryColor: '#06b6d4',
  accentColor: '#ec4899',
  logoText: 'Big',
  loadingPhrases: ['Conectando sua vibe...', 'Preparando sua party...', 'Sincronizando o mundo Big...', 'Sua noite começa aqui...'],
  modules: { music:true, chat:true, party:true, games:true, shop:true, ranking:true, events:true, missions:true, fakeMoney:true, globalNotices:true },
  allowedGameDomains: ['poki.com', 'crazygames.com', 'itch.io', 'html5.gamedistribution.com'],
  apiProviders: [
    { name: 'Music Provider', key: '', active: false, status: 'não configurada' },
    { name: 'Games Provider', key: '', active: false, status: 'não configurada' }
  ],
  texts: {
    welcome: 'Big conecta música, jogos e amigos.',
    rating: '+16',
    about: 'Criado por Colômbia. Produzido por Cl Inc. Enterteiments.'
  },
  googleSheets: {
    enabled: String(process.env.GOOGLE_SHEETS_ENABLED || 'false').toLowerCase() === 'true',
    spreadsheetId: process.env.GOOGLE_SHEETS_ID || '',
    ownerEmail: process.env.GOOGLE_OWNER_EMAIL || '',
    serviceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/google-service-account.json',
    lastBootstrap: null,
    lastSync: null,
    tabs: []
  }
};

const defaultStore = [
  { id:'avatar-cyber-beach', name:'Avatar Cyber Beach', category:'Avatar', price:850, rarity:'Épico', active:true },
  { id:'moldura-pink-storm', name:'Moldura Pink Storm', category:'Moldura', price:620, rarity:'Raro', active:true },
  { id:'tema-neon-night', name:'Tema Neon Night', category:'Tema', price:1200, rarity:'Lendário', active:true },
  { id:'reacao-onda-sonora', name:'Reação Onda Sonora', category:'Reação', price:320, rarity:'Comum', active:true },
  { id:'fundo-summer-party', name:'Fundo Summer Party', category:'Fundo Party', price:980, rarity:'Épico', active:true }
];

const defaultCatalog = {
  songs: [
    { id:'neon-beach-opening', title:'Neon Beach Opening', artist:'Colômbia Radio Lab', source:'local-demo', url:'' },
    { id:'moonlight-party-sync', title:'Moonlight Party Sync', artist:'Big Sound System', source:'local-demo', url:'' },
    { id:'cyan-summer-protocol', title:'Cyan Summer Protocol', artist:'Cl Inc. Sessions', source:'local-demo', url:'' }
  ],
  games: [
    { id:'arcade-neon-runner', title:'Arcade Neon Runner', category:'Corrida', url:'', description:'Jogo configurável por URL segura no painel admin.' },
    { id:'puzzle-ocean-grid', title:'Puzzle Ocean Grid', category:'Puzzle', url:'', description:'Iframe/link liberado pelo admin.' },
    { id:'cyber-ball-arena', title:'Cyber Ball Arena', category:'Multiplayer', url:'', description:'Sala gratuita externa configurável.' }
  ],
  events: [
    { id:'festival-neon-night', title:'Festival Neon Night', description:'Evento de música com ranking de participação.', time:'Hoje' },
    { id:'semana-cyber-beach', title:'Semana Cyber Beach', description:'Missões dobradas e itens temporários.', time:'7 dias' }
  ],
  missions: [
    { id:'party-daily', title:'Missão diária', description:'Entre em uma party hoje e ganhe 120 BIG', reward:120 },
    { id:'chat-live', title:'Chat vivo', description:'Envie 5 mensagens no chat global', reward:80 }
  ],
  banners: ['Big conecta música, jogos e amigos.']
};

const runtime = {
  startedAt: Date.now(),
  sockets: new Map(),
  lastCpu: os.cpus(),
  requests: [],
  messagesThisMinute: [],
  openGames: 0
};

function p(fileKey) { return path.join(DATA_DIR, files[fileKey] || fileKey); }
function nowISO() { return new Date().toISOString(); }
function id(prefix='id') { return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`; }
function safeString(v, max=500) { return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
function slugName(raw) {
  const cleaned = safeString(raw, 80).toLowerCase().replace(/@big\.x$/i, '').replace(/^admin@/i, '').replace(/\s+/g, '').replace(/[^a-z0-9._-]/g, '');
  return cleaned || 'membro';
}
function parseUserInput(raw) {
  const text = safeString(raw, 80).toLowerCase().replace(/\s+/g, '');
  const isAdmin = /^admin@/.test(text);
  const username = slugName(text);
  return { username, role: isAdmin ? 'admin' : 'common', email: `${username}@big.x` };
}
function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  const banned = u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now();
  return { ...rest, banned: Boolean(banned) };
}
function logLine(level, text) {
  const line = `[${new Date().toLocaleString('pt-BR')}] ${level.toUpperCase()} ${text}\n`;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFile(path.join(LOG_DIR, 'server.log'), line, () => {});
}
async function ensureDirs() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(LOG_DIR, { recursive: true });
}
async function exists(file) { try { await fsp.access(file); return true; } catch { return false; } }
async function readJson(key, fallback) {
  try {
    const raw = await fsp.readFile(p(key), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return structuredCloneCompat(fallback);
  }
}
function structuredCloneCompat(obj) { return obj == null ? obj : JSON.parse(JSON.stringify(obj)); }
async function writeJson(key, data) {
  await ensureDirs();
  const file = p(key);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}
async function secret() {
  await ensureDirs();
  if (!(await exists(p('secret')))) await fsp.writeFile(p('secret'), crypto.randomBytes(48).toString('hex'));
  return safeString(await fsp.readFile(p('secret'), 'utf8'), 200);
}
async function addLog(type, text, actor='system') {
  const logs = await readJson('logs', []);
  logs.unshift({ id:id('log'), type, text:safeString(text, 1200), actor:safeString(actor, 120), time: nowISO() });
  await writeJson('logs', logs.slice(0, MAX_LOGS));
}
async function bootstrap() {
  await ensureDirs();
  if (!(await exists(p('config')))) await writeJson('config', defaultConfig);
  if (!(await exists(p('store')))) await writeJson('store', defaultStore);
  if (!(await exists(p('catalog')))) await writeJson('catalog', defaultCatalog);
  if (!(await exists(p('chat')))) await writeJson('chat', { global: [], party: [] });
  if (!(await exists(p('parties')))) await writeJson('parties', []);
  if (!(await exists(p('announcements')))) await writeJson('announcements', []);
  if (!(await exists(p('sessions')))) await writeJson('sessions', []);
  if (!(await exists(p('privateMessages')))) await writeJson('privateMessages', []);
  if (!(await exists(p('sheetsSync')))) await writeJson('sheetsSync', { enabled:false, spreadsheetId:'', lastSync:null, errors:[] });
  if (!(await exists(p('logs')))) await writeJson('logs', []);
  let users = await readJson('users', []);
  if (!Array.isArray(users) || users.length === 0) {
    const admin = await makeUser('admin@clzin', 'clzin123', { money: 9999 });
    users = [admin];
    await writeJson('users', users);
    await addLog('bootstrap', 'Admin inicial criado: clzin@big.x / senha clzin123', 'system');
  }
  await secret();
}
async function makeUser(rawName, password='big123', extra={}) {
  const parsed = parseUserInput(rawName);
  const passwordHash = await bcrypt.hash(String(password || 'big123'), 10);
  return {
    id: id('usr'),
    username: parsed.username,
    email: parsed.email,
    role: parsed.role,
    passwordHash,
    money: Number(extra.money ?? 2450),
    avatar: parsed.username.slice(0,1).toUpperCase() || 'B',
    inventory: [],
    badges: parsed.role === 'admin' ? ['admin', 'founder-control'] : [],
    bannedUntil: null,
    banReason: '',
    createdAt: nowISO(),
    lastLogin: null,
    online: false,
    stats: { songs:0, parties:0, messages:0, games:0, moneyEarned:0 },
    ...extra
  };
}
async function findUserByLogin(login) {
  const users = await readJson('users', []);
  const normalized = safeString(login, 100).toLowerCase().replace(/\s+/g, '');
  const name = slugName(normalized);
  return users.find(u => u.email.toLowerCase() === normalized || u.username.toLowerCase() === name);
}
async function saveUser(updated) {
  const users = await readJson('users', []);
  const idx = users.findIndex(u => u.id === updated.id);
  if (idx >= 0) users[idx] = updated;
  await writeJson('users', users);
  return updated;
}
function sign(user, jwtSecret) {
  return jwt.sign({ sub:user.id, username:user.username, role:user.role }, jwtSecret, { expiresIn: JWT_TTL });
}
async function authMiddleware(req, res, next) {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.cookies?.token;
    if (!token) return res.status(401).json({ error:'auth_required' });
    const decoded = jwt.verify(token, await secret());
    const users = await readJson('users', []);
    const user = users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ error:'invalid_session' });
    if (user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now()) return res.status(403).json({ error:'banned', bannedUntil:user.bannedUntil, reason:user.banReason });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error:'invalid_token' });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error:'admin_required' });
  next();
}
function parseDuration(input) {
  const text = safeString(input, 40).toLowerCase();
  const m = text.match(/^(\d+)\s*(m|min|h|hora|horas|d|dia|dias)?$/);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2] || 'm';
  if (unit.startsWith('h') || unit.startsWith('hora')) return n * 60 * 60 * 1000;
  if (unit.startsWith('d') || unit.startsWith('dia')) return n * 24 * 60 * 60 * 1000;
  return n * 60 * 1000;
}
function sanitizePresence(input = {}) {
  const battery = input.battery || {};
  const level = battery.level == null ? null : Math.max(0, Math.min(100, Math.round(Number(battery.level))));
  return {
    localTime: safeString(input.localTime, 20),
    localDate: safeString(input.localDate, 20),
    timezone: safeString(input.timezone, 80),
    locale: safeString(input.locale, 40),
    userAgent: safeString(input.userAgent, 180),
    platform: safeString(input.platform, 80),
    battery: {
      supported: Boolean(battery.supported),
      level,
      charging: battery.charging == null ? null : Boolean(battery.charging)
    },
    updatedAt: nowISO()
  };
}
function publicPresence(presence) {
  if (!presence) return null;
  return {
    localTime: presence.localTime || '',
    localDate: presence.localDate || '',
    timezone: presence.timezone || '',
    battery: presence.battery || { supported:false, level:null, charging:null },
    updatedAt: presence.updatedAt || null
  };
}
function publicUserLite(u) {
  return {
    id:u.id,
    username:u.username,
    email:u.email,
    role:u.role,
    avatar:u.avatar,
    online:Boolean(u.online),
    lastLogin:u.lastLogin,
    presence:publicPresence(u.presence)
  };
}
function privateEnvelopeFor(message, viewerId) {
  if (!message || (message.fromId !== viewerId && message.toId !== viewerId)) return null;
  return { ...message, direction: message.fromId === viewerId ? 'sent' : 'received' };
}
function sendToUser(userId, payload) {
  for (const [ws, meta] of runtime.sockets.entries()) {
    if (meta.userId === userId) send(ws, payload);
  }
}
async function markUserOnlineState(userId, online) {
  if (!userId) return;
  const users = await readJson('users', []);
  const u = users.find(x => x.id === userId);
  if (!u) return;
  if (online) u.online = true;
  else {
    const hasOtherSocket = [...runtime.sockets.values()].some(meta => meta.userId === userId);
    if (hasOtherSocket) return;
    u.online = false;
  }
  await writeJson('users', users);
  broadcastAdmins({ type:'users-updated' });
}

function clientIp(req) { return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local'; }
function withErrors(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path:'/ws' });

app.disable('x-powered-by');
if (helmet) app.use(helmet({ contentSecurityPolicy:false }));
if (cors) app.use(cors({ origin:true, credentials:false }));
if (morgan) app.use(morgan('combined', { stream:{ write:line => fs.appendFile(path.join(LOG_DIR, 'access.log'), line, () => {}) } }));
app.use(express.json({ limit:'2mb' }));
app.use((req, res, next) => {
  runtime.requests.push(Date.now());
  runtime.requests = runtime.requests.filter(t => Date.now() - t < 60000);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/health', (req, res) => res.json({ ok:true, app:APP_NAME, uptime:process.uptime(), now:nowISO() }));
app.get('/api/config', withErrors(async (req, res) => res.json(await readJson('config', defaultConfig))));
app.get('/api/catalog', withErrors(async (req, res) => res.json(await readJson('catalog', defaultCatalog))));
app.get('/api/store', withErrors(async (req, res) => res.json(await readJson('store', defaultStore))));
app.get('/api/announcements', withErrors(async (req, res) => res.json(await readJson('announcements', []))));
app.get('/api/chat/global', withErrors(async (req, res) => {
  const chat = await readJson('chat', { global: [], party: [] });
  res.json((chat.global || []).slice(-80));
}));

app.post('/api/auth/register', withErrors(async (req, res) => {
  const { username, password } = req.body || {};
  const parsed = parseUserInput(username);
  if (!parsed.username || parsed.username.length < 2) return res.status(400).json({ error:'invalid_username' });
  const users = await readJson('users', []);
  if (users.some(u => u.email === parsed.email || u.username === parsed.username)) return res.status(409).json({ error:'user_exists' });
  const user = await makeUser(parsed.username, password || 'big123', { role:'common' });
  users.push(user);
  await writeJson('users', users);
  await addLog('usuário', `Cadastro público criado: ${user.username} (${user.email})`, clientIp(req));
  const token = sign(user, await secret());
  res.status(201).json({ token, user:publicUser(user) });
}));

app.post('/api/auth/login', withErrors(async (req, res) => {
  const { login, password } = req.body || {};
  const users = await readJson('users', []);
  const normalized = safeString(login, 100).toLowerCase().replace(/\s+/g, '');
  const name = slugName(normalized);
  const user = users.find(u => u.email.toLowerCase() === normalized || u.username.toLowerCase() === name);
  if (!user) return res.status(401).json({ error:'invalid_credentials' });
  if (user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now()) return res.status(403).json({ error:'banned', bannedUntil:user.bannedUntil, reason:user.banReason });
  const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!ok) return res.status(401).json({ error:'invalid_credentials' });
  user.lastLogin = nowISO();
  user.online = true;
  await saveUser(user);
  await addLog('login', `${user.username} entrou no Big`, clientIp(req));
  const token = sign(user, await secret());
  res.json({ token, user:publicUser(user) });
}));

app.get('/api/me', authMiddleware, withErrors(async (req, res) => res.json(publicUser(req.user))));

app.patch('/api/me/password', authMiddleware, withErrors(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (String(newPassword || '').length < 6) return res.status(400).json({ ok:false, message:'A nova senha precisa ter pelo menos 6 caracteres.' });
  if (String(newPassword) !== String(confirmPassword)) return res.status(400).json({ ok:false, message:'A nova senha não confere.' });
  const users = await readJson('users', []);
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ ok:false, message:'Usuário não encontrado.' });
  const ok = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
  if (!ok) return res.status(400).json({ ok:false, message:'Senha atual incorreta.' });
  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.passwordChangedAt = nowISO();
  await writeJson('users', users);
  await addLog('segurança', `${user.username} alterou a própria senha`, user.username);
  res.json({ ok:true, message:'Senha alterada com sucesso.' });
}));

app.post('/api/auth/logout', authMiddleware, withErrors(async (req, res) => {
  req.user.online = false;
  await saveUser(req.user);
  await addLog('login', `${req.user.username} saiu do Big`, req.user.username);
  res.json({ ok:true });
}));


app.post('/api/presence', authMiddleware, withErrors(async (req, res) => {
  req.user.presence = sanitizePresence(req.body || {});
  req.user.online = true;
  await saveUser(req.user);
  const publicPayload = publicUserLite(req.user);
  broadcast({ type:'presence-update', user:publicPayload });
  broadcastAdmins({ type:'users-updated' });
  res.json({ ok:true, user:publicPayload });
}));

app.get('/api/users/online', authMiddleware, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  const list = users
    .filter(u => u.id !== req.user.id)
    .map(publicUserLite)
    .sort((a,b) => Number(b.online) - Number(a.online) || String(a.username).localeCompare(String(b.username)));
  res.json(list);
}));

app.get('/api/messages/private', authMiddleware, withErrors(async (req, res) => {
  const peerLogin = req.query.peer || req.query.to || '';
  if (!peerLogin) return res.status(400).json({ error:'peer_required' });
  const peer = await findUserByLogin(peerLogin);
  if (!peer) return res.status(404).json({ error:'peer_not_found' });
  const messages = await readJson('privateMessages', []);
  const thread = messages
    .filter(m => (m.fromId === req.user.id && m.toId === peer.id) || (m.fromId === peer.id && m.toId === req.user.id))
    .slice(-120)
    .map(m => privateEnvelopeFor(m, req.user.id))
    .filter(Boolean);
  res.json({ peer:publicUserLite(peer), messages:thread });
}));

app.post('/api/messages/private', authMiddleware, withErrors(async (req, res) => {
  const toRaw = req.body?.to || req.body?.recipient || '';
  const recipient = await findUserByLogin(toRaw);
  if (!recipient) return res.status(404).json({ error:'recipient_not_found' });
  if (recipient.id === req.user.id) return res.status(400).json({ error:'cannot_send_to_self' });
  const sealedText = safeString(req.body?.sealedText || req.body?.text, 5000);
  if (!sealedText) return res.status(400).json({ error:'empty_message' });
  const messages = await readJson('privateMessages', []);
  const message = {
    id:id('pm'),
    type:'private-message',
    privacyModel:'sealed-delivery',
    serverPolicy:'metadata-only-admin-view',
    fromId:req.user.id,
    fromUsername:req.user.username,
    fromEmail:req.user.email,
    toId:recipient.id,
    toUsername:recipient.username,
    toEmail:recipient.email,
    sealedText,
    status:'sent',
    createdAt:nowISO(),
    deliveredAt:null,
    readAt:null
  };
  messages.push(message);
  await writeJson('privateMessages', messages.slice(-MAX_PRIVATE_MESSAGES));
  await addLog('mensagem-privada', `${req.user.username} enviou mensagem privada para ${recipient.username}. Conteúdo não exibido em logs/admin.`, req.user.username);
  const recipientEnvelope = privateEnvelopeFor(message, recipient.id);
  const senderEnvelope = privateEnvelopeFor(message, req.user.id);
  sendToUser(recipient.id, { type:'private-message', message:recipientEnvelope });
  sendToUser(req.user.id, { type:'private-message', message:senderEnvelope });
  broadcastAdmins({ type:'private-message-metadata', meta:{ id:message.id, from:message.fromEmail, to:message.toEmail, createdAt:message.createdAt, status:message.status } });
  res.status(201).json(senderEnvelope);
}));

app.patch('/api/messages/private/:id/read', authMiddleware, withErrors(async (req, res) => {
  const messages = await readJson('privateMessages', []);
  const msg = messages.find(m => m.id === req.params.id && m.toId === req.user.id);
  if (!msg) return res.status(404).json({ error:'message_not_found' });
  msg.status = 'read';
  msg.readAt = nowISO();
  await writeJson('privateMessages', messages);
  sendToUser(msg.fromId, { type:'private-message-read', id:msg.id, readAt:msg.readAt });
  res.json(privateEnvelopeFor(msg, req.user.id));
}));

app.post('/api/chat/global', authMiddleware, withErrors(async (req, res) => {
  const text = safeString(req.body?.text, 1000);
  if (!text) return res.status(400).json({ error:'empty_message' });
  const chat = await readJson('chat', { global: [], party: [] });
  const msg = { id:id('msg'), user:req.user.username, email:req.user.email, role:req.user.role, text, time:nowISO() };
  chat.global = [...(chat.global || []), msg].slice(-MAX_CHAT);
  await writeJson('chat', chat);
  req.user.stats = req.user.stats || {};
  req.user.stats.messages = Number(req.user.stats.messages || 0) + 1;
  await saveUser(req.user);
  runtime.messagesThisMinute.push(Date.now());
  broadcast({ type:'chat-message', channel:'global', message:msg });
  res.status(201).json(msg);
}));

app.post('/api/store/:itemId/buy', authMiddleware, withErrors(async (req, res) => {
  const store = await readJson('store', defaultStore);
  const item = store.find(i => i.id === req.params.itemId || i.name === req.params.itemId);
  if (!item || !item.active) return res.status(404).json({ error:'item_not_found' });
  if (Number(req.user.money || 0) < Number(item.price || 0)) return res.status(400).json({ error:'insufficient_fake_money' });
  req.user.money = Number(req.user.money || 0) - Number(item.price || 0);
  req.user.inventory = Array.from(new Set([...(req.user.inventory || []), item.id]));
  await saveUser(req.user);
  await addLog('loja', `${req.user.username} comprou ${item.name} por ${item.price} BIG`, req.user.username);
  res.json({ user:publicUser(req.user), item });
}));

app.post('/api/games/open', authMiddleware, withErrors(async (req, res) => {
  runtime.openGames += 1;
  req.user.stats = req.user.stats || {};
  req.user.stats.games = Number(req.user.stats.games || 0) + 1;
  req.user.money = Number(req.user.money || 0) + 15;
  req.user.stats.moneyEarned = Number(req.user.stats.moneyEarned || 0) + 15;
  await saveUser(req.user);
  setTimeout(() => { runtime.openGames = Math.max(0, runtime.openGames - 1); }, 15 * 60 * 1000);
  res.json({ ok:true, reward:15, user:publicUser(req.user) });
}));

app.post('/api/party', authMiddleware, withErrors(async (req, res) => {
  const parties = await readJson('parties', []);
  const party = { id:id('party'), name:safeString(req.body?.name, 80) || `${req.user.username} Party`, ownerId:req.user.id, public:Boolean(req.body?.public ?? true), members:[req.user.id], currentSong:null, createdAt:nowISO() };
  parties.unshift(party);
  await writeJson('parties', parties.slice(0, 200));
  req.user.stats = req.user.stats || {};
  req.user.stats.parties = Number(req.user.stats.parties || 0) + 1;
  await saveUser(req.user);
  broadcast({ type:'party-created', party });
  res.status(201).json(party);
}));
app.get('/api/party', authMiddleware, withErrors(async (req, res) => res.json(await readJson('parties', []))));

app.get('/api/admin/metrics', authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await metrics())));
app.get('/api/admin/users', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  res.json(users.map(publicUser));
}));
app.post('/api/admin/users', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const rawName = req.body?.username || req.body?.rawName;
  const password = req.body?.password || 'big123';
  const parsed = parseUserInput(rawName);
  const users = await readJson('users', []);
  if (users.some(u => u.email === parsed.email || u.username === parsed.username)) return res.status(409).json({ error:'user_exists' });
  const user = await makeUser(rawName, password);
  users.unshift(user);
  await writeJson('users', users);
  await addLog('usuário', `Admin criou ${user.username} como ${user.role}. Email local: ${user.email}`, req.user.username);
  broadcastAdmins({ type:'users-updated' });
  res.status(201).json(publicUser(user));
}));
app.patch('/api/admin/users/:id', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error:'user_not_found' });
  const body = req.body || {};
  if (body.money != null) u.money = Number(body.money);
  if (body.role && ['admin', 'common'].includes(body.role)) u.role = body.role;
  if (body.password) u.passwordHash = await bcrypt.hash(String(body.password), 10);
  if (body.bannedUntil !== undefined) u.bannedUntil = body.bannedUntil;
  if (body.banReason !== undefined) u.banReason = safeString(body.banReason, 400);
  await writeJson('users', users);
  await addLog('usuário', `Admin alterou ${u.username}`, req.user.username);
  broadcastAdmins({ type:'users-updated' });
  res.json(publicUser(u));
}));
app.post('/api/admin/users/:id/reset-password', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error:'user_not_found' });
  const temporary = safeString(req.body?.password, 120) || `big${Math.floor(100000 + Math.random()*899999)}`;
  if (temporary.length < 6) return res.status(400).json({ error:'password_too_short' });
  u.passwordHash = await bcrypt.hash(temporary, 10);
  u.passwordResetAt = nowISO();
  await writeJson('users', users);
  await addLog('segurança', `Admin resetou senha de ${u.username}. Conteúdo da senha não foi salvo em log.`, req.user.username);
  res.json({ ok:true, temporaryPassword: temporary, user: publicUser(u) });
}));
app.post('/api/admin/users/:id/coins', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error:'user_not_found' });
  const amount = Number(req.body?.amount || 0);
  u.money = Math.max(0, Number(u.money || 0) + amount);
  await writeJson('users', users);
  await addLog('economia', `Admin alterou saldo de ${u.username} em ${amount} BIG`, req.user.username);
  broadcastAdmins({ type:'users-updated' });
  res.json(publicUser(u));
}));
app.post('/api/admin/users/:id/ban', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error:'user_not_found' });
  const ms = parseDuration(req.body?.duration || req.body?.minutes || '15m');
  u.bannedUntil = new Date(Date.now() + ms).toISOString();
  u.banReason = safeString(req.body?.reason, 400) || `Banimento temporário por ${Math.round(ms/60000)} minutos`;
  await writeJson('users', users);
  await addLog('banimento', `${u.username} banido até ${u.bannedUntil}. Motivo: ${u.banReason}`, req.user.username);
  broadcast({ type:'user-banned', userId:u.id, bannedUntil:u.bannedUntil, reason:u.banReason });
  res.json(publicUser(u));
}));
app.post('/api/admin/users/:id/unban', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const users = await readJson('users', []);
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error:'user_not_found' });
  u.bannedUntil = null;
  u.banReason = '';
  await writeJson('users', users);
  await addLog('banimento', `${u.username} teve banimento revogado`, req.user.username);
  broadcastAdmins({ type:'users-updated' });
  res.json(publicUser(u));
}));

async function updateAdminConfig(req, res) {
  const current = await readJson('config', defaultConfig);
  const next = deepMerge(current, sanitizeConfig(req.body || {}));
  next.localEmailDomain = 'big.x';
  await writeJson('config', next);
  await addLog('config', 'Configuração visual/funcional alterada no painel admin', req.user.username);
  broadcast({ type:'config-update', config:next });
  res.json(next);
}
app.patch('/api/admin/config', authMiddleware, requireAdmin, withErrors(updateAdminConfig));
app.put('/api/admin/config', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const current = await readJson('config', defaultConfig);
  const next = deepMerge(current, sanitizeConfig(req.body || {}));
  next.localEmailDomain = 'big.x';
  await writeJson('config', next);
  await addLog('config', 'Configuração visual/funcional alterada no painel admin', req.user.username);
  broadcast({ type:'config-update', config:next });
  res.json(next);
}));
app.get('/api/admin/config', authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await readJson('config', defaultConfig))));
app.get('/api/admin/logs', authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await readJson('logs', []))));
app.post('/api/admin/announcements', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const announcements = await readJson('announcements', []);
  const notice = { id:id('notice'), type:safeString(req.body?.type, 40) || 'informação', text:safeString(req.body?.text, 1000), duration:safeString(req.body?.duration, 40) || '15 segundos', pinned:Boolean(req.body?.pinned), time:nowISO(), author:req.user.username };
  if (!notice.text) return res.status(400).json({ error:'empty_notice' });
  announcements.unshift(notice);
  await writeJson('announcements', announcements.slice(0, 300));
  await addLog('aviso', `Aviso global enviado: ${notice.text}`, req.user.username);
  broadcast({ type:'global-alert', notice });
  res.status(201).json(notice);
}));
app.put('/api/admin/store', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(list)) return res.status(400).json({ error:'items_array_required' });
  const clean = list.slice(0, 500).map((item) => ({
    id: safeString(item.id, 80) || slugName(item.name) || id('item'),
    name: safeString(item.name, 120),
    category: safeString(item.category, 80),
    price: Math.max(0, Number(item.price || 0)),
    rarity: safeString(item.rarity, 40) || 'Comum',
    active: item.active !== false
  }));
  await writeJson('store', clean);
  await addLog('loja', 'Catálogo da loja atualizado', req.user.username);
  broadcast({ type:'store-update', store:clean });
  res.json(clean);
}));
app.put('/api/admin/catalog', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  await writeJson('catalog', req.body || defaultCatalog);
  await addLog('conteúdo', 'Catálogo de músicas/jogos/eventos atualizado', req.user.username);
  broadcast({ type:'catalog-update', catalog:req.body });
  res.json(req.body || defaultCatalog);
}));
app.post('/api/admin/backup', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const out = path.join(LOG_DIR, `backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  const dump = {};
  for (const key of ['config','users','logs','chat','parties','store','catalog','announcements','privateMessages']) dump[key] = await readJson(key, null);
  await fsp.writeFile(out, JSON.stringify(dump, null, 2));
  await addLog('backup', `Backup criado: ${out}`, req.user.username);
  res.json({ ok:true, file:out });
}));


// Compatibility aliases for the final API contract.
app.get('/api/messages/global', withErrors(async (req, res) => {
  const chat = await readJson('chat', { global: [], party: [] });
  res.json((chat.global || []).slice(-120));
}));
app.post('/api/messages/global', authMiddleware, withErrors(async (req, res) => {
  const text = safeString(req.body?.text, 1000);
  if (!text) return res.status(400).json({ error:'empty_message' });
  const chat = await readJson('chat', { global: [], party: [] });
  const msg = { id:id('msg'), user:req.user.username, email:req.user.email, role:req.user.role, text, time:nowISO() };
  chat.global = [...(chat.global || []), msg].slice(-MAX_CHAT);
  await writeJson('chat', chat);
  runtime.messagesThisMinute.push(Date.now());
  broadcast({ type:'chat-message', channel:'global', message:msg });
  res.status(201).json(msg);
}));
app.post('/api/admin/notices', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const announcements = await readJson('announcements', []);
  const notice = { id:id('notice'), type:safeString(req.body?.type, 40) || 'informação', text:safeString(req.body?.text, 1000), duration:safeString(req.body?.duration, 40) || '15 segundos', pinned:Boolean(req.body?.pinned), time:nowISO(), author:req.user.username };
  if (!notice.text) return res.status(400).json({ error:'empty_notice' });
  announcements.unshift(notice);
  await writeJson('announcements', announcements.slice(0, 300));
  await addLog('aviso', `Aviso global enviado: ${notice.text}`, req.user.username);
  broadcast({ type:'global-alert', notice });
  res.status(201).json(notice);
}));
app.get('/api/notices', withErrors(async (req, res) => res.json(await readJson('announcements', []))));
app.get('/api/admin/system', authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await metrics())));
app.get('/api/music', withErrors(async (req, res) => { const c = await readJson('catalog', defaultCatalog); res.json(c.songs || []); }));
app.get('/api/games', withErrors(async (req, res) => { const c = await readJson('catalog', defaultCatalog); res.json(c.games || []); }));
app.post('/api/store/buy', authMiddleware, withErrors(async (req, res) => {
  const itemId = req.body?.itemId || req.body?.id || req.body?.item;
  const store = await readJson('store', defaultStore);
  const item = store.find(i => i.id === itemId || i.name === itemId);
  if (!item || !item.active) return res.status(404).json({ error:'item_not_found' });
  if (Number(req.user.money || 0) < Number(item.price || 0)) return res.status(400).json({ error:'insufficient_fake_money' });
  req.user.money = Number(req.user.money || 0) - Number(item.price || 0);
  req.user.inventory = Array.from(new Set([...(req.user.inventory || []), item.id]));
  await saveUser(req.user);
  await addLog('loja', `${req.user.username} comprou ${item.name} por ${item.price} BIG`, req.user.username);
  res.json({ user:publicUser(req.user), item });
}));
app.get('/api/me/inventory', authMiddleware, withErrors(async (req, res) => res.json(req.user.inventory || [])));
app.get('/api/parties', authMiddleware, withErrors(async (req, res) => res.json(await readJson('parties', []))));
app.post('/api/parties', authMiddleware, withErrors(async (req, res) => {
  const parties = await readJson('parties', []);
  const party = { id:id('party'), name:safeString(req.body?.name, 80) || `${req.user.username} Party`, ownerId:req.user.id, public:Boolean(req.body?.public ?? true), members:[req.user.id], currentSong:null, createdAt:nowISO() };
  parties.unshift(party); await writeJson('parties', parties.slice(0, 200)); broadcast({ type:'party:update', party }); res.status(201).json(party);
}));
app.post('/api/parties/:id/join', authMiddleware, withErrors(async (req, res) => { const parties = await readJson('parties', []); const party = parties.find(x => x.id === req.params.id); if (!party) return res.status(404).json({ error:'party_not_found' }); party.members = Array.from(new Set([...(party.members||[]), req.user.id])); await writeJson('parties', parties); broadcast({ type:'party:update', party }); res.json(party); }));
app.post('/api/parties/:id/leave', authMiddleware, withErrors(async (req, res) => { const parties = await readJson('parties', []); const party = parties.find(x => x.id === req.params.id); if (!party) return res.status(404).json({ error:'party_not_found' }); party.members = (party.members||[]).filter(id => id !== req.user.id); await writeJson('parties', parties); broadcast({ type:'party:update', party }); res.json(party); }));
app.patch('/api/parties/:id/track', authMiddleware, withErrors(async (req, res) => { const parties = await readJson('parties', []); const party = parties.find(x => x.id === req.params.id); if (!party) return res.status(404).json({ error:'party_not_found' }); if (party.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error:'owner_required' }); party.currentSong = req.body?.track || req.body; await writeJson('parties', parties); broadcast({ type:'party:update', party }); res.json(party); }));
app.post('/api/parties/:id/message', authMiddleware, withErrors(async (req, res) => { const chat = await readJson('chat', { global: [], party: [] }); const msg = { id:id('pmsg'), partyId:req.params.id, user:req.user.username, email:req.user.email, text:safeString(req.body?.text, 1000), time:nowISO() }; if (!msg.text) return res.status(400).json({ error:'empty_message' }); chat.party = [...(chat.party||[]), msg].slice(-MAX_CHAT); await writeJson('chat', chat); broadcast({ type:'party:message', message:msg }); res.status(201).json(msg); }));

// Google Sheets integration: system map, exports and controlled imports.
const SHEETS_TITLE = 'Big System Control';
const SHEET_DEFS = [
  ['Visão Geral', ['Campo','Valor','Observação'], [['Projeto','Big','App social de música, party, jogos e comunidade'],['Criador','Colômbia',''],['Empresa','Cl Inc. Enterteiments',''],['Porta padrão', String(PORT), ''],['Email local','nome@big.x',''],['Cluster','Desativado','fork/simples'],['Última sincronização', nowISO(), '']]],
  ['Caminhos', ['Tipo','Caminho','Descrição','Editável pelo admin','Crítico','Observações'], [['Backend','server.js','Servidor principal Node.js','Não','Sim',''],['App','member-app/index.html','Interface dos usuários','Parcial','Sim',''],['Admin','admin-app/index.html','Painel administrativo','Parcial','Sim',''],['Dados','data/users.json','Usuários locais','Via painel','Sim','Não exportar senhas'],['Config','data/config.json','Configurações públicas e módulos','Sim','Sim','']]],
  ['Rotas Web', ['Rota','App','Permissão','Descrição','Status'], [['/member-app/','App Principal','user/admin','App dos membros','ativo'],['/admin-app/','Painel Admin','admin','Controle administrativo','ativo'],['/health','Sistema','público','Status do servidor','ativo'],['/ws','WebSocket','autenticado','Tempo real','ativo']]],
  ['Endpoints API', ['Método','Endpoint','Permissão','Função','Status'], [['POST','/api/auth/login','público','Login','ativo'],['PATCH','/api/me/password','user/admin','Trocar própria senha','ativo'],['POST','/api/admin/sheets/bootstrap','admin','Inicializar planilha','ativo'],['POST','/api/messages/private','user/admin','Mensagem privada','ativo']]],
  ['Usuários Exportados', ['ID','Usuário','Email local','Cargo','Status','Coins','Criado em','Último login'], []],
  ['Presença', ['Usuário','Email local','Online','Hora local','Data local','Timezone','Bateria','Carregando','Última atividade'], []],
  ['Módulos', ['Módulo','Ativo','Controlado pelo admin','Arquivo principal','Status','Observações'], [['Música','sim','sim','server.js/member-app','ativo',''],['Chat global','sim','sim','server.js/member-app','ativo',''],['Mensagens privadas','sim','não','server.js','ativo','Não exportar conteúdo'],['Party','sim','sim','server.js/member-app','ativo',''],['Jogos','sim','sim','data/catalog.json','ativo',''],['Loja','sim','sim','data/store.json','ativo',''],['Google Sheets','sim','sim','services/sheets.js','ativo','']]],
  ['Configurações Públicas', ['Chave','Valor','Editável pelo admin','Afeta tempo real','Observações'], []],
  ['Jogos', ['ID','Nome','Categoria','URL','Domínio permitido','Ativo','Capa','Observações'], []],
  ['Músicas', ['ID','Nome','Artista','URL','Fonte','Ativo','Capa','Observações'], []],
  ['Loja', ['ID','Nome','Tipo','Preço','Raridade','Ativo','Imagem','Observações'], []],
  ['Logs Resumidos', ['Data','Tipo','Usuário','Ação','Resultado','Observação'], []],
  ['Roadmap', ['Função','Prioridade','Status','Responsável','Observações'], [['Sheets automático','alta','feito','Big','Criar abas e headers automaticamente'],['SQLite local','média','planejado','Big','Evolução futura']]],
  ['Segurança', ['Recurso','Proteção','Status','Observações'], [['Senhas','bcrypt','ativo','Nunca exportar senha/hash'],['Admin endpoints','cargo admin','ativo',''],['Mensagens privadas','remetente/destinatário','ativo','Não exportar conteúdo'],['Sheets','sem dados sensíveis','ativo','Só organização e relatórios']]]
];
function colLetter(n){ let s=''; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
function sq(title, range){ return `'${String(title).replace(/'/g, "''")}'!${range}`; }
async function getSheetsSettings(){
  const cfg = await readJson('config', defaultConfig);
  const gs = cfg.googleSheets || {};
  return {
    enabled: String(process.env.GOOGLE_SHEETS_ENABLED ?? gs.enabled ?? 'false').toLowerCase() === 'true' || gs.enabled === true,
    spreadsheetId: process.env.GOOGLE_SHEETS_ID || gs.spreadsheetId || '',
    ownerEmail: process.env.GOOGLE_OWNER_EMAIL || gs.ownerEmail || '',
    serviceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || gs.serviceAccountFile || './credentials/google-service-account.json',
    cfg
  };
}
async function sheetsClients(){
  if (!google) throw new Error('Dependência googleapis não instalada. Rode: npm install googleapis dotenv');
  const settings = await getSheetsSettings();
  const keyFile = path.isAbsolute(settings.serviceAccountFile) ? settings.serviceAccountFile : path.join(ROOT, settings.serviceAccountFile);
  if (!fs.existsSync(keyFile)) throw new Error(`Credencial Google não encontrada em ${keyFile}`);
  const auth = new google.auth.GoogleAuth({ keyFile, scopes:['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive.file'] });
  return { sheets:google.sheets({ version:'v4', auth }), drive:google.drive({ version:'v3', auth }), settings };
}
async function saveSheetsConfig(partial){
  const cfg = await readJson('config', defaultConfig);
  cfg.googleSheets = { ...(cfg.googleSheets || {}), ...partial };
  await writeJson('config', cfg);
  return cfg.googleSheets;
}
async function ensureSpreadsheet(){
  const { sheets, drive, settings } = await sheetsClients();
  let spreadsheetId = settings.spreadsheetId;
  if (!spreadsheetId) {
    const created = await sheets.spreadsheets.create({ requestBody:{ properties:{ title:SHEETS_TITLE }, sheets:[{ properties:{ title:SHEET_DEFS[0][0], gridProperties:{ rowCount:500, columnCount:12, frozenRowCount:1 } } }] } });
    spreadsheetId = created.data.spreadsheetId;
    if (settings.ownerEmail) {
      await drive.permissions.create({ fileId:spreadsheetId, sendNotificationEmail:false, requestBody:{ type:'user', role:'writer', emailAddress:settings.ownerEmail } });
    }
  }
  await saveSheetsConfig({ enabled:true, spreadsheetId, ownerEmail:settings.ownerEmail, serviceAccountFile:settings.serviceAccountFile });
  return { sheets, drive, spreadsheetId };
}
async function bootstrapSheets(){
  const { sheets, spreadsheetId } = await ensureSpreadsheet();
  const current = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set((current.data.sheets || []).map(s => s.properties.title));
  const addRequests = SHEET_DEFS.filter(([title]) => !existing.has(title)).map(([title, headers]) => ({ addSheet:{ properties:{ title, gridProperties:{ rowCount:500, columnCount:Math.max(headers.length+2,10), frozenRowCount:1 } } } }));
  if (addRequests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody:{ requests:addRequests } });
  const data = SHEET_DEFS.map(([title, headers, rows]) => ({ range:sq(title, `A1:${colLetter(headers.length)}${Math.max(rows.length+1,1)}`), values:[headers, ...(rows||[])] }));
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody:{ valueInputOption:'USER_ENTERED', data } });
  const refreshed = await sheets.spreadsheets.get({ spreadsheetId });
  const ids = Object.fromEntries((refreshed.data.sheets || []).map(s => [s.properties.title, s.properties.sheetId]));
  const fmt = SHEET_DEFS.flatMap(([title, headers]) => { const sheetId = ids[title]; if (sheetId == null) return []; return [
    { repeatCell:{ range:{ sheetId, startRowIndex:0, endRowIndex:1 }, cell:{ userEnteredFormat:{ textFormat:{ bold:true }, horizontalAlignment:'CENTER' } }, fields:'userEnteredFormat(textFormat,horizontalAlignment)' } },
    { setBasicFilter:{ filter:{ range:{ sheetId, startRowIndex:0, endRowIndex:500, startColumnIndex:0, endColumnIndex:headers.length } } } },
    { autoResizeDimensions:{ dimensions:{ sheetId, dimension:'COLUMNS', startIndex:0, endIndex:headers.length } } }
  ]; });
  if (fmt.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody:{ requests:fmt } });
  const tabs = SHEET_DEFS.map(([t]) => t);
  await saveSheetsConfig({ enabled:true, spreadsheetId, title:SHEETS_TITLE, tabs, lastBootstrap:nowISO(), lastSync:nowISO() });
  await writeJson('sheetsSync', { enabled:true, spreadsheetId, lastBootstrap:nowISO(), tabs, errors:[] });
  return { ok:true, spreadsheetId, url:`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, tabs };
}
async function writeSheet(title, headers, rows){
  const { sheets, spreadsheetId } = await ensureSpreadsheet();
  await sheets.spreadsheets.values.clear({ spreadsheetId, range:sq(title, 'A:Z') });
  await sheets.spreadsheets.values.update({ spreadsheetId, range:sq(title, `A1:${colLetter(headers.length)}${rows.length+1}`), valueInputOption:'USER_ENTERED', requestBody:{ values:[headers, ...rows] } });
  await saveSheetsConfig({ lastSync:nowISO() });
  return { ok:true, title, rows:rows.length, spreadsheetId };
}
async function readSheet(title){
  const { sheets, spreadsheetId } = await ensureSpreadsheet();
  const r = await sheets.spreadsheets.values.get({ spreadsheetId, range:sq(title, 'A:Z') });
  return r.data.values || [];
}
async function exportSheet(kind){
  if (kind === 'users') { const users = await readJson('users', []); return writeSheet('Usuários Exportados', ['ID','Usuário','Email local','Cargo','Status','Coins','Criado em','Último login'], users.map(u => [u.id,u.username,u.email,u.role,u.bannedUntil?'banido':'ativo',u.money||0,u.createdAt||'',u.lastLogin||''])); }
  if (kind === 'presence') { const users = await readJson('users', []); return writeSheet('Presença', ['Usuário','Email local','Online','Hora local','Data local','Timezone','Bateria','Carregando','Última atividade'], users.map(u => [u.username,u.email,u.online?'sim':'não',u.presence?.localTime||'',u.presence?.localDate||'',u.presence?.timezone||'',u.presence?.battery?.supported ? `${u.presence.battery.level}%` : 'indisponível',u.presence?.battery?.charging === true ? 'sim' : u.presence?.battery?.charging === false ? 'não' : '',u.presence?.updatedAt||''])); }
  if (kind === 'games') { const c = await readJson('catalog', defaultCatalog); return writeSheet('Jogos', ['ID','Nome','Categoria','URL','Domínio permitido','Ativo','Capa','Observações'], (c.games||[]).map(g => [g.id,g.title||g.name,g.category,g.url||'',safeString((() => { try { return new URL(g.url || 'http://local').hostname; } catch { return ''; } })(),100),g.active === false ? 'não':'sim',g.cover||'',g.description||''])); }
  if (kind === 'music') { const c = await readJson('catalog', defaultCatalog); return writeSheet('Músicas', ['ID','Nome','Artista','URL','Fonte','Ativo','Capa','Observações'], (c.songs||[]).map(m => [m.id,m.title||m.name,m.artist||'',m.url||'',m.source||'',m.active === false ? 'não':'sim',m.cover||'',m.description||''])); }
  if (kind === 'store') { const store = await readJson('store', defaultStore); return writeSheet('Loja', ['ID','Nome','Tipo','Preço','Raridade','Ativo','Imagem','Observações'], store.map(i => [i.id,i.name,i.category||i.type,i.price,i.rarity,i.active===false?'não':'sim',i.image||'',i.description||''])); }
  if (kind === 'logs') { const logs = await readJson('logs', []); return writeSheet('Logs Resumidos', ['Data','Tipo','Usuário','Ação','Resultado','Observação'], logs.slice(0,500).map(l => [l.time,l.type,l.actor,l.text,'ok',''])); }
  return bootstrapSheets();
}
async function previewImport(kind){
  const title = kind === 'games' ? 'Jogos' : kind === 'music' ? 'Músicas' : 'Loja';
  const values = await readSheet(title);
  const [headers, ...rows] = values;
  return { title, headers:headers || [], rows:rows.slice(0,100) };
}
async function applyImport(kind){
  const preview = await previewImport(kind);
  const rows = preview.rows || [];
  if (kind === 'games' || kind === 'music') {
    const catalog = await readJson('catalog', defaultCatalog);
    if (kind === 'games') catalog.games = rows.filter(r => r[1]).map(r => ({ id:safeString(r[0],80)||id('game'), title:safeString(r[1],160), category:safeString(r[2],80), url:safeString(r[3],500), active:String(r[5]||'sim').toLowerCase() !== 'não', cover:safeString(r[6],500), description:safeString(r[7],500) }));
    else catalog.songs = rows.filter(r => r[1]).map(r => ({ id:safeString(r[0],80)||id('song'), title:safeString(r[1],160), artist:safeString(r[2],160), url:safeString(r[3],500), source:safeString(r[4],80)||'sheets', active:String(r[5]||'sim').toLowerCase() !== 'não', cover:safeString(r[6],500), description:safeString(r[7],500) }));
    await writeJson('catalog', catalog); broadcast({ type:'catalog-update', catalog }); return { ok:true, imported:rows.length, kind };
  }
  if (kind === 'store') { const store = rows.filter(r => r[1]).map(r => ({ id:safeString(r[0],80)||id('item'), name:safeString(r[1],160), category:safeString(r[2],80), price:Number(r[3]||0), rarity:safeString(r[4],40)||'Comum', active:String(r[5]||'sim').toLowerCase() !== 'não', image:safeString(r[6],500), description:safeString(r[7],500) })); await writeJson('store', store); broadcast({ type:'store-update', store }); return { ok:true, imported:store.length, kind }; }
  return { ok:false, error:'unsupported_kind' };
}
app.get('/api/admin/sheets/status', authMiddleware, requireAdmin, withErrors(async (req, res) => {
  const settings = await getSheetsSettings(); const sync = await readJson('sheetsSync', {});
  res.json({ ok:true, available:Boolean(google), enabled:settings.enabled, configured:Boolean(settings.spreadsheetId), spreadsheetId:settings.spreadsheetId, ownerEmail:settings.ownerEmail, serviceAccountFile:settings.serviceAccountFile, sync });
}));
app.post('/api/admin/sheets/test', authMiddleware, requireAdmin, withErrors(async (req, res) => { const out = await ensureSpreadsheet(); res.json({ ok:true, spreadsheetId:out.spreadsheetId, url:`https://docs.google.com/spreadsheets/d/${out.spreadsheetId}/edit` }); }));
app.post('/api/admin/sheets/bootstrap', authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await bootstrapSheets())));
app.post('/api/admin/sheets/export/system-map', authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await bootstrapSheets())));
for (const kind of ['users','presence','games','music','store','logs']) app.post(`/api/admin/sheets/export/${kind}`, authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await exportSheet(kind))));
for (const kind of ['games','music','store']) {
  app.post(`/api/admin/sheets/import/${kind}/preview`, authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await previewImport(kind))));
  app.post(`/api/admin/sheets/import/${kind}/apply`, authMiddleware, requireAdmin, withErrors(async (req, res) => res.json(await applyImport(kind))));
}

app.use('/member-app', express.static(path.join(ROOT, 'member-app'), { etag:true, maxAge:'2h' }));
app.use('/admin-app', express.static(path.join(ROOT, 'admin-app'), { etag:true, maxAge:'2h' }));
app.use('/shared', express.static(path.join(ROOT, 'shared'), { etag:true, maxAge:'2h' }));
app.get('/', (req, res) => res.redirect('/member-app/'));
app.get('/member', (req, res) => res.redirect('/member-app/'));
app.get('/admin', (req, res) => res.redirect('/admin-app/'));

app.use((err, req, res, next) => {
  logLine('error', `${req.method} ${req.url}: ${err.stack || err.message}`);
  res.status(500).json({ error:'server_error', message: process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message });
});

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && a?.[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) out[k] = deepMerge(a[k], v);
    else out[k] = v;
  }
  return out;
}
function sanitizeConfig(input) {
  const out = structuredCloneCompat(input);
  for (const key of ['appName','creator','company','theme','primaryColor','secondaryColor','accentColor','logoText']) if (out[key] != null) out[key] = safeString(out[key], 160);
  if (out.loadingPhrases && !Array.isArray(out.loadingPhrases)) delete out.loadingPhrases;
  return out;
}
function cpuPercent() {
  const current = os.cpus();
  const prev = runtime.lastCpu || current;
  runtime.lastCpu = current;
  let idleDiff = 0, totalDiff = 0;
  current.forEach((cpu, i) => {
    const p = prev[i]?.times || cpu.times;
    const times = cpu.times;
    const idle = times.idle - p.idle;
    const total = Object.keys(times).reduce((sum, key) => sum + (times[key] - (p[key] || 0)), 0);
    idleDiff += idle;
    totalDiff += total;
  });
  return totalDiff ? Math.max(0, Math.min(100, Math.round(100 - idleDiff / totalDiff * 100))) : Math.round(os.loadavg()[0] / os.cpus().length * 100);
}
function diskUsage() {
  return new Promise(resolve => {
    execFile('df', ['-k', DATA_DIR], { timeout:3000 }, (err, stdout) => {
      if (err) return resolve({ percent:0, used:'?', total:'?' });
      const line = stdout.trim().split('\n')[1] || '';
      const parts = line.replace(/\s+/g, ' ').split(' ');
      const total = Number(parts[1] || 0), used = Number(parts[2] || 0), percent = Number(String(parts[4] || '0').replace('%',''));
      resolve({ percent, usedKb:used, totalKb:total });
    });
  });
}
async function metrics() {
  const memTotal = os.totalmem();
  const memUsed = memTotal - os.freemem();
  const users = await readJson('users', []);
  const parties = await readJson('parties', []);
  runtime.messagesThisMinute = runtime.messagesThisMinute.filter(t => Date.now() - t < 60000);
  runtime.requests = runtime.requests.filter(t => Date.now() - t < 60000);
  const disk = await diskUsage();
  const cpu = cpuPercent();
  const ram = Math.round(memUsed / memTotal * 100);
  const health = Math.max(0, Math.min(100, Math.round(100 - (cpu * .25 + ram * .2 + (disk.percent || 0) * .15))));
  return {
    time: nowISO(),
    uptimeSeconds: Math.round(process.uptime()),
    cpu, ram, disk:disk.percent || 0,
    memory: { used: memUsed, total: memTotal },
    usersOnline: [...runtime.sockets.values()].filter(s => s.userId).length || users.filter(u => u.online).length,
    usersTotal: users.length,
    partiesActive: parties.length,
    messagesPerMinute: runtime.messagesThisMinute.length,
    requestsPerMinute: runtime.requests.length,
    openGames: runtime.openGames,
    wsClients: runtime.sockets.size,
    node: process.version,
    pid: process.pid,
    health
  };
}
function send(ws, payload) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); }
function broadcast(payload) { for (const ws of runtime.sockets.keys()) send(ws, payload); }
function broadcastAdmins(payload) { for (const [ws, meta] of runtime.sockets.entries()) if (meta.role === 'admin') send(ws, payload); }
wss.on('connection', (ws, req) => {
  runtime.sockets.set(ws, { connectedAt: Date.now(), role:'guest' });
  send(ws, { type:'hello', app:APP_NAME, time:nowISO() });
  ws.on('message', async raw => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'auth' && msg.token) {
        const decoded = jwt.verify(String(msg.token), await secret());
        const users = await readJson('users', []);
        const user = users.find(u => u.id === decoded.sub);
        if (user) {
          runtime.sockets.set(ws, { connectedAt: Date.now(), userId:user.id, username:user.username, role:user.role });
          user.online = true;
          await saveUser(user);
          send(ws, { type:'auth-ok', user:publicUser(user) });
          broadcast({ type:'presence-update', user:publicUserLite(user) });
          broadcastAdmins({ type:'users-updated' });
        }
      }
      if (msg.type === 'presence') {
        const meta = runtime.sockets.get(ws);
        if (meta?.userId) {
          const users = await readJson('users', []);
          const user = users.find(u => u.id === meta.userId);
          if (user) {
            user.presence = sanitizePresence(msg.presence || msg);
            user.online = true;
            await writeJson('users', users);
            broadcast({ type:'presence-update', user:publicUserLite(user) });
            broadcastAdmins({ type:'users-updated' });
          }
        }
      }
      if (msg.type === 'private-message') {
        const meta = runtime.sockets.get(ws);
        if (meta?.userId) {
          const users = await readJson('users', []);
          const sender = users.find(u => u.id === meta.userId);
          const recipient = await findUserByLogin(msg.to || msg.recipient || '');
          if (sender && recipient && recipient.id !== sender.id) {
            const messages = await readJson('privateMessages', []);
            const message = {
              id:id('pm'), type:'private-message', privacyModel:'sealed-delivery', serverPolicy:'metadata-only-admin-view',
              fromId:sender.id, fromUsername:sender.username, fromEmail:sender.email,
              toId:recipient.id, toUsername:recipient.username, toEmail:recipient.email,
              sealedText:safeString(msg.sealedText || msg.text, 5000), status:'sent', createdAt:nowISO(), deliveredAt:null, readAt:null
            };
            if (message.sealedText) {
              messages.push(message);
              await writeJson('privateMessages', messages.slice(-MAX_PRIVATE_MESSAGES));
              sendToUser(recipient.id, { type:'private-message', message:privateEnvelopeFor(message, recipient.id) });
              sendToUser(sender.id, { type:'private-message', message:privateEnvelopeFor(message, sender.id) });
            }
          }
        }
      }
      if (msg.type === 'ping') send(ws, { type:'pong', time:nowISO() });
    } catch (err) {
      send(ws, { type:'error', error:'bad_ws_message' });
    }
  });
  ws.on('close', () => {
    const meta = runtime.sockets.get(ws);
    runtime.sockets.delete(ws);
    markUserOnlineState(meta?.userId, false).catch(err => logLine('error', `offline: ${err.message}`));
  });
});
setInterval(async () => {
  try { broadcastAdmins({ type:'metrics', metrics:await metrics() }); } catch (err) { logLine('error', `metrics: ${err.message}`); }
}, 1000);

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
async function shutdown() {
  logLine('info', 'Encerrando Big Server...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

bootstrap().then(() => {
  server.listen(PORT, HOST, () => {
    logLine('info', `Big Server online em http://${HOST}:${PORT}`);
    console.log(`\nBig Server online`);
    console.log(`Member app: http://localhost:${PORT}/member-app/`);
    console.log(`Admin app : http://localhost:${PORT}/admin-app/`);
    console.log(`Admin inicial: clzin@big.x / clzin123\n`);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
