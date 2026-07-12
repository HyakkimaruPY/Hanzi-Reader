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
    async count(store) { return table(store).size; },
    async putMany(store, rows = []) { for (const row of rows) table(store).set(row.key, row.value); return true; },
    async deleteOldest(store, count = 1) { const t = table(store); let removed = 0; for (const key of t.keys()) { if (removed >= count) break; t.delete(key); removed++; } return removed; }
  };
}

/* ---------------- ContentDatabase (IndexedDB) ---------------- */
const DB_NAME = 'hanzi-reader-store';
const DB_VERSION = 2;
const STORES = { kv: 'kv', sessions: 'sessions', dict: 'dictCache', content: 'content', practice: 'practice', metadata: 'metadata' };
const IDB_OPEN_TIMEOUT = 4000;
const SESSION_RETENTION = 800;

function openIdb() {
  return new Promise((resolve) => {
    let settled = false;
    let timer = 0;
    const done = value => {
      if (settled) {
        // Se o timeout já liberou o boot e o banco abriu depois, feche a conexão
        // tardia para não manter um handle órfão bloqueando upgrades futuros.
        try { value?.close?.(); } catch {}
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    try {
      if (!('indexedDB' in window)) return done(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.kv)) db.createObjectStore(STORES.kv);
        if (!db.objectStoreNames.contains(STORES.sessions)) {
          const sessionStore = db.createObjectStore(STORES.sessions, { keyPath: 'id', autoIncrement: true });
          sessionStore.createIndex('byType', 'type');
          sessionStore.createIndex('byAt', 'at');
        }
        if (!db.objectStoreNames.contains(STORES.dict)) db.createObjectStore(STORES.dict);
        if (!db.objectStoreNames.contains(STORES.content)) db.createObjectStore(STORES.content);
        if (!db.objectStoreNames.contains(STORES.practice)) db.createObjectStore(STORES.practice);
        if (!db.objectStoreNames.contains(STORES.metadata)) db.createObjectStore(STORES.metadata);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { try { db.close(); } catch {} };
        done(db);
      };
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
      timer = setTimeout(() => done(null), IDB_OPEN_TIMEOUT); // nunca trave o boot esperando IDB
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
    count: (store) => tx(store, 'readonly', os => os.count()).catch(() => 0),
    putMany: (store, rows = []) => new Promise(resolve => {
      if (!Array.isArray(rows) || !rows.length) return resolve(true);
      try {
        const transaction = idb.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        for (const row of rows) objectStore.put(row.value, row.key);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = transaction.onabort = () => resolve(false);
      } catch { resolve(false); }
    }),
    deleteOldest: (store, count = 1) => new Promise(resolve => {
      if (count <= 0) return resolve(0);
      let removed = 0;
      try {
        const transaction = idb.transaction(store, 'readwrite');
        const cursor = transaction.objectStore(store).openCursor();
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row || removed >= count) return;
          row.delete(); removed++; row.continue();
        };
        transaction.oncomplete = () => resolve(removed);
        transaction.onerror = transaction.onabort = () => resolve(removed);
      } catch { resolve(removed); }
    })
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
const DICTIONARY_RECENT_KEY = 'hzDictionaryRecent.v1';
const DICTIONARY_RECENT_LIMIT = 30;
let dictionaryRecentMigrated = false;

function normalizeRecentSearches(value) {
  const list = Array.isArray(value) ? value : [];
  const recent = [];
  for (const raw of list) {
    const term = String(typeof raw === 'string' ? raw : raw?.term || raw?.query || '').trim();
    if (!term) continue;
    const previous = recent.indexOf(term);
    if (previous >= 0) recent.splice(previous, 1);
    recent.push(term);
  }
  return recent.slice(-DICTIONARY_RECENT_LIMIT);
}

function migrateDictionaryRecent() {
  let parsed = [];
  try { parsed = JSON.parse(localStorage.getItem(DICTIONARY_RECENT_KEY) || '[]'); } catch {}
  const recent = normalizeRecentSearches(parsed);
  try { localStorage.setItem(DICTIONARY_RECENT_KEY, JSON.stringify(recent)); } catch {}
  // Remove somente históricos legados de navegação. Flash Cards, itens salvos e
  // estatísticas agregadas usam outras chaves e nunca entram nesta migração.
  try {
    for (const key of Object.keys(localStorage)) {
      if (/^(hzDictionaryClicks|hzDefinitionHistory|hzDictionaryFullHistory)\./.test(key)) localStorage.removeItem(key);
    }
  } catch {}
  dictionaryRecentMigrated = true;
  return recent;
}

function rememberDictionarySearch(term) {
  term = String(term || '').trim();
  if (!term) return migrateDictionaryRecent();
  let recent = [];
  if (!dictionaryRecentMigrated) recent = migrateDictionaryRecent();
  else { try { recent = normalizeRecentSearches(JSON.parse(localStorage.getItem(DICTIONARY_RECENT_KEY) || '[]')); } catch {} }
  if (recent[recent.length - 1] === term) return recent;
  recent = recent.filter(item => item !== term);
  recent.push(term);
  recent = recent.slice(-DICTIONARY_RECENT_LIMIT);
  try { localStorage.setItem(DICTIONARY_RECENT_KEY, JSON.stringify(recent)); } catch {}
  return recent;
}

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
  migrateDictionaryRecent();
  const idb = await openIdb();
  const db = idb ? idbWrap(idb) : makeMemoryDb();
  const report = { migrated: [], fallback: db.memory };
  try { await runMigration(db, report); } catch {}
  return { db, report };
})();

