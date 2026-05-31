#!/usr/bin/env node
'use strict';
// Standalone bootstrap for Google Sheets. It mirrors the server endpoint and is safe to run on antiX.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'data', 'config.json');
const SHEETS_TITLE = 'Big System Control';
const keyFile = path.isAbsolute(process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '') ? process.env.GOOGLE_SERVICE_ACCOUNT_FILE : path.join(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/google-service-account.json');
const ownerEmail = process.env.GOOGLE_OWNER_EMAIL || '';
const existingId = process.env.GOOGLE_SHEETS_ID || '';
const defs = [
  ['Visão Geral',['Campo','Valor','Observação'],[['Projeto','Big','App social de música, party, jogos e comunidade'],['Criador','Colômbia',''],['Empresa','Cl Inc. Enterteiments',''],['Porta padrão',process.env.PORT || '8088',''],['Email local','nome@big.x',''],['Cluster','Desativado','fork/simples']]],
  ['Caminhos',['Tipo','Caminho','Descrição','Editável pelo admin','Crítico','Observações'],[['Backend','server.js','Servidor Node.js','Não','Sim',''],['App','member-app/index.html','App dos usuários','Parcial','Sim',''],['Admin','admin-app/index.html','Painel admin','Parcial','Sim',''],['Dados','data/users.json','Usuários locais','Via painel','Sim','Não exportar senhas']]],
  ['Rotas Web',['Rota','App','Permissão','Descrição','Status'],[['/member-app/','App Principal','user/admin','App dos membros','ativo'],['/admin-app/','Painel Admin','admin','Controle','ativo'],['/health','Sistema','público','Health check','ativo'],['/ws','WebSocket','autenticado','Tempo real','ativo']]],
  ['Endpoints API',['Método','Endpoint','Permissão','Função','Status'],[['POST','/api/auth/login','público','Login','ativo'],['PATCH','/api/me/password','user/admin','Troca de senha','ativo'],['POST','/api/admin/sheets/bootstrap','admin','Inicializar Sheets','ativo']]],
  ['Usuários Exportados',['ID','Usuário','Email local','Cargo','Status','Coins','Criado em','Último login'],[]],
  ['Presença',['Usuário','Email local','Online','Hora local','Data local','Timezone','Bateria','Carregando','Última atividade'],[]],
  ['Módulos',['Módulo','Ativo','Controlado pelo admin','Arquivo principal','Status','Observações'],[['Música','sim','sim','server.js/member-app','ativo',''],['Chat global','sim','sim','server.js/member-app','ativo',''],['Mensagens privadas','sim','não','server.js','ativo','Não exportar conteúdo'],['Google Sheets','sim','sim','server.js','ativo','']]],
  ['Configurações Públicas',['Chave','Valor','Editável pelo admin','Afeta tempo real','Observações'],[['appName','Big','sim','sim',''],['creator','Colômbia','sim','sim',''],['company','Cl Inc. Enterteiments','sim','sim','']]],
  ['Jogos',['ID','Nome','Categoria','URL','Domínio permitido','Ativo','Capa','Observações'],[]],
  ['Músicas',['ID','Nome','Artista','URL','Fonte','Ativo','Capa','Observações'],[]],
  ['Loja',['ID','Nome','Tipo','Preço','Raridade','Ativo','Imagem','Observações'],[]],
  ['Logs Resumidos',['Data','Tipo','Usuário','Ação','Resultado','Observação'],[]],
  ['Roadmap',['Função','Prioridade','Status','Responsável','Observações'],[['Sheets automático','alta','feito','Big','Criar abas/cabeçalhos automaticamente']]],
  ['Segurança',['Recurso','Proteção','Status','Observações'],[['Senhas','bcrypt','ativo','Nunca exportar senha/hash'],['Mensagens privadas','metadados no admin','ativo','Não exportar conteúdo']]]
];
function readJson(file,fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJson(file,data){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file, JSON.stringify(data,null,2)); }

function updateEnvFile(filePath, updates){
  let lines = [];
  if(fs.existsSync(filePath)) lines = fs.readFileSync(filePath,'utf8').split(/\r?\n/);
  const seen = new Set();
  lines = lines.map(line => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if(!m) return line;
    const key = m[1];
    if(Object.prototype.hasOwnProperty.call(updates,key)){
      seen.add(key);
      return `${key}=${updates[key] ?? ''}`;
    }
    return line;
  });
  for(const [key,value] of Object.entries(updates)){
    if(!seen.has(key)) lines.push(`${key}=${value ?? ''}`);
  }
  fs.writeFileSync(filePath, lines.filter((line, idx, arr) => !(idx === arr.length-1 && line === '')).join('\n') + '\n');
}

function col(n){ let s=''; while(n>0){ let m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
function sq(t,r){ return `'${String(t).replace(/'/g,"''")}'!${r}`; }
(async () => {
  if(!fs.existsSync(keyFile)) throw new Error(`Credencial não encontrada: ${keyFile}`);
  const auth = new google.auth.GoogleAuth({ keyFile, scopes:['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive.file'] });
  const sheets = google.sheets({version:'v4', auth});
  const drive = google.drive({version:'v3', auth});
  let spreadsheetId = existingId || readJson(CONFIG_PATH,{}).googleSheets?.spreadsheetId || '';
  if(!spreadsheetId){
    const created = await sheets.spreadsheets.create({requestBody:{properties:{title:SHEETS_TITLE}, sheets:[{properties:{title:defs[0][0], gridProperties:{rowCount:500,columnCount:12,frozenRowCount:1}}}]}});
    spreadsheetId = created.data.spreadsheetId;
    if(ownerEmail) await drive.permissions.create({fileId:spreadsheetId,sendNotificationEmail:false,requestBody:{type:'user',role:'writer',emailAddress:ownerEmail}});
  }
  const current = await sheets.spreadsheets.get({spreadsheetId});
  const existing = new Set((current.data.sheets||[]).map(s=>s.properties.title));
  const add = defs.filter(([t])=>!existing.has(t)).map(([t,h])=>({addSheet:{properties:{title:t,gridProperties:{rowCount:500,columnCount:Math.max(h.length+2,10),frozenRowCount:1}}}}));
  if(add.length) await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:add}});
  await sheets.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:'USER_ENTERED',data:defs.map(([t,h,rows])=>({range:sq(t,`A1:${col(h.length)}${Math.max((rows||[]).length+1,1)}`),values:[h,...(rows||[])]}))}});
  const cfg = readJson(CONFIG_PATH,{}); cfg.googleSheets = {...(cfg.googleSheets||{}), enabled:true, spreadsheetId, ownerEmail, serviceAccountFile:process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/google-service-account.json', lastBootstrap:new Date().toISOString(), tabs:defs.map(d=>d[0])}; writeJson(CONFIG_PATH,cfg);
  writeJson(path.join(ROOT,'data','sheets-sync.json'),{enabled:true,spreadsheetId,ownerEmail,serviceAccountFile:process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/google-service-account.json',lastBootstrap:new Date().toISOString(),tabs:defs.map(d=>d[0]),errors:[]});
  updateEnvFile(path.join(ROOT,'.env'), {
    GOOGLE_SHEETS_ENABLED: 'true',
    GOOGLE_SHEETS_ID: spreadsheetId,
    GOOGLE_OWNER_EMAIL: ownerEmail,
    GOOGLE_SERVICE_ACCOUNT_FILE: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/google-service-account.json'
  });
  console.log(`OK: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log(`GOOGLE_SHEETS_ID salvo em .env e data/config.json: ${spreadsheetId}`);
})().catch(err => { console.error(err.message); process.exit(1); });
