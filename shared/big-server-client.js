(() => {
  const API = {
    tokenKey: 'big.server.token',
    ws: null,
    get token(){ return localStorage.getItem(this.tokenKey) || ''; },
    set token(v){ if(v) localStorage.setItem(this.tokenKey, v); else localStorage.removeItem(this.tokenKey); },
    async request(path, opts={}){
      const headers = { 'Content-Type':'application/json', ...(opts.headers||{}) };
      if(this.token) headers.Authorization = `Bearer ${this.token}`;
      const res = await fetch(path, { ...opts, headers });
      const data = await res.json().catch(() => ({}));
      if(!res.ok) throw Object.assign(new Error(data.error || res.statusText), { data, status:res.status });
      return data;
    },
    async syncPublic(){
      try {
        const [config, notices, catalog, store] = await Promise.all([
          this.request('/api/config'), this.request('/api/announcements'), this.request('/api/catalog'), this.request('/api/store')
        ]);
        localStorage.setItem('big.admin.config', JSON.stringify(config));
        localStorage.setItem('big.admin.notices', JSON.stringify((notices||[]).map(n => ({ type:n.type, text:n.text, duration:n.duration, time:new Date(n.time).toLocaleString('pt-BR') }))));
        localStorage.setItem('big.server.catalog', JSON.stringify(catalog));
        localStorage.setItem('big.admin.items', JSON.stringify(store));
        window.dispatchEvent(new StorageEvent('storage', { key:'big.admin.config' }));
      } catch(err){ console.warn('[Big API] syncPublic falhou', err.message); }
    },
    connectWS(){
      if(this.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) return this.ws;
      try {
        const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
        this.ws = ws;
        ws.addEventListener('open', () => { if(this.token) ws.send(JSON.stringify({ type:'auth', token:this.token })); });
        ws.addEventListener('message', (ev) => {
          const msg = JSON.parse(ev.data);
          if(msg.type === 'config-update') { localStorage.setItem('big.admin.config', JSON.stringify(msg.config)); window.dispatchEvent(new StorageEvent('storage', { key:'big.admin.config' })); }
          if(msg.type === 'global-alert') { const list = JSON.parse(localStorage.getItem('big.admin.notices') || '[]'); list.unshift(msg.notice); localStorage.setItem('big.admin.notices', JSON.stringify(list.slice(0,50))); window.dispatchEvent(new StorageEvent('storage', { key:'big.admin.notices' })); }
          if(msg.type === 'metrics') window.BigLatestMetrics = msg.metrics;
          if(msg.type === 'chat-message' && msg.channel === 'global') window.dispatchEvent(new CustomEvent('big:chat-message', { detail:msg.message }));
          if(msg.type === 'presence-update') window.dispatchEvent(new CustomEvent('big:presence-update', { detail:msg.user }));
          if(msg.type === 'private-message') window.dispatchEvent(new CustomEvent('big:private-message', { detail:msg.message }));
          if(msg.type === 'private-message-read') window.dispatchEvent(new CustomEvent('big:private-message-read', { detail:msg }));
        });
        ws.addEventListener('close', () => setTimeout(() => this.connectWS(), 2500));
        return ws;
      } catch(err){ console.warn('[Big API] websocket indisponível', err.message); }
    }
  };
  window.BigAPI = API;

  document.addEventListener('DOMContentLoaded', () => {
    API.syncPublic();
    API.connectWS();
    const isMember = location.pathname.includes('/member-app');
    const isAdmin = location.pathname.includes('/admin-app');
    if(isMember) setupMember(API);
    if(isAdmin) setupAdmin(API);
  });

  function normalizeUser(input){
    const clean = String(input || '').trim().toLowerCase().replace(/\s+/g,'');
    const withoutDomain = clean.endsWith('@big.x') ? clean.replace('@big.x','') : clean;
    const role = withoutDomain.startsWith('admin@') ? 'admin' : 'common';
    const username = withoutDomain.replace(/^admin@/,'').replace(/[^a-z0-9._-]/g,'') || 'membro';
    return { username, email: `${username}@big.x`, role, avatar: username[0]?.toUpperCase() || 'B' };
  }
  function setHint(text){ const el = document.querySelector('#loginHint'); if(el) el.textContent = text; }
  function currentUser(){ try { return JSON.parse(localStorage.getItem('big.session') || 'null'); } catch { return null; } }
  function b64Encode(text){ return btoa(unescape(encodeURIComponent(text))); }
  function b64Decode(text){ try { return decodeURIComponent(escape(atob(text))); } catch { return text; } }
  function seal(text){ return `big-sealed:v1:${b64Encode(text)}`; }
  function unseal(text){ return String(text||'').startsWith('big-sealed:v1:') ? b64Decode(String(text).slice('big-sealed:v1:'.length)) : String(text||''); }
  function escapeHtml(str){ return String(str ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function setupMember(API){
    const loginForm = document.querySelector('#loginForm');
    if(loginForm){
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        const login = document.querySelector('#loginName')?.value || '';
        const password = document.querySelector('#loginPass')?.value || '';
        try {
          const data = await API.request('/api/auth/login', { method:'POST', body:JSON.stringify({ login, password }) });
          API.token = data.token;
          localStorage.setItem('big.session', JSON.stringify({ ...data.user, avatar:data.user.avatar || data.user.username[0].toUpperCase() }));
          setHint(`Conta carregada no servidor: ${data.user.email}`);
          location.reload();
        } catch(err) {
          setHint(err.data?.error === 'banned' ? `Conta banida até ${new Date(err.data.bannedUntil).toLocaleString('pt-BR')}` : 'Login falhou. Use uma conta criada no admin ou crie uma conta local.');
        }
      }, true);
      document.querySelector('#createLocalAccount')?.addEventListener('click', async (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        const username = document.querySelector('#loginName')?.value || 'novo';
        const password = document.querySelector('#loginPass')?.value || 'big123';
        try {
          const data = await API.request('/api/auth/register', { method:'POST', body:JSON.stringify({ username, password }) });
          API.token = data.token;
          localStorage.setItem('big.session', JSON.stringify({ ...data.user, avatar:data.user.avatar || data.user.username[0].toUpperCase() }));
          location.reload();
        } catch(err) {
          setHint('Não consegui criar no servidor. Talvez esse usuário já exista.');
        }
      }, true);
    }

    document.addEventListener('submit', async (event) => {
      if(event.target.matches('[data-chat-form]')){
        setTimeout(async () => {
          const messages = JSON.parse(localStorage.getItem('big.chat.global') || '[]');
          const last = messages[messages.length - 1];
          if(last && API.token) await API.request('/api/chat/global', { method:'POST', body:JSON.stringify({ text:last.text }) }).catch(()=>{});
        }, 0);
      }
    }, true);
    document.addEventListener('click', async (event) => {
      const game = event.target.closest('[data-play-game]');
      if(game && API.token) API.request('/api/games/open', { method:'POST', body:JSON.stringify({ game:game.dataset.playGame }) }).catch(()=>{});
    }, true);

    setupPresence(API);
    setupPrivateMessages(API);
    setupPasswordChange(API);
    setInterval(() => refreshOnlineUsers(API), 5000);
    refreshOnlineUsers(API);
    window.addEventListener('big:presence-update', () => refreshOnlineUsers(API));
  }

  function setupPasswordChange(API){
    const form = document.querySelector('#passwordForm');
    if(!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const status = document.querySelector('#passwordStatus');
      const payload = {
        currentPassword: document.querySelector('#currentPassword')?.value || '',
        newPassword: document.querySelector('#newPassword')?.value || '',
        confirmPassword: document.querySelector('#confirmPassword')?.value || ''
      };
      try {
        const data = await API.request('/api/me/password', { method:'PATCH', body:JSON.stringify(payload) });
        if(status) status.textContent = data.message || 'Senha alterada com sucesso.';
        form.reset();
      } catch(err){ if(status) status.textContent = err.data?.message || err.data?.error || 'Não consegui alterar a senha.'; }
    }, true);
  }

  async function collectPresence(){
    const now = new Date();
    let battery = { supported:false, level:null, charging:null };
    try {
      if(navigator.getBattery){
        const b = await navigator.getBattery();
        battery = { supported:true, level:Math.round((b.level || 0) * 100), charging:Boolean(b.charging) };
      }
    } catch {}
    return {
      localTime: now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
      localDate: now.toLocaleDateString('pt-BR'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
      locale: navigator.language || 'pt-BR',
      platform: navigator.platform || '',
      userAgent: navigator.userAgent || '',
      battery
    };
  }
  function setupPresence(API){
    if(!API.token) return;
    const sendPresence = async () => {
      const presence = await collectPresence();
      const status = document.querySelector('#deviceStatus');
      if(status){
        const batt = presence.battery.supported ? `${presence.battery.level}%${presence.battery.charging?' ⚡':''}` : 'bateria indisponível';
        status.textContent = `${presence.localTime} • ${batt}`;
      }
      API.request('/api/presence', { method:'POST', body:JSON.stringify(presence) }).catch(()=>{});
      if(API.ws?.readyState === WebSocket.OPEN) API.ws.send(JSON.stringify({ type:'presence', presence }));
    };
    sendPresence();
    setInterval(sendPresence, 15000);
    document.addEventListener('visibilitychange', () => { if(!document.hidden) sendPresence(); });
  }
  function batteryClass(p){
    const level = p?.battery?.level;
    if(level == null) return '';
    if(level <= 20) return 'low';
    if(level >= 60) return 'good';
    return '';
  }
  function formatBattery(p){
    if(!p?.battery?.supported) return 'bateria ?';
    return `${p.battery.level}%${p.battery.charging ? ' ⚡' : ''}`;
  }
  async function refreshOnlineUsers(API){
    if(!API.token) return;
    try {
      const users = await API.request('/api/users/online');
      const host = document.querySelector('#onlineUsers');
      if(host){
        host.innerHTML = users.map(u => {
          const p = u.presence || {};
          return `<div class="online-user ${u.online?'':'offline'}" data-peer="${escapeHtml(u.email)}"><div class="avatar">${escapeHtml(u.avatar || u.username[0] || 'B')}</div><div><strong>${escapeHtml(u.username)} ${u.role==='admin' ? '<span class="presence-chip">admin</span>' : ''}</strong><small>${escapeHtml(u.email)} • ${u.online?'online':'offline'}</small><div class="presence-meta"><span class="presence-chip">${escapeHtml(p.localDate || 'data ?')}</span><span class="presence-chip">${escapeHtml(p.localTime || 'hora ?')}</span><span class="battery-chip ${batteryClass(p)}">${escapeHtml(formatBattery(p))}</span></div></div></div>`;
        }).join('') || '<p class="private-empty">Nenhum outro usuário encontrado ainda.</p>';
      }
      const select = document.querySelector('#privateRecipient');
      if(select){
        const current = select.value;
        select.innerHTML = '<option value="">Escolha um usuário</option>' + users.map(u => `<option value="${escapeHtml(u.email)}">${escapeHtml(u.username)} — ${escapeHtml(u.email)}</option>`).join('');
        if(current) select.value = current;
      }
    } catch(err) { console.warn('[Big Presence] falhou', err.message); }
  }
  function setupPrivateMessages(API){
    const form = document.querySelector('#privateMessageForm');
    const select = document.querySelector('#privateRecipient');
    const thread = document.querySelector('#privateThread');
    if(!form || !select || !thread) return;
    const renderEmpty = (text='Escolha um usuário e envie algo privado.') => { thread.innerHTML = `<div class="private-empty">${escapeHtml(text)}</div>`; };
    renderEmpty('Mensagens privadas aparecem só para remetente e destinatário.');
    const loadThread = async () => {
      const peer = select.value;
      if(!peer || !API.token) return renderEmpty();
      try {
        const data = await API.request(`/api/messages/private?peer=${encodeURIComponent(peer)}`);
        renderPrivateThread(data.messages || []);
        (data.messages || []).filter(m => m.direction === 'received' && !m.readAt).forEach(m => API.request(`/api/messages/private/${m.id}/read`, { method:'PATCH' }).catch(()=>{}));
      } catch(err){ renderEmpty('Não consegui carregar esta conversa.'); }
    };
    select.addEventListener('change', loadThread);
    document.querySelector('#onlineUsers')?.addEventListener('click', (ev) => {
      const peer = ev.target.closest('[data-peer]')?.dataset.peer;
      if(peer){ select.value = peer; loadThread(); }
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const to = select.value;
      const input = document.querySelector('#privateText');
      const text = input.value.trim();
      if(!to || !text) return;
      try {
        await API.request('/api/messages/private', { method:'POST', body:JSON.stringify({ to, sealedText:seal(text) }) });
        input.value = '';
        loadThread();
      } catch(err){ alert('Não consegui enviar privado: ' + (err.data?.error || err.message)); }
    }, true);
    window.addEventListener('big:private-message', (ev) => {
      const msg = ev.detail || {};
      const peer = select.value;
      const other = msg.direction === 'sent' ? msg.toEmail : msg.fromEmail;
      if(peer && other === peer) loadThread();
      else if(msg.direction === 'received') showToast(`Nova mensagem privada de ${msg.fromUsername}`);
    });
  }
  function renderPrivateThread(messages){
    const host = document.querySelector('#privateThread');
    if(!host) return;
    host.innerHTML = messages.map(m => {
      const cls = m.direction === 'sent' ? 'sent' : 'received';
      const who = m.direction === 'sent' ? `Você → ${m.toUsername}` : m.fromUsername;
      return `<div class="private-msg ${cls}"><strong>${escapeHtml(who)}</strong><p>${escapeHtml(unseal(m.sealedText))}</p><small>${new Date(m.createdAt).toLocaleString('pt-BR')} • ${escapeHtml(m.status || 'sent')}</small></div>`;
    }).join('') || '<div class="private-empty">Sem mensagens nessa conversa.</div>';
    host.scrollTop = host.scrollHeight;
  }
  function showToast(text){
    let host = document.querySelector('#globalNoticeHost') || document.body;
    const el = document.createElement('div');
    el.className = 'notice';
    el.innerHTML = `<div><strong>Privado</strong><p>${escapeHtml(text)}</p></div><button class="mini-btn">Fechar</button>`;
    el.querySelector('button').onclick = () => el.remove();
    host.prepend(el);
    setTimeout(() => el.remove(), 8000);
  }

  function setupAdmin(API){
    let adminLogin = document.createElement('div');
    adminLogin.className = 'server-admin-login';
    adminLogin.innerHTML = `<div style="position:fixed;right:18px;bottom:18px;z-index:9999;background:rgba(5,7,20,.9);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:12px;box-shadow:0 20px 60px rgba(0,0,0,.35);max-width:280px"><strong>Servidor Big</strong><p style="margin:.3rem 0;color:#9ca3af;font-size:.8rem">Login admin para gravar no backend.</p><input id="serverAdminLogin" placeholder="clzin@big.x" style="width:100%;margin:4px 0;padding:9px;border-radius:10px;border:1px solid #333;background:#080b18;color:white"><input id="serverAdminPass" type="password" placeholder="clzin123" style="width:100%;margin:4px 0;padding:9px;border-radius:10px;border:1px solid #333;background:#080b18;color:white"><button id="serverAdminBtn" style="width:100%;padding:9px;border:0;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;font-weight:800">Conectar admin</button><small id="serverAdminStatus" style="display:block;margin-top:6px;color:#9ca3af"></small></div>`;
    if(!API.token) document.body.appendChild(adminLogin);
    document.querySelector('#serverAdminBtn')?.addEventListener('click', async () => {
      const login = document.querySelector('#serverAdminLogin').value || 'clzin@big.x';
      const password = document.querySelector('#serverAdminPass').value || 'clzin123';
      try {
        const data = await API.request('/api/auth/login', { method:'POST', body:JSON.stringify({ login, password }) });
        if(data.user.role !== 'admin') throw new Error('admin_required');
        API.token = data.token; document.querySelector('#serverAdminStatus').textContent = 'Conectado.'; adminLogin.remove(); syncAdminData(API);
      } catch(err){ document.querySelector('#serverAdminStatus').textContent = 'Falha no login admin.'; }
    });
    if(API.token) { syncAdminData(API); setupSheetsAdmin(API); }
    setInterval(() => { if(window.BigLatestMetrics) mirrorMetrics(window.BigLatestMetrics); if(API.token) syncAdminData(API, true); }, 5000);
    document.addEventListener('submit', (event) => {
      if(!API.token) return;
      if(event.target.id === 'configForm') setTimeout(async () => { const cfg = JSON.parse(localStorage.getItem('big.admin.config') || '{}'); await API.request('/api/admin/config', { method:'PUT', body:JSON.stringify(cfg) }).catch(console.warn); }, 80);
      if(event.target.id === 'noticeForm') setTimeout(async () => { const list = JSON.parse(localStorage.getItem('big.admin.notices') || '[]'); const n = list[list.length-1] || list[0]; if(n) await API.request('/api/admin/announcements', { method:'POST', body:JSON.stringify({ type:n.type, text:n.text, duration:n.duration }) }).catch(console.warn); }, 80);
      if(event.target.id === 'userForm') {
        const username = document.querySelector('#userInput')?.value; const password = document.querySelector('#userPassword')?.value || 'big123';
        setTimeout(async () => { await API.request('/api/admin/users', { method:'POST', body:JSON.stringify({ username, password }) }).catch(()=>{}); syncAdminData(API); }, 80);
      }
      if(event.target.id === 'itemForm') setTimeout(async () => { const items = JSON.parse(localStorage.getItem('big.admin.items') || '[]'); await API.request('/api/admin/store', { method:'PUT', body:JSON.stringify(items) }).catch(console.warn); }, 80);
    }, true);
    document.addEventListener('click', async (event) => {
      if(!API.token) return;
      const ban = event.target.closest('[data-server-ban]');
      const unban = event.target.closest('[data-server-unban]');
      const money = event.target.closest('[data-server-money]');
      if(ban){ await API.request(`/api/admin/users/${ban.dataset.serverBan}/ban`, { method:'POST', body:JSON.stringify({ duration:ban.dataset.duration || '15m' }) }).catch(console.warn); syncAdminData(API); }
      if(unban){ await API.request(`/api/admin/users/${unban.dataset.serverUnban}/unban`, { method:'POST' }).catch(console.warn); syncAdminData(API); }
      if(money){ const current = Number(money.dataset.current || 0); await API.request(`/api/admin/users/${money.dataset.serverMoney}`, { method:'PATCH', body:JSON.stringify({ money:current + 500 }) }).catch(console.warn); syncAdminData(API); }
    }, true);
    window.addEventListener('big:presence-update', () => API.token && syncAdminData(API));
  }
  function setupSheetsAdmin(API){
    const out = document.querySelector('#sheetsOutput');
    const status = document.querySelector('#sheetsStatus');
    const write = (data) => { if(out) out.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); };
    const call = async (path, label) => {
      try {
        if(status) status.textContent = `Executando: ${label || path}...`;
        const data = await API.request(path, { method:'POST' });
        write(data);
        if(status) status.textContent = data.url ? `OK: ${data.url}` : 'OK: operação concluída.';
      } catch(err){ write(err.data || err.message); if(status) status.textContent = 'Falhou. Confira .env, credencial JSON e APIs ativas.'; }
    };
    API.request('/api/admin/sheets/status').then(data => { if(status) status.textContent = `Sheets: ${data.enabled ? 'ativo' : 'desativado'} • ${data.spreadsheetId || 'sem ID'}`; write(data); }).catch(()=>{});
    document.querySelector('#sheetsTest')?.addEventListener('click', () => call('/api/admin/sheets/test','teste de conexão'));
    document.querySelector('#sheetsBootstrap')?.addEventListener('click', () => call('/api/admin/sheets/bootstrap','bootstrap'));
    document.querySelectorAll('[data-sheets-export]').forEach(btn => btn.addEventListener('click', () => call(`/api/admin/sheets/export/${btn.dataset.sheetsExport}`, `export ${btn.dataset.sheetsExport}`)));
    document.querySelectorAll('[data-sheets-preview]').forEach(btn => btn.addEventListener('click', () => call(`/api/admin/sheets/import/${btn.dataset.sheetsPreview}/preview`, `preview ${btn.dataset.sheetsPreview}`)));
    document.querySelectorAll('[data-sheets-apply]').forEach(btn => btn.addEventListener('click', () => { if(confirm(`Aplicar ${btn.dataset.sheetsApply} da planilha no servidor?`)) call(`/api/admin/sheets/import/${btn.dataset.sheetsApply}/apply`, `apply ${btn.dataset.sheetsApply}`); }));
  }

  async function syncAdminData(API, quiet=false){
    try {
      const [users, config, logs, notices, store] = await Promise.all([
        API.request('/api/admin/users'), API.request('/api/admin/config'), API.request('/api/admin/logs'), API.request('/api/announcements'), API.request('/api/store')
      ]);
      localStorage.setItem('big.admin.config', JSON.stringify(config));
      localStorage.setItem('big.admin.logs', JSON.stringify(logs.map(l => ({ type:l.type, text:l.text, time:new Date(l.time).toLocaleString('pt-BR') }))));
      localStorage.setItem('big.admin.notices', JSON.stringify(notices.map(n => ({ type:n.type, text:n.text, duration:n.duration, time:new Date(n.time).toLocaleString('pt-BR') }))));
      localStorage.setItem('big.admin.items', JSON.stringify(store));
      localStorage.setItem('big.admin.users', JSON.stringify(users.map(u => ({ ...u, money:u.money, createdAt:new Date(u.createdAt).toLocaleDateString('pt-BR'), lastLogin:u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : 'nunca' }))));
      renderServerUsers(users);
      if(!quiet) window.dispatchEvent(new StorageEvent('storage', { key:'big.admin.config' }));
    } catch(err){ if(!quiet) console.warn('[Big Admin API] sync falhou', err.message); }
  }
  function renderServerUsers(users){
    const host = document.querySelector('#usersTable');
    if(!host) return;
    host.innerHTML = users.map(u => {
      const banned = u.bannedUntil && new Date(u.bannedUntil) > new Date();
      const p = u.presence || {};
      return `<div class="row-card ${banned?'banned':''}"><div><strong>${escapeHtml(u.username)} <span class="status-tag">${escapeHtml(u.role)}</span></strong><small>${escapeHtml(u.email)} • ${u.online?'online':'offline'} • saldo ${Number(u.money||0).toLocaleString('pt-BR')} BIG</small><small>Criado: ${new Date(u.createdAt).toLocaleDateString('pt-BR')} • Último login: ${u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : 'nunca'}</small><small>Presença: ${escapeHtml(p.localDate || 'data ?')} ${escapeHtml(p.localTime || 'hora ?')} • ${escapeHtml(formatBattery(p))} • ${escapeHtml(p.timezone || 'timezone ?')}</small>${banned?`<small>Banido até ${new Date(u.bannedUntil).toLocaleString('pt-BR')} • ${escapeHtml(u.banReason)}</small>`:''}</div><div class="row-actions"><button class="tiny ok" data-server-money="${u.id}" data-current="${Number(u.money||0)}">+500 BIG</button><button class="tiny ban" data-server-ban="${u.id}" data-duration="10m">Ban 10m</button><button class="tiny ban" data-server-ban="${u.id}" data-duration="15m">Ban 15m</button><button class="tiny ban" data-server-ban="${u.id}" data-duration="1h">Ban 1h</button><button class="tiny" data-server-unban="${u.id}">Revogar</button></div></div>`;
    }).join('') || '<p>Nenhum usuário criado.</p>';
  }
  function mirrorMetrics(m){
    window.BigServerMetrics = m;
    const score = document.querySelector('#healthScore'); if(score) score.textContent = `${m.health}%`;
    const ring = document.querySelector('#healthRingText'); if(ring) ring.textContent = m.health > 75 ? 'OK' : 'ATENÇÃO';
  }
})();
