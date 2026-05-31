#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const root = process.cwd(); const data = path.join(root,'data'); const logs = path.join(root,'logs');
fs.mkdirSync(logs,{recursive:true});
const out = path.join(logs, `backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
const dump = {};
for(const f of fs.existsSync(data) ? fs.readdirSync(data).filter(f=>f.endsWith('.json')) : []) dump[f] = JSON.parse(fs.readFileSync(path.join(data,f),'utf8')||'null');
fs.writeFileSync(out, JSON.stringify(dump,null,2));
console.log(out);
