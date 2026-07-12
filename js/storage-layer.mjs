/*
 * Hanzi Reader — camada unificada de persistência (v5.1).
 *
 * PreferencesStore  → localStorage (dados pequenos, acesso imediato, cache em memória)
 * ContentDatabase   → IndexedDB   (dados maiores: sessões, cache de dicionário, blobs)
 * StorageMigration  → migração segura, em lotes, sem apagar dados antigos
 * StorageFallback   → memória quando IndexedDB não estiver disponível
 *
 * Nenhum módulo deve gravar grandes conteúdos no localStorage; use
 * window.hzStore.db / window.hzStore.saveSession / window.hzStore.dictPut.
 */
'use strict';

/* ---------------- PreferencesStore (localStorage + cache) ---------------- */
const prefCache = new Map();
const PreferencesStore = {
  get(key, fallback = null) {
    if (prefCache.has(key)) return prefCache.get(key);
    let value = fallback;
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) value = raw;
    } catch {}
    prefCache.set(key, value);
    return value;
  },
  getJSON(key, fallback = null) {
    const raw = this.get(key, null);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  set(key, value) {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    prefCache.set(key, raw);
    try { localStorage.setItem(key, raw); } catch {}
    return raw;
  },
  remove(key) {
    prefCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
  },
  /* invalida o cache quando outra aba altera a preferência */
  _sync(key, newValue) { if (newValue === null) prefCache.delete(key); else prefCache.set(key, newValue); }
};
try {
  window.addEventListener('storage', e => { if (e.key) PreferencesStore._sync(e.key, e.newValue); });
} catch {}

/* ---------------- StorageFallback (memória) ---------------- */
function makeMemoryDb() {
  const stores = new Map();
  const table = name => { if (!stores.has(name)) stores.set(name, new Map()); return stores.get(name); };
  return {
    memory: true,
    async get(store, key) { return table(store).get(key) ?? null; },
    async put(store, key, value) { table(store).set(key, value); return true; },
    async delete(store, key) { table(store).delete(key); return true; },
    async add(store, value) { const t = table(store); const id = (t.size + 1) + ':' + Date.now(); t.set(id, { ...value, id }); return id; },
    async all(store, limit = 500) { return [...table(store).values()].slice(-limit); },
    async count(store) { return table(store).size; }
  };
}

/* ---------------- ContentDatabase (IndexedDB) ---------------- */
const DB_NAME = 'hanzi-reader-store';
const DB_VERSION = 1;
const STORES = { kv: 'kv', sessions: 'sessions', dict: 'dictCache' };

function openIdb() {
  return new Promise((resolve) => {
    let settled = false;
    const done = v => { if (!settled) { settled = true; resolve(v); } };
    try {
      if (!('indexedDB' in window)) return done(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.kv)) db.createObjectStore(STORES.kv);
        if (!db.objectStoreNames.contains(STORES.sessions)) {
          const s = db.createObjectStore(STORES.sessions, { keyPath: 'id', autoIncrement: true });
          s.createIndex('byType', 'type');
          s.createIndex('byAt', 'at');
        }
        if (!db.objectStoreNames.contains(STORES.dict)) db.createObjectStore(STORES.dict);
      };
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
      setTimeout(() => done(null), 4000); // nunca trave o boot esperando IDB
    } catch { done(null); }
  });
}

function idbWrap(idb) {
  const tx = (store, mode, run) => new Promise((resolve, reject) => {
    try {
      const t = idb.transaction(store, mode);
      const os = t.objectStore(store);
      const req = run(os);
      t.oncomplete = () => resolve(req && 'result' in req ? req.result : true);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    } catch (e) { reject(e); }
  });
  return {
    memory: false,
    get: (store, key) => tx(store, 'readonly', os => os.get(key)).catch(() => null),
    put: (store, key, value) => tx(store, 'readwrite', os => os.put(value, key)).catch(() => false),
    delete: (store, key) => tx(store, 'readwrite', os => os.delete(key)).catch(() => false),
    add: (store, value) => tx(store, 'readwrite', os => os.add(value)).catch(() => null),
    all: (store, limit = 500) => new Promise(resolve => {
      try {
        const out = [];
        const t = idb.transaction(store, 'readonly');
        const cur = t.objectStore(store).openCursor(null, 'prev');
        cur.onsuccess = () => {
          const c = cur.result;
          if (c && out.length < limit) { out.push(c.value); c.continue(); }
          else resolve(out.reverse());
        };
        cur.onerror = () => resolve(out);
      } catch { resolve([]); }
    }),
    count: (store) => tx(store, 'readonly', os => os.count()).catch(() => 0)
  };
}

