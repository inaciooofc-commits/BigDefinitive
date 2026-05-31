const DEFAULT_CONFIG = {
  appName: 'Big', creator: 'Colômbia', company: 'Cl Inc. Enterteiments', ageRating: '+16', localEmailDomain: 'big.x',
  theme: 'Cyber Beach', primaryColor: '#8b5cf6', secondaryColor: '#06b6d4', accentColor: '#ec4899', logoText: 'Big',
  modules: { music:true, chat:true, party:true, games:true, shop:true, ranking:true, events:true, missions:true, fakeMoney:true, globalNotices:true }
};
const templates = {
  'Cyber Beach':['#8b5cf6','#06b6d4','#ec4899'],
  'Neon Night':['#7c3aed','#22d3ee','#f43f5e'],
  'Anime Club':['#a855f7','#38bdf8','#fb7185'],
  'Deep Ocean':['#0ea5e9','#14b8a6','#6366f1'],
  'Pink Storm':['#db2777','#60a5fa','#f472b6'],
  'Dark Premium':['#64748b','#22d3ee','#a855f7'],
  'Summer Party':['#f97316','#06b6d4','#ec4899'],
  'Big Original':['#8b5cf6','#06b6d4','#ec4899']
};
const nav = [
  ['dashboard','⌁','Dashboard'], ['users','●','Usuários'], ['notices','✦','Avisos'], ['settings','⚙','Configurações'], ['apis','⌬','APIs'], ['economy','◇','Loja/Economia'], ['logs','≡','Logs'], ['templates','◈','Templates'], ['content','▣','Conteúdo'], ['sheets','▤','Google Sheets']
];
let config = read('big.admin.config', DEFAULT_CONFIG);
let users = read('big.admin.users', [
  makeUser('admin@colombia','admin'), makeUser('pedro','common'), makeUser('luna','common')
]);
let notices = read('big.admin.notices', []);
let logs = read('big.admin.logs', []);
let apis = read('big.admin.apis', [
  {name:'Music Provider', key:'', active:true, status:'aguardando chave'},
  {name:'Games Catalog', key:'', active:true, status:'local demo'},
  {name:'Assets CDN', key:'', active:false, status:'desativada'}
]);
let items = read('big.admin.items', [
  {name:'Avatar Cyber Beach', category:'Avatar', price:850, rarity:'Épico', active:true},
  {name:'Moldura Pink Storm', category:'Moldura', price:620, rarity:'Raro', active:true},
  {name:'Tema Neon Night', category:'Tema', price:1200, rarity:'Lendário', active:true}
]);

