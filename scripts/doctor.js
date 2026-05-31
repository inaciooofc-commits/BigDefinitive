#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const required = ['server.js','package.json','member-app/index.html','admin-app/index.html','shared/big-server-client.js','scripts/sheets-bootstrap.js','.env.example'];
let ok = true;
function pass(msg){ console.log('OK: ' + msg); }
function fail(msg){ console.error('ERRO: ' + msg); ok = false; }
for (const rel of required) fs.existsSync(path.join(root, rel)) ? pass(rel) : fail('faltando ' + rel);
for (const dir of ['data','logs','credentials']) { try { fs.mkdirSync(path.join(root,dir),{recursive:true}); fs.accessSync(path.join(root,dir), fs.constants.W_OK); pass(`${dir}/ gravável`); } catch(e){ fail(`${dir}/ sem escrita: ${e.message}`); } }
try { console.log('Node: ' + process.version); } catch {}
try { execSync('node --check server.js', {cwd:root, stdio:'pipe'}); pass('server.js sintaticamente válido'); } catch(e){ fail('server.js inválido'); }
try { execSync('node --check scripts/sheets-bootstrap.js', {cwd:root, stdio:'pipe'}); pass('sheets-bootstrap.js sintaticamente válido'); } catch(e){ fail('sheets-bootstrap.js inválido'); }
try { const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')); for (const dep of ['express','ws','bcryptjs','jsonwebtoken','googleapis','dotenv']) pkg.dependencies?.[dep] ? pass(`dependência ${dep}`) : fail(`dependência ausente: ${dep}`); } catch(e){ fail('package.json inválido'); }
try { const eco = fs.readFileSync(path.join(root,'ecosystem.config.cjs'),'utf8'); if(/exec_mode:\s*['"]fork['"]/.test(eco) && /instances:\s*1/.test(eco)) pass('PM2 em fork/simples, sem cluster'); else fail('ecosystem não está travado em fork/instances 1'); } catch(e){ fail('ecosystem.config.cjs não lido'); }
console.log(ok ? 'Big Doctor: aprovado.' : 'Big Doctor: falhou.');
process.exit(ok ? 0 : 1);
