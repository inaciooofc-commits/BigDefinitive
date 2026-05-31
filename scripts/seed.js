#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const data = path.join(process.cwd(),'data'); fs.mkdirSync(data,{recursive:true});
for (const [file, fallback] of Object.entries({
  'users.json': [], 'logs.json': [], 'chat.json': {global:[],party:[]}, 'private-messages.json': [], 'parties.json': [], 'announcements.json': [], 'sheets-sync.json': {enabled:false,spreadsheetId:'',errors:[]}
})) { const p=path.join(data,file); if(!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(fallback,null,2)); }
console.log('Seed Big concluído. O admin inicial é criado pelo server.js no primeiro start.');