function read(key, fallback){ try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function now(){ return new Date().toLocaleString('pt-BR'); }
function addLog(type, text){ logs.unshift({time:now(), type, text}); logs = logs.slice(0,120); write('big.admin.logs', logs); renderLogs(); }
function normalize(raw){
  const clean = String(raw || '').trim().toLowerCase().replace(/\s+/g,'');
  const role = clean.startsWith('admin@') ? 'admin' : 'common';
  const username = clean.replace(/^admin@/,'').replace('@big.x','').replace(/[^a-z0-9._-]/g,'') || 'membro';
  return { username, role, email:`${username}@big.x` };
}
function makeUser(raw, forcedRole){
  const u = normalize(raw); if(forcedRole) u.role = forcedRole;
  return { ...u, id:cryptoRandom(), money:2450, online:Math.random() > .35, createdAt:now(), lastLogin:now(), bannedUntil:null, banReason:'' };
}
function cryptoRandom(){ return Math.random().toString(36).slice(2,10); }
function saveAll(){ write('big.admin.config', config); write('big.admin.users', users); write('big.admin.notices', notices); write('big.admin.apis', apis); write('big.admin.items', items); }

function boot(){
  renderNav(); applyConfig(); renderDashboard(); renderUsers(); renderNotices(); renderSettings(); renderApis(); renderItems(); renderLogs(); renderTemplates(); renderContent();
  setInterval(renderDashboard, 1000);
}
function applyConfig(){
  document.documentElement.style.setProperty('--primary', config.primaryColor || DEFAULT_CONFIG.primaryColor);
  document.documentElement.style.setProperty('--secondary', config.secondaryColor || DEFAULT_CONFIG.secondaryColor);
  document.documentElement.style.setProperty('--accent', config.accentColor || DEFAULT_CONFIG.accentColor);
  document.querySelectorAll('[data-logo]').forEach(el => el.textContent = config.logoText || 'Big');
}
function renderNav(){
  document.querySelector('#adminNav').innerHTML = nav.map(([id,icon,label]) => `<button class="nav-btn ${id==='dashboard'?'active':''}" data-admin-view="${id}"><span>${icon}</span><span>${label}</span></button>`).join('');
  document.querySelectorAll('[data-admin-view]').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.adminView)));
}
function go(id){
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active-view'));
  document.querySelector(`#${id}`)?.classList.add('active-view');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.adminView === id));
  const item = nav.find(n => n[0] === id);
  document.querySelector('#adminTitle').textContent = item ? item[2] : 'Admin';
  window.scrollTo({top:0, behavior:'smooth'});
}
function renderDashboard(){
  const cpu = rand(12,82), ram = rand(28,88), disk = rand(32,74), req = rand(42,220);
  const online = users.filter(u => u.online).length;
  const parties = rand(4,26), messages = rand(12,90), games = rand(2,19);
  const health = Math.max(74, Math.min(99, 100 - Math.round((cpu + ram)/18) + rand(0,8)));
  document.querySelector('#healthScore').textContent = `${health}%`;
  document.querySelector('#healthRingText').textContent = health > 85 ? 'OK' : 'ATENÇÃO';
  document.querySelector('.health-ring').style.background = `conic-gradient(${health > 85 ? 'var(--success)' : 'var(--warn)'} 0 ${health}%, rgba(255,255,255,.1) ${health}% 100%)`;
  const metrics = [
    ['CPU',`${cpu}%`,cpu], ['RAM',`${ram}%`,ram], ['Disco',`${disk}%`,disk], ['Uptime','3d 14h',86],
    ['Usuários online',online,online*8], ['Parties ativas',parties,parties*4], ['Msg/min',messages,messages], ['Jogos abertos',games,games*5],
    ['Req/min',req,Math.min(req/2,100)], ['Status APIs',`${apis.filter(a=>a.active).length}/${apis.length}`,70], ['Servidor','Online',98], ['Módulos ativos',`${Object.values(config.modules||{}).filter(Boolean).length}/10`,85]
  ];
  document.querySelector('#metricGrid').innerHTML = metrics.map(([name,value,p]) => `<div class="metric-card panel"><span>${name}</span><strong>${value}</strong><div class="meter"><i style="width:${Math.min(Number(p)||70,100)}%"></i></div></div>`).join('');
}
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function renderUsers(){
  document.querySelector('#usersTable').innerHTML = users.map(u => {
    const banned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
    return `<div class="row-card ${banned?'banned':''}"><div><strong>${u.username} <span class="status-tag">${u.role}</span></strong><small>${u.email} • ${u.online?'online':'offline'} • saldo ${u.money} BIG</small><small>Criado: ${u.createdAt} • Último login: ${u.lastLogin}</small>${banned?`<small>Banido até ${new Date(u.bannedUntil).toLocaleString('pt-BR')} • ${u.banReason}</small>`:''}</div><div class="row-actions"><button class="tiny ok" data-money="${u.id}">+500 BIG</button><button class="tiny" data-reset="${u.id}">Reset senha</button><button class="tiny ban" data-ban="${u.id}" data-min="10">Ban 10m</button><button class="tiny ban" data-ban="${u.id}" data-min="15">Ban 15m</button><button class="tiny ban" data-ban="${u.id}" data-min="60">Ban 1h</button><button class="tiny" data-unban="${u.id}">Revogar</button></div></div>`;
  }).join('') || '<p>Nenhum usuário criado.</p>';
}
function renderNotices(){
  document.querySelector('#noticeList').innerHTML = notices.map((n,i) => `<div class="row-card"><div><strong>${n.type}</strong><small>${n.time} • ${n.duration}</small><p>${n.text}</p></div><button class="tiny ban" data-del-notice="${i}">Remover</button></div>`).join('') || '<p>Nenhum aviso enviado.</p>';
}
function renderSettings(){
  document.querySelector('#cfgAppName').value = config.appName || 'Big';
  document.querySelector('#cfgLogo').value = config.logoText || 'Big';
  document.querySelector('#cfgCreator').value = config.creator || 'Colômbia';
  document.querySelector('#cfgCompany').value = config.company || 'Cl Inc. Enterteiments';
  document.querySelector('#cfgPrimary').value = config.primaryColor || '#8b5cf6';
  document.querySelector('#cfgSecondary').value = config.secondaryColor || '#06b6d4';
  document.querySelector('#cfgAccent').value = config.accentColor || '#ec4899';
  document.querySelector('#cfgTheme').innerHTML = Object.keys(templates).map(t => `<option ${t===config.theme?'selected':''}>${t}</option>`).join('');
  const labels = {music:'Música',chat:'Chat',party:'Party',games:'Jogos',shop:'Loja',ranking:'Ranking',events:'Eventos',missions:'Missões',fakeMoney:'Dinheiro fake',globalNotices:'Avisos'};
  document.querySelector('#moduleToggles').innerHTML = Object.keys(DEFAULT_CONFIG.modules).map(key => `<label class="toggle"><span>${labels[key] || key}</span><input type="checkbox" data-module="${key}" ${config.modules?.[key]!==false?'checked':''}></label>`).join('');
}
function renderApis(){
  document.querySelector('#apiList').innerHTML = apis.map((a,i) => `<div class="api-row"><input data-api-name="${i}" value="${a.name}"><input data-api-key="${i}" value="${a.key}" placeholder="Chave API"><select data-api-active="${i}"><option ${a.active?'selected':''}>ativa</option><option ${!a.active?'selected':''}>desativada</option></select><button class="tiny" data-test-api="${i}">Testar</button><small class="status-tag">${a.status}</small></div>`).join('');
}
function renderItems(){
  document.querySelector('#itemList').innerHTML = items.map((it,i) => `<div class="row-card"><div><strong>${it.name} <span class="status-tag">${it.rarity}</span></strong><small>${it.category} • ${it.price} BIG • ${it.active?'ativo':'desativado'}</small></div><div class="row-actions"><button class="tiny" data-toggle-item="${i}">${it.active?'Desativar':'Ativar'}</button><button class="tiny ban" data-del-item="${i}">Excluir</button></div></div>`).join('') || '<p>Nenhum item cadastrado.</p>';
}
function renderLogs(){
  const filter = document.querySelector('#logFilter')?.value || 'todos';
  const list = filter === 'todos' ? logs : logs.filter(l => l.type === filter);
  document.querySelector('#logList').innerHTML = list.map(l => `<div class="log-item"><strong>${l.type}</strong><small>${l.time}</small><p>${l.text}</p></div>`).join('') || '<p>Nenhum log encontrado.</p>';
}
function renderTemplates(){
  document.querySelector('#templateGrid').innerHTML = Object.entries(templates).map(([name, colors]) => `<article class="template-card panel"><div><span class="eyebrow">Preview</span><h3>${name}</h3></div><div class="swatches">${colors.map(c => `<i style="background:${c}"></i>`).join('')}</div><button class="primary-btn" data-apply-template="${name}">Aplicar</button></article>`).join('');
}
function renderContent(){
  const content = read('big.admin.content', {
    banners:['Big conecta música, jogos e amigos.'],
    musics:['Neon Beach Opening','Moonlight Party Sync'],
    games:['Arcade Neon Runner','Puzzle Ocean Grid'],
    events:['Festival Neon Night'],
    missions:['Entrar em uma party','Enviar 5 mensagens'],
    texts:{ loading:'Conectando sua vibe...', rating:'+16' }
  });
  document.querySelector('#contentJson').value = JSON.stringify(content, null, 2);
}

