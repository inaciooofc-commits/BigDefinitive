const DEFAULT_CONFIG = {
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
  modules: { music:true, chat:true, party:true, games:true, shop:true, ranking:true, events:true, missions:true, fakeMoney:true, globalNotices:true }
};

const navItems = [
  ['home','⌂','Home'], ['player','♪','Player'], ['party','◉','Party'], ['chat','✦','Chat'], ['games','▣','Jogos'], ['shop','◇','Loja'], ['profile','●','Perfil'], ['events','★','Eventos']
];

const songs = [
  ['Neon Beach Opening','Colômbia Radio Lab'],
  ['Moonlight Party Sync','Big Sound System'],
  ['Cyan Summer Protocol','Cl Inc. Sessions'],
  ['Pink Storm Arcade','Night Anime Club']
];

const missions = [
  ['Missão diária','Entre em uma party hoje e ganhe 120 BIG','+120 BIG'],
  ['Chat vivo','Envie 5 mensagens no chat global','+80 BIG'],
  ['Explorador','Abra 2 jogos gratuitos do catálogo','+150 BIG'],
  ['Colecionador','Visite a loja e favorite um item','+60 BIG'],
  ['Noite cyber','Escute 20 minutos no player','+200 BIG'],
  ['Comunidade','Convide um amigo para uma party','+300 BIG']
];

const listeners = ['Colombia','Luna','Akira','Noa','Mika','Zero'];
const games = [
  ['Arcade Neon Runner','Corrida','Jogo configurável por URL segura no painel admin.'],
  ['Puzzle Ocean Grid','Puzzle','Iframe/link liberado pelo admin.'],
  ['Cyber Ball Arena','Multiplayer','Sala gratuita externa configurável.'],
  ['Anime Jump Lite','Casual','Catálogo visual sem dinheiro real.'],
  ['Pixel Drift Friends','Corrida','Recompensa fake por tempo jogado.'],
  ['Co-op Island','Ação','Servidor externo permitido pelo admin.']
];
const shop = [
  ['Avatar Cyber Beach','Avatar','850 BIG','Épico'],
  ['Moldura Pink Storm','Moldura','620 BIG','Raro'],
  ['Tema Neon Night','Tema','1.200 BIG','Lendário'],
  ['Reação Onda Sonora','Reação','320 BIG','Comum'],
  ['Fundo Summer Party','Fundo Party','980 BIG','Épico'],
  ['Efeito Perfil Ciano','Efeito','760 BIG','Raro']
];
const events = [
  ['Festival Neon Night','Evento de música com ranking de participação.','Hoje'],
  ['Semana Cyber Beach','Missões dobradas e itens temporários.','7 dias'],
  ['Arcade Party','Recompensas fake para jogos selecionados.','Fim de semana'],
  ['Pink Storm Drop','Novos avatares e molduras no catálogo.','Em breve']
];

let state = {
  user: JSON.parse(localStorage.getItem('big.session') || 'null'),
  config: readConfig(),
  playing: false,
  songIndex: 0,
  money: Number(localStorage.getItem('big.money') || 2450)
};

function readConfig(){
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('big.admin.config') || '{}') }; }
  catch { return DEFAULT_CONFIG; }
}

function saveSession(user){
  state.user = user;
  localStorage.setItem('big.session', JSON.stringify(user));
}

function normalizeUser(input){
  const clean = String(input || '').trim().toLowerCase().replace(/\s+/g,'');
  const withoutDomain = clean.endsWith('@big.x') ? clean.replace('@big.x','') : clean;
  const role = withoutDomain.startsWith('admin@') ? 'admin' : 'common';
  const username = withoutDomain.replace(/^admin@/,'').replace(/[^a-z0-9._-]/g,'') || 'membro';
  return { username, email: `${username}@big.x`, role, avatar: username[0]?.toUpperCase() || 'B' };
}

function applyConfig(){
  state.config = readConfig();
  document.documentElement.style.setProperty('--primary', state.config.primaryColor || DEFAULT_CONFIG.primaryColor);
  document.documentElement.style.setProperty('--secondary', state.config.secondaryColor || DEFAULT_CONFIG.secondaryColor);
  document.documentElement.style.setProperty('--accent', state.config.accentColor || DEFAULT_CONFIG.accentColor);
  document.querySelectorAll('[data-logo]').forEach(el => el.textContent = state.config.logoText || state.config.appName || 'Big');
  document.querySelectorAll('[data-app-name]').forEach(el => el.textContent = state.config.appName || 'Big');
  document.querySelectorAll('[data-creator]').forEach(el => el.textContent = state.config.creator || 'Colômbia');
  document.querySelectorAll('[data-company]').forEach(el => el.textContent = state.config.company || 'Cl Inc. Enterteiments');
  document.title = `${state.config.appName || 'Big'} — App Principal`;
  applyModules();
}

