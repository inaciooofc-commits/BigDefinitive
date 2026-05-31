#!/usr/bin/env node
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const keyFile = path.isAbsolute(process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '') ? process.env.GOOGLE_SERVICE_ACCOUNT_FILE : path.join(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/google-service-account.json');
console.log('GOOGLE_SHEETS_ENABLED=' + (process.env.GOOGLE_SHEETS_ENABLED || 'false'));
console.log('GOOGLE_SHEETS_ID=' + (process.env.GOOGLE_SHEETS_ID || '(vazio - cria automático)'));
console.log('GOOGLE_OWNER_EMAIL=' + (process.env.GOOGLE_OWNER_EMAIL || '(não definido)'));
console.log('Credencial=' + keyFile + ' -> ' + (fs.existsSync(keyFile) ? 'OK' : 'NÃO ENCONTRADA'));
process.exit(fs.existsSync(keyFile) ? 0 : 1);