function persistConfigFromForm(){
  config = {
    ...config,
    appName: document.querySelector('#cfgAppName').value.trim() || 'Big',
    logoText: document.querySelector('#cfgLogo').value.trim() || 'Big',
    creator: document.querySelector('#cfgCreator').value.trim() || 'Colômbia',
    company: document.querySelector('#cfgCompany').value.trim() || 'Cl Inc. Enterteiments',
    primaryColor: document.querySelector('#cfgPrimary').value,
    secondaryColor: document.querySelector('#cfgSecondary').value,
    accentColor: document.querySelector('#cfgAccent').value,
    theme: document.querySelector('#cfgTheme').value,
    modules: {...DEFAULT_CONFIG.modules}
  };
  document.querySelectorAll('[data-module]').forEach(input => config.modules[input.dataset.module] = input.checked);
  write('big.admin.config', config);
  applyConfig(); addLog('config','Configurações visuais e funcionais aplicadas pelo painel admin.');
}

document.addEventListener('submit', (event) => {
  if(event.target.id === 'userForm'){
    event.preventDefault();
    const u = makeUser(document.querySelector('#userInput').value);
    users.unshift(u); write('big.admin.users', users); renderUsers(); addLog('usuário',`Usuário ${u.username} criado como ${u.role}. Email local: ${u.email}.`); event.target.reset(); document.querySelector('#userPassword').value = 'big123';
  }
  if(event.target.id === 'noticeForm'){
    event.preventDefault();
    const notice = { type:document.querySelector('#noticeType').value, duration:document.querySelector('#noticeDuration').value, text:document.querySelector('#noticeText').value.trim(), time:now() };
    notices.push(notice); write('big.admin.notices', notices); renderNotices(); addLog('aviso',`Aviso global enviado: ${notice.text}`); event.target.reset();
  }
  if(event.target.id === 'configForm'){
    event.preventDefault(); persistConfigFromForm(); alert('Configuração aplicada. Abra/atualize o app principal para visualizar imediatamente.');
  }
  if(event.target.id === 'itemForm'){
    event.preventDefault();
    const item = { name:document.querySelector('#itemName').value.trim(), category:document.querySelector('#itemCategory').value.trim(), price:Number(document.querySelector('#itemPrice').value), rarity:document.querySelector('#itemRarity').value, active:true };
    items.unshift(item); write('big.admin.items', items); renderItems(); addLog('loja',`Item criado: ${item.name}, ${item.price} BIG, raridade ${item.rarity}.`); event.target.reset(); document.querySelector('#itemPrice').value = 500;
  }
});