function applyModules(){
  const modules = state.config.modules || DEFAULT_CONFIG.modules;
  const map = { player:'music', chat:'chat', party:'party', games:'games', shop:'shop', events:'events' };
  Object.entries(map).forEach(([view,module]) => {
    document.querySelectorAll(`[data-view="${view}"], [data-go="${view}"]`).forEach(el => {
      el.classList.toggle('module-disabled', modules[module] === false);
      el.title = modules[module] === false ? 'Módulo desativado pelo painel admin' : '';
    });
  });
}

function showSplash(){
  applyConfig();
  const phrases = ['Conectando sua vibe...','Preparando sua party...','Sincronizando o mundo Big...','Sua noite começa aqui...'];
  let progress = 0;
  const bar = document.querySelector('#loadingBar');
  const text = document.querySelector('#loadingText');
  const timer = setInterval(() => {
    progress += 7;
    bar.style.width = `${Math.min(progress,100)}%`;
    text.textContent = phrases[Math.floor(progress/28) % phrases.length];
    if(progress >= 100){ clearInterval(timer); boot(); }
  }, 90);
}

function boot(){
  document.querySelector('#splash').classList.add('hidden');
  renderNav(); renderCards(); renderChats(); renderUser(); renderNotice();
  if(state.user) showApp(); else document.querySelector('#loginView').classList.remove('hidden');
}

function showApp(){
  document.querySelector('#loginView').classList.add('hidden');
  document.querySelector('#appShell').classList.remove('hidden');
  renderUser();
}

function renderNav(){
  const desktop = document.querySelector('#desktopNav');
  const mobile = document.querySelector('#mobileNav');
  [desktop,mobile].forEach(host => {
    host.innerHTML = navItems.map(([id,icon,label]) => `<button class="nav-item ${id==='home'?'active':''}" data-view="${id}"><span>${icon}</span><span>${label}</span></button>`).join('');
  });
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.go)));
  applyModules();
}

function go(id){
  const modules = state.config.modules || DEFAULT_CONFIG.modules;
  const gates = { player:'music', chat:'chat', party:'party', games:'games', shop:'shop', events:'events' };
  if(gates[id] && modules[gates[id]] === false) return;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(id)?.classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === id));
  const item = navItems.find(n => n[0] === id);
  document.querySelector('#viewTitle').textContent = item ? item[2] : 'Big';
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderCards(){
  document.querySelector('#missionGrid').innerHTML = missions.map(([title,desc,reward]) => `<article class="data-card glass"><span class="tag">${reward}</span><h4>${title}</h4><p>${desc}</p><button class="mini-btn">Resgatar</button></article>`).join('');
  document.querySelector('#listeners').innerHTML = listeners.map(name => `<div class="listener"><div class="avatar">${name[0]}</div><div><strong>${name}</strong><small> ouvindo agora</small></div></div>`).join('');
  document.querySelector('#partyMembers').innerHTML = listeners.slice(0,4).map(name => `<div class="party-member"><div class="avatar">${name[0]}</div><strong>${name}</strong><small>sincronizado</small></div>`).join('');
  document.querySelector('#onlineUsers').innerHTML = listeners.concat(['Kai','Nina','Ryo','Sol']).map(name => `<div class="online-user"><div class="avatar">${name[0]}</div><div><strong>${name}</strong><small>${name.toLowerCase()}@big.x</small></div></div>`).join('');
  document.querySelector('#gamesGrid').innerHTML = games.map(([title,cat,desc]) => `<article class="data-card glass"><span class="tag">${cat}</span><h4>${title}</h4><p>${desc}</p><button class="primary-btn" data-play-game="${title}">Jogar</button></article>`).join('');
  document.querySelector('#shopGrid').innerHTML = shop.map(([title,cat,price,rarity]) => `<article class="data-card glass"><span class="tag">${rarity}</span><h4>${title}</h4><p>${cat}</p><div class="price">${price}</div><button class="primary-btn" data-buy="${title}">Comprar fake</button></article>`).join('');
  document.querySelector('#eventsGrid').innerHTML = events.map(([title,desc,time]) => `<article class="data-card glass"><span class="tag">${time}</span><h4>${title}</h4><p>${desc}</p><button class="ghost-btn">Participar</button></article>`).join('');
}

