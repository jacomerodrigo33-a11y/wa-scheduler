import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, 'dist');
const DB_FILE = join(__dirname, 'db.json');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

// ── DB simples em arquivo ──────────────────────────────────────────────────
function loadDB() {
  try {
    if (existsSync(DB_FILE)) return JSON.parse(readFileSync(DB_FILE, 'utf8'));
  } catch {}
  return { config: {}, instances: [], dispatches: [], projects: [] };
}

function saveDB(db) {
  try { writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch {}
}

let db = loadDB();

// ── Scheduler ─────────────────────────────────────────────────────────────
async function executeSend(dispatch) {
  const { config } = db;
  if (!config.url || !config.token) return;

  for (const phone of dispatch.phones) {
    try {
      const num = phone.replace(/\D/g, '');
      if (dispatch.imageB64) {
        await fetch(`${config.url}/message/sendMedia/${dispatch.sender}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: config.token },
          body: JSON.stringify({
            number: num,
            mediatype: 'image',
            media: dispatch.imageB64.split(',')[1],
            mimetype: dispatch.imageType,
            caption: dispatch.message || ''
          })
        });
      } else if (dispatch.message) {
        await fetch(`${config.url}/message/sendText/${dispatch.sender}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: config.token },
          body: JSON.stringify({ number: num, text: dispatch.message })
        });
      }
    } catch (e) {
      console.error('Erro ao enviar para', phone, e.message);
    }
  }
}

function runScheduler() {
  setInterval(async () => {
    db = loadDB();
    const now = Date.now();
    const pending = db.dispatches.filter(d => d.status === 'pending' && d.sendAt <= now);
    
    for (const dispatch of pending) {
      console.log(`[scheduler] Enviando disparo ${dispatch.id}...`);
      
      // Marca como enviando
      db.dispatches = db.dispatches.map(d =>
        d.id === dispatch.id ? { ...d, status: 'sending' } : d
      );
      saveDB(db);

      try {
        await executeSend(dispatch);
        db = loadDB();
        db.dispatches = db.dispatches.map(d =>
          d.id === dispatch.id ? { ...d, status: 'sent', sentAt: new Date().toISOString() } : d
        );
        saveDB(db);
        console.log(`[scheduler] Disparo ${dispatch.id} enviado com sucesso`);
      } catch (e) {
        db = loadDB();
        db.dispatches = db.dispatches.map(d =>
          d.id === dispatch.id ? { ...d, status: 'failed' } : d
        );
        saveDB(db);
        console.error(`[scheduler] Disparo ${dispatch.id} falhou:`, e.message);
      }
    }
  }, 10000); // verifica a cada 10 segundos
}

// ── HTTP Server ────────────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API Routes ────────────────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    db = loadDB();

    // GET /api/state — retorna tudo
    if (req.method === 'GET' && path === '/api/state') {
      return json(res, { config: db.config, instances: db.instances, dispatches: db.dispatches, projects: db.projects });
    }

    // POST /api/state — salva tudo
    if (req.method === 'POST' && path === '/api/state') {
      const body = await parseBody(req);
      db = { ...db, ...body };
      saveDB(db);
      return json(res, { ok: true });
    }

    // POST /api/config
    if (req.method === 'POST' && path === '/api/config') {
      const body = await parseBody(req);
      db.config = body;
      saveDB(db);
      return json(res, { ok: true });
    }

    // GET /api/instances
    if (req.method === 'GET' && path === '/api/instances') {
      return json(res, db.instances);
    }

    // POST /api/instances
    if (req.method === 'POST' && path === '/api/instances') {
      const body = await parseBody(req);
      db.instances = body;
      saveDB(db);
      return json(res, { ok: true });
    }

    // GET /api/dispatches
    if (req.method === 'GET' && path === '/api/dispatches') {
      return json(res, db.dispatches);
    }

    // POST /api/dispatches
    if (req.method === 'POST' && path === '/api/dispatches') {
      const body = await parseBody(req);
      db.dispatches = body;
      saveDB(db);
      return json(res, { ok: true });
    }

    // GET /api/projects
    if (req.method === 'GET' && path === '/api/projects') {
      return json(res, db.projects);
    }

    // POST /api/projects
    if (req.method === 'POST' && path === '/api/projects') {
      const body = await parseBody(req);
      db.projects = body;
      saveDB(db);
      return json(res, { ok: true });
    }

    return json(res, { error: 'Not found' }, 404);
  }

  // ── Static Files ──────────────────────────────────────────────────────
  let filePath = join(DIST, path === '/' ? 'index.html' : path);
  if (!existsSync(filePath)) filePath = join(DIST, 'index.html');
  const ext = extname(filePath);
  const mime = MIME[ext] || 'text/plain';
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }

}).listen(PORT, '0.0.0.0', () => {
  console.log(`Running on port ${PORT}`);
  runScheduler();
  console.log('[scheduler] Iniciado — verificando disparos a cada 10s');
});
