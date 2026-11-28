// PDF всей книги из тех же страниц и записей: node proby/zaplyv/kniga/pdf.mjs out.pdf
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('./', import.meta.url), types = { html: 'text/html', md: 'text/plain', json: 'application/json', jpg: 'image/jpeg', png: 'image/png' };
const srv = createServer(async (q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try { const b = await readFile(new URL(p, root)); s.writeHead(200, { 'content-type': (types[p.split('.').pop()] || 'application/octet-stream') + '; charset=utf-8' }); s.end(b); }
  catch { s.writeHead(404); s.end(); }
}).listen(0);
const b = await chromium.launch(), page = await b.newPage();
await page.goto('http://localhost:' + srv.address().port + '/index.html?vse');
await page.waitForSelector('body[data-ready]');
await page.waitForSelector('[data-panel] .card', { timeout: 8000 }).catch(() => {}); // вкладки рабочей панели наполняет panel.js после data-ready
await page.evaluate(() => Promise.all([...document.images].map(i => i.complete || new Promise(r => { i.loading = 'eager'; i.onload = i.onerror = r; }))));
await page.pdf({ path: process.argv[2] || 'kniga.pdf', format: 'A5', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
await b.close(); srv.close();