async function saveSession(type, payload) {
  const { db } = await ready;
  const record = { type: String(type || 'generic'), at: Date.now(), ...payload };
  try {
    const id = await db.add(STORES.sessions, record);
    const count = await db.count(STORES.sessions);
    if (count > SESSION_RETENTION) void db.deleteOldest(STORES.sessions, count - SESSION_RETENTION);
    return id;
  } catch { return null; }
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
async function storeGet(store, key, legacyKey = '') {
  const { db } = await ready;
  const value = await db.get(store, key);
  if (value != null || !legacyKey) return value;
  return kvGet(legacyKey);
}
async function storePut(store, key, value) { const { db } = await ready; return db.put(store, key, value); }
async function storeDelete(store, key, legacyKey = '') {
  const { db } = await ready;
  const deleted = await db.delete(store, key);
  if (legacyKey) await db.delete(STORES.kv, legacyKey);
  return deleted;
}
async function storePutMany(store, rows = []) { const { db } = await ready; return db.putMany(store, rows); }

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

const ContentRepository = Object.freeze({
  get: key => storeGet(STORES.content, key, `content:${key}`),
  put: (key, value) => storePut(STORES.content, key, value),
  delete: key => storeDelete(STORES.content, key, `content:${key}`),
  putMany: rows => storePutMany(STORES.content, rows)
});
const DictionaryCache = Object.freeze({ get: dictGet, put: dictPut });
const PracticeRepository = Object.freeze({
  saveSession,
  listSessions,
  getProgress: key => storeGet(STORES.practice, key, `practice:${key}`),
  saveProgress: (key, value) => storePut(STORES.practice, key, value),
  deleteProgress: key => storeDelete(STORES.practice, key, `practice:${key}`)
});
const StorageMigration = Object.freeze({ run: async () => (await ready).report, rememberDictionarySearch });
const StorageFallback = Object.freeze({ createMemoryDatabase: makeMemoryDb });

window.hzStore = {
  prefs: PreferencesStore,
  ready,
  saveSession, listSessions,
  dictGet, dictPut,
  kvGet, kvPut,
  legacyRead,
  rememberDictionarySearch,
  repositories: { ContentRepository, DictionaryCache, PracticeRepository },
  migration: StorageMigration,
  fallback: StorageFallback,
  async status() { const { db, report } = await ready; return { mode: db.memory ? 'memory-fallback' : 'indexeddb', migrated: report.migrated.length }; }
};

export { PreferencesStore, ContentRepository, DictionaryCache, PracticeRepository, StorageMigration, StorageFallback, saveSession, listSessions, dictGet, dictPut, kvGet, kvPut, legacyRead, rememberDictionarySearch };