document.addEventListener('click', (event) => {
  const ban = event.target.closest('[data-ban]');
  if(ban){ const u = users.find(x => x.id === ban.dataset.ban); if(u){ const min = Number(ban.dataset.min); u.bannedUntil = new Date(Date.now() + min*60000).toISOString(); u.banReason = `Banimento temporário de ${min} minutos`; write('big.admin.users', users); renderUsers(); addLog('banimento',`${u.username} banido por ${min} minutos.`); } }
  const unban = event.target.closest('[data-unban]');
  if(unban){ const u = users.find(x => x.id === unban.dataset.unban); if(u){ u.bannedUntil = null; u.banReason = ''; write('big.admin.users', users); renderUsers(); addLog('banimento',`Banimento revogado para ${u.username}.`); } }
  const money = event.target.closest('[data-money]');
  if(money){ const u = users.find(x => x.id === money.dataset.money); if(u){ u.money += 500; write('big.admin.users', users); renderUsers(); addLog('usuário',`Adicionado 500 BIG para ${u.username}.`); } }
  const reset = event.target.closest('[data-reset]');
  if(reset){ const u = users.find(x => x.id === reset.dataset.reset); if(u){ addLog('usuário',`Senha de ${u.username} resetada para big123 no protótipo.`); alert(`Senha de ${u.username} resetada para big123.`); } }
  const delNotice = event.target.closest('[data-del-notice]');
  if(delNotice){ notices.splice(Number(delNotice.dataset.delNotice),1); write('big.admin.notices', notices); renderNotices(); addLog('aviso','Aviso removido do histórico.'); }
  const tmpl = event.target.closest('[data-apply-template]');
  if(tmpl){ const name = tmpl.dataset.applyTemplate; const colors = templates[name]; config.theme = name; config.primaryColor = colors[0]; config.secondaryColor = colors[1]; config.accentColor = colors[2]; write('big.admin.config', config); applyConfig(); renderSettings(); addLog('config',`Template ${name} aplicado globalmente.`); }
  if(event.target.id === 'restoreTemplate'){ config = {...DEFAULT_CONFIG}; write('big.admin.config', config); applyConfig(); renderSettings(); addLog('config','Template padrão Big Original restaurado.'); }
  if(event.target.id === 'seedUsers'){ ['admin@akira','noa','mika','zero','sol'].forEach(n => users.unshift(makeUser(n))); write('big.admin.users', users); renderUsers(); addLog('usuário','Usuários demo adicionados.'); }
  if(event.target.id === 'addApi'){ apis.push({name:'Nova API', key:'', active:false, status:'não testada'}); write('big.admin.apis', apis); renderApis(); addLog('api','Nova API adicionada.'); }
  const testApi = event.target.closest('[data-test-api]');
  if(testApi){ const i = Number(testApi.dataset.testApi); apis[i].status = apis[i].key ? 'teste visual OK' : 'sem chave'; write('big.admin.apis', apis); renderApis(); addLog('api',`API ${apis[i].name} testada: ${apis[i].status}.`); }
  const toggleItem = event.target.closest('[data-toggle-item]');
  if(toggleItem){ const i=Number(toggleItem.dataset.toggleItem); items[i].active = !items[i].active; write('big.admin.items', items); renderItems(); addLog('loja',`Item ${items[i].name} ${items[i].active?'ativado':'desativado'}.`); }
  const delItem = event.target.closest('[data-del-item]');
  if(delItem){ const i=Number(delItem.dataset.delItem); const name = items[i].name; items.splice(i,1); write('big.admin.items', items); renderItems(); addLog('loja',`Item excluído: ${name}.`); }
  if(event.target.id === 'saveContent'){
    try { const parsed = JSON.parse(document.querySelector('#contentJson').value); write('big.admin.content', parsed); addLog('config','Conteúdo do app salvo pelo painel admin.'); alert('Conteúdo salvo.'); } catch { alert('JSON inválido. Corrija antes de salvar.'); }
  }
  if(event.target.id === 'exportState'){
    const data = {config, users, notices, apis, items, logs};
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'big-admin-config.json'; a.click(); URL.revokeObjectURL(a.href);
  }
  if(event.target.id === 'resetDemo'){
    if(confirm('Resetar dados demo locais?')){ ['big.admin.config','big.admin.users','big.admin.notices','big.admin.logs','big.admin.apis','big.admin.items','big.admin.content'].forEach(k => localStorage.removeItem(k)); location.reload(); }
  }
});

document.addEventListener('input', (event) => {
  const apiName = event.target.closest('[data-api-name]'); if(apiName){ apis[Number(apiName.dataset.apiName)].name = apiName.value; write('big.admin.apis', apis); }
  const apiKey = event.target.closest('[data-api-key]'); if(apiKey){ apis[Number(apiKey.dataset.apiKey)].key = apiKey.value; write('big.admin.apis', apis); }
});
document.addEventListener('change', (event) => {
  const active = event.target.closest('[data-api-active]'); if(active){ const i=Number(active.dataset.apiActive); apis[i].active = active.value === 'ativa'; write('big.admin.apis', apis); addLog('api',`API ${apis[i].name} ${apis[i].active?'ativada':'desativada'}.`); }
  if(event.target.id === 'logFilter') renderLogs();
  if(event.target.id === 'cfgTheme'){
    const colors = templates[event.target.value]; if(colors){ document.querySelector('#cfgPrimary').value=colors[0]; document.querySelector('#cfgSecondary').value=colors[1]; document.querySelector('#cfgAccent').value=colors[2]; }
  }
});
boot();