function renderUser(){
  const u = state.user || normalizeUser('visitante');
  document.querySelector('#topUser').textContent = u.username;
  document.querySelector('#topEmail').textContent = u.email;
  document.querySelector('#topAvatar').textContent = u.avatar;
  document.querySelector('#profileAvatar').textContent = u.avatar;
  document.querySelector('#profileName').textContent = u.username;
  document.querySelector('#profileEmail').textContent = u.email;
  document.querySelector('#homeProfileAvatar') && (document.querySelector('#homeProfileAvatar').textContent = u.avatar);
  document.querySelector('#homeProfileName') && (document.querySelector('#homeProfileName').textContent = u.username);
  document.querySelector('#homeProfileEmail') && (document.querySelector('#homeProfileEmail').textContent = u.email);
  document.querySelector('#moneyBalance').textContent = `${state.money.toLocaleString('pt-BR')} BIG`;
}

function getMessages(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}
function saveMessages(key, data){ localStorage.setItem(key, JSON.stringify(data)); }

function renderChats(){
  const common = [
    {user:'Colombia', email:'colombia@big.x', text:'Big conecta música, jogos e amigos.'},
    {user:'Luna', email:'luna@big.x', text:'Essa party ficou bonita demais.'},
    {user:'Admin', email:'admin@big.x', text:'Avisos globais aparecem no topo quando enviados pelo painel.'}
  ];
  const party = [
    {user:'Mika', email:'mika@big.x', text:'Sincronizado aqui.'},
    {user:'Zero', email:'zero@big.x', text:'Solta a próxima.'}
  ];
  drawChat('#globalChat', getMessages('big.chat.global', common));
  drawChat('#partyChat', getMessages('big.chat.party', party));
}

function drawChat(selector, messages){
  document.querySelector(selector).innerHTML = messages.map(m => `<div class="message"><div class="avatar">${m.user[0] || 'B'}</div><div class="message-body"><strong>${m.user}</strong><small>${m.email}</small><p>${m.text}</p></div></div>`).join('');
}

function renderNotice(){
  const host = document.querySelector('#globalNoticeHost');
  let notices = [];
  try { notices = JSON.parse(localStorage.getItem('big.admin.notices') || '[]'); } catch {}
  const latest = notices.slice(-2).reverse();
  host.innerHTML = latest.map(n => `<div class="notice"><div><strong>${n.type || 'Aviso global'}</strong><p>${n.text}</p></div><button class="mini-btn" onclick="this.closest('.notice').remove()">Fechar</button></div>`).join('');
}

function updateSong(){
  document.querySelector('#songTitle').textContent = songs[state.songIndex][0];
  document.querySelector('#songArtist').textContent = songs[state.songIndex][1];
}

document.addEventListener('submit', (event) => {
  if(event.target.id === 'loginForm'){
    event.preventDefault();
    const user = normalizeUser(document.querySelector('#loginName').value);
    saveSession(user); showApp();
    document.querySelector('#loginHint').textContent = `Conta carregada: ${user.email}`;
  }
  if(event.target.matches('[data-chat-form]')){
    event.preventDefault();
    const type = event.target.dataset.chatForm;
    const input = event.target.querySelector('input');
    const text = input.value.trim();
    if(!text) return;
    const key = type === 'party' ? 'big.chat.party' : 'big.chat.global';
    const messages = getMessages(key, []);
    const u = state.user || normalizeUser('visitante');
    messages.push({ user:u.username, email:u.email, text });
    saveMessages(key, messages.slice(-80));
    input.value = '';
    renderChats();
  }
});

document.addEventListener('click', (event) => {
  const goBtn = event.target.closest('[data-go]');
  if(goBtn) go(goBtn.dataset.go);
  if(event.target.id === 'createLocalAccount'){
    const user = normalizeUser(document.querySelector('#loginName').value || 'novo');
    saveSession(user); showApp();
  }
  if(event.target.id === 'logoutBtn'){
    localStorage.removeItem('big.session'); state.user = null; location.reload();
  }
  if(event.target.id === 'playToggle'){
    state.playing = !state.playing; event.target.textContent = state.playing ? 'Ⅱ' : '▶';
  }
  if(event.target.id === 'nextSong'){
    state.songIndex = (state.songIndex + 1) % songs.length; updateSong();
  }
  if(event.target.id === 'prevSong'){
    state.songIndex = (state.songIndex - 1 + songs.length) % songs.length; updateSong();
  }
  const buy = event.target.closest('[data-buy]');
  if(buy){
    state.money = Math.max(0, state.money - 120);
    localStorage.setItem('big.money', state.money);
    renderUser();
    alert(`Compra fake registrada: ${buy.dataset.buy}. Integre ao backend para inventário real.`);
  }
  const playGame = event.target.closest('[data-play-game]');
  if(playGame){ alert(`Abrindo jogo: ${playGame.dataset.playGame}. No backend, validar domínio permitido antes de usar iframe.`); }
});

window.addEventListener('storage', (event) => {
  if(event.key?.startsWith('big.admin')){ applyConfig(); renderNotice(); }
});
setInterval(() => { applyConfig(); renderNotice(); }, 3000);
showSplash();