/* ---------------- StorageMigration ---------------- */
/*
 * Move do localStorage para o IndexedDB apenas o que é grande/estrutural.
 * Regras de segurança: o valor antigo só é removido depois que a escrita no
 * IndexedDB é confirmada; um ponteiro leve fica no localStorage para
 * compatibilidade ("@idb:<chave>").
 */
const MIGRATE_PATTERNS = [/^hzSessionLog\./, /^hzDictPersist\./, /^hzWritingSessions\./];
const MIGRATE_SIZE_THRESHOLD = 24 * 1024; // 24 KB

async function runMigration(db, report) {
  if (!db || db.memory) return report;
  let keys = [];
  try { keys = Object.keys(localStorage); } catch { return report; }
  const idle = () => new Promise(r => ('requestIdleCallback' in window) ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 32));
  for (const key of keys) {
    let raw = null;
    try { raw = localStorage.getItem(key); } catch {}
    if (raw == null || raw.startsWith('@idb:')) continue;
    const matches = MIGRATE_PATTERNS.some(re => re.test(key));
    const tooBig = raw.length > MIGRATE_SIZE_THRESHOLD;
    if (!matches && !tooBig) continue;
    // nunca migre preferências conhecidas do app, mesmo se crescerem
    if (/^(hzLang|hfs|hspy|hpl|hplv|theme|hzBg|hzVoice|hzReaderEngine|hzReaderDock|hzPracticeCategory|hzStreak|v43Favorites|hzMusic)/.test(key)) continue;
    const ok = await db.put(STORES.kv, 'ls:' + key, raw);
    if (ok) {
      try { localStorage.setItem(key, '@idb:' + key); report.migrated.push(key); } catch {}
    }
    await idle(); // lotes pequenos, sem travar a thread principal
  }
  return report;
}

/* ---------------- API pública ---------------- */
const ready = (async () => {
  const idb = await openIdb();
  const db = idb ? idbWrap(idb) : makeMemoryDb();
  const report = { migrated: [], fallback: db.memory };
  try { await runMigration(db, report); } catch {}
  return { db, report };
})();

async function saveSession(type, payload) {
  const { db } = await ready;
  const record = { type: String(type || 'generic'), at: Date.now(), ...payload };
  try { return await db.add(STORES.sessions, record); } catch { return null; }
}
async function listSessions(type, limit = 60) {
  const { db } = await ready;
  const all = await db.all(STORES.sessions, 800);
  return all.filter(s => !type || s.type === type).slice(-limit);
}

const DICT_TTL = 1000 * 60 * 60 * 24 * 14; // 14 dias, somente resultados positivos
async function dictGet(term) {
  const { db } = await ready;
  const row = await db.get(STORES.dict, term);
  if (!row) return null;
  if (Date.now() - (row.at || 0) > DICT_TTL) { db.delete(STORES.dict, term); return null; }
  return row.value || null;
}
async function dictPut(term, value) {
  if (!value) return false; // nunca persista "não encontrado"
  const { db } = await ready;
  return db.put(STORES.dict, term, { at: Date.now(), value });
}

async function kvGet(key) {
  const { db } = await ready;
  const direct = await db.get(STORES.kv, key);
  if (direct != null) return direct;
  // compatibilidade com ponteiros de migração
  const migrated = await db.get(STORES.kv, 'ls:' + key);
  return migrated;
}
async function kvPut(key, value) { const { db } = await ready; return db.put(STORES.kv, key, value); }

/*
 * Leitura compatível: se um módulo antigo pedir uma chave migrada do
 * localStorage, devolve o conteúdo real vindo do IndexedDB.
 */
async function legacyRead(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch {}
  if (raw == null) return null;
  if (!raw.startsWith('@idb:')) return raw;
  const { db } = await ready;
  return db.get(STORES.kv, 'ls:' + key);
}

window.hzStore = {
  prefs: PreferencesStore,
  ready,
  saveSession, listSessions,
  dictGet, dictPut,
  kvGet, kvPut,
  legacyRead,
  async status() { const { db, report } = await ready; return { mode: db.memory ? 'memory-fallback' : 'indexeddb', migrated: report.migrated.length }; }
};

export { PreferencesStore, saveSession, listSessions, dictGet, dictPut, kvGet, kvPut, legacyRead };
