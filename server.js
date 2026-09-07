/**
 * Servidor local do Painel
 * - Serve o index.html
 * - Grava copia persistente em ./data/banco.json
 * A nuvem (Supabase) continua sendo gravada pelo proprio index.html
 */
const path = require('path');
const fs = require('fs');
const express = require('express');

const PORT = Number(process.env.PORT || 8080);
const ROOT = process.env.PAINEL_DIR
  ? path.resolve(process.env.PAINEL_DIR)
  : path.resolve(__dirname);

const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'banco.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function garantirPastas() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function lerBancoLocal() {
  garantirPastas();
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Falha ao ler banco local:', e.message);
    return null;
  }
}

function gravarBancoLocal(payload) {
  garantirPastas();
  const agora = new Date();
  const pacote = {
    salvo_em: agora.toISOString(),
    origem: payload && payload.origem ? payload.origem : 'painel',
    dados: payload && payload.dados ? payload.dados : payload,
  };

  if (fs.existsSync(DATA_FILE)) {
    const stamp = agora.toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_DIR, 'banco_' + stamp + '.json');
    try { fs.copyFileSync(DATA_FILE, dest); } catch (_) { /* ignora */ }
    limparBackupsAntigos();
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(pacote, null, 2), 'utf8');
  return pacote;
}

function limparBackupsAntigos() {
  const max = 30;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('banco_') && f.endsWith('.json'))
    .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  files.slice(max).forEach((x) => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, x.f)); } catch (_) { /* ignora */ }
  });
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '80mb' }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => {
  garantirPastas();
  res.json({
    ok: true,
    pasta: ROOT,
    arquivo: DATA_FILE,
    temCopiaLocal: fs.existsSync(DATA_FILE),
  });
});

app.get('/api/local-db', (_req, res) => {
  const dados = lerBancoLocal();
  if (!dados) return res.status(404).json({ ok: false, erro: 'Sem copia local ainda' });
  res.json({ ok: true, ...dados });
});

app.post('/api/local-db', (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ ok: false, erro: 'Body vazio' });
    const salvo = gravarBancoLocal(req.body);
    console.log('Copia local salva em', DATA_FILE, 'em', salvo.salvo_em);
    res.json({
      ok: true,
      salvo_em: salvo.salvo_em,
      arquivo: 'data/banco.json',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, erro: String(e.message || e) });
  }
});

app.get('/sync-local.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'sync-local.js'));
});

app.use(express.static(ROOT, {
  extensions: ['html'],
  index: 'index.html',
}));

app.get('/', (_req, res) => {
  const indexPath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('index.html nao encontrado em: ' + ROOT);
  }
  res.sendFile(indexPath);
});

garantirPastas();

app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Acompanhamento de Obras');
  console.log('  Pasta : ' + ROOT);
  console.log('  URL   : http://127.0.0.1:' + PORT + '/index.html');
  console.log('  Copia : ' + DATA_FILE);
  console.log('  Encerrar: Ctrl+C');
  console.log('');
});
