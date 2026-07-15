(function () {
  'use strict';

  const DB_NAME = 'cards-pwa';
  const DB_VERSION = 1;
  const STORES = ['cards', 'topics', 'review_events', 'sessions', 'tombstones', 'sync_state', 'settings'];
  let openPromise;

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function open() {
    if (openPromise) return openPromise;
    openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cards')) {
          const cards = db.createObjectStore('cards', { keyPath: 'id' });
          cards.createIndex('subject', 'subject', { unique: false });
          cards.createIndex('topic_id', 'topic_id', { unique: false });
          cards.createIndex('mastery', 'schedule.mastery', { unique: false });
        }
        if (!db.objectStoreNames.contains('topics')) {
          const topics = db.createObjectStore('topics', { keyPath: 'id' });
          topics.createIndex('subject', 'subject', { unique: false });
        }
        if (!db.objectStoreNames.contains('review_events')) db.createObjectStore('review_events', { keyPath: 'event_id' });
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tombstones')) db.createObjectStore('tombstones', { keyPath: 'card_id' });
        if (!db.objectStoreNames.contains('sync_state')) db.createObjectStore('sync_state', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('数据库升级被其他页面阻塞，请关闭旧页面后重试。'));
    });
    return openPromise;
  }

  async function getAll(storeName) {
    const db = await open();
    return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
  }

  async function get(storeName, id) {
    const db = await open();
    return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).get(id));
  }

  async function put(storeName, value) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    await transactionDone(tx);
    return value;
  }

  async function putMany(storeName, values) {
    if (!values || !values.length) return;
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    values.forEach(value => store.put(value));
    await transactionDone(tx);
  }

  async function remove(storeName, id) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    await transactionDone(tx);
  }

  async function update(storeName, id, updater) {
    const db = await open();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const current = await requestResult(store.get(id));
    const next = updater(current);
    if (next === undefined) store.delete(id); else store.put(next);
    await transactionDone(tx);
    return next;
  }

  async function setSetting(id, value) {
    return put('settings', { id, value, updated_at: new Date().toISOString() });
  }

  async function getSetting(id, fallback) {
    const record = await get('settings', id);
    return record ? record.value : fallback;
  }

  async function seedIfEmpty(seed) {
    const cards = await getAll('cards');
    if (cards.length) return false;
    await putMany('topics', seed.topics || []);
    await putMany('cards', seed.cards || []);
    await put('sync_state', {
      id: 'local_meta',
      schema_version: DB_VERSION,
      seeded_at: new Date().toISOString(),
      pending_events: 0
    });
    if (seed.exam_wording_version) await setSetting('seed_exam_wording_version', seed.exam_wording_version);
    if (seed.content_version) await setSetting('seed_content_version', seed.content_version);
    return true;
  }

  async function upgradeSeedContent(seed) {
    const version = String(seed && seed.content_version || seed && seed.exam_wording_version || '');
    if (!version || await getSetting('seed_content_version', '') === version) return 0;
    const currentContentVersion = await getSetting('seed_content_version', '');
    const currentExamVersion = await getSetting('seed_exam_wording_version', '');
    const trustedReplace = (seed.replace_content_versions || []).includes(currentContentVersion)
      || (seed.replace_exam_wording_versions || []).includes(currentExamVersion);
    const [cards, events] = await Promise.all([getAll('cards'), getAll('review_events')]);
    const localById = new Map(cards.map(card => [card.id, card]));
    const userEdited = new Set(events
      .filter(event => ['edited', 'restored'].includes(event.action))
      .map(event => event.card_id));
    const userMoved = new Set(events.filter(event => event.action === 'moved').map(event => event.card_id));
    const updates = [];
    for (const released of seed.cards || []) {
      const local = localById.get(released.id);
      const releasedAnswer = String(released.exam_wording || '').trim();
      const localAnswer = String(local && local.exam_wording || '').trim();
      if (!local || userEdited.has(local.id)) continue;
      if (!trustedReplace && (releasedAnswer.length < 80 || localAnswer.length >= 120)) continue;
      const updated = { ...released, schedule: local.schedule, revision: local.revision };
      if (userMoved.has(local.id)) {
        updated.subject = local.subject; updated.module = local.module;
        updated.topic_id = local.topic_id; updated.order = local.order;
      }
      updates.push(updated);
    }
    await putMany('cards', updates);
    await setSetting('seed_content_version', version);
    await setSetting('seed_exam_wording_version', seed.exam_wording_version || version);
    return updates.length;
  }

  async function exportSnapshot() {
    const snapshot = {
      format: 'cards-snapshot',
      version: 1,
      exported_at: new Date().toISOString(),
      stores: {}
    };
    for (const store of STORES) {
      const values = await getAll(store);
      snapshot.stores[store] = store === 'sync_state'
        ? values.filter(value => !String(value.id || '').startsWith('backup_') && value.id !== 'sync_config')
        : values;
    }
    return snapshot;
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || snapshot.format !== 'cards-snapshot' || snapshot.version !== 1 || !snapshot.stores) {
      throw new Error('不是有效的 Cards 数据文件。');
    }
    if (!Array.isArray(snapshot.stores.cards) || !Array.isArray(snapshot.stores.topics)) {
      throw new Error('数据文件缺少卡片或专题。');
    }
  }

  async function importSnapshot(snapshot) {
    validateSnapshot(snapshot);
    const backup = await exportSnapshot();
    await put('sync_state', {
      id: `backup_${Date.now()}`,
      created_at: new Date().toISOString(),
      reason: 'before_import',
      snapshot: backup
    });

    const db = await open();
    const importedStores = STORES.filter(name => name !== 'sync_state' && Array.isArray(snapshot.stores[name]));
    for (const storeName of importedStores) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      snapshot.stores[storeName].forEach(value => store.put(value));
      await transactionDone(tx);
    }
    await put('sync_state', {
      id: 'last_import',
      imported_at: new Date().toISOString(),
      source_exported_at: snapshot.exported_at || null
    });
  }

  async function saveResume(value) {
    await setSetting('resume_position', {
      ...value,
      saved_at: new Date().toISOString()
    });
  }

  window.CardsDB = {
    DB_NAME,
    DB_VERSION,
    STORES,
    open,
    get,
    getAll,
    put,
    putMany,
    remove,
    update,
    getSetting,
    setSetting,
    seedIfEmpty,
    upgradeSeedContent,
    exportSnapshot,
    importSnapshot,
    saveResume
  };
})();
