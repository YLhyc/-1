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
    const [cards, topics, tombstones, initialized] = await Promise.all([
      getAll('cards'), getAll('topics'), getAll('tombstones'), get('sync_state', 'local_meta')
    ]);
    // An empty card store can be intentional after deleting every card. Tombstones and
    // the initialization marker must therefore prevent the release seed from reviving data.
    if (cards.length || topics.length || tombstones.length || initialized) return false;
    const db = await open();
    const tx = db.transaction(['cards', 'topics', 'sync_state', 'settings'], 'readwrite');
    const topicStore = tx.objectStore('topics');
    const cardStore = tx.objectStore('cards');
    (seed.topics || []).forEach(topic => topicStore.put(topic));
    (seed.cards || []).forEach(card => cardStore.put(card));
    tx.objectStore('sync_state').put({
      id: 'local_meta',
      schema_version: DB_VERSION,
      seeded_at: new Date().toISOString(),
      pending_events: 0
    });
    const settings = tx.objectStore('settings');
    const now = new Date().toISOString();
    if (seed.exam_wording_version) settings.put({ id: 'seed_exam_wording_version', value: seed.exam_wording_version, updated_at: now });
    if (seed.content_version) settings.put({ id: 'seed_content_version', value: seed.content_version, updated_at: now });
    await transactionDone(tx);
    return true;
  }

  async function upgradeSeedContent(seed, force = false) {
    if (!seed) return 0;
    const version = String(seed.content_version || seed.exam_wording_version || '');
    const releaseId = String(seed.release_id || '');
    const currentReleaseId = await getSetting('seed_release_id', '');
    const currentContentVersion = await getSetting('seed_content_version', '');
    const currentExamVersion = await getSetting('seed_exam_wording_version', '');

    const [cards, topics, tombstones, events] = await Promise.all([
      getAll('cards'), getAll('topics'), getAll('tombstones'), getAll('review_events')
    ]);

    const localCardsCount = cards.length;
    const seedCardsCount = (seed.cards || []).length;
    const isNewRelease = (releaseId && releaseId !== currentReleaseId) || (version && version !== currentContentVersion);
    const hasMissingCards = localCardsCount < seedCardsCount;

    if (!force && !isNewRelease && !hasMissingCards) return 0;

    const trustedReplace = force
      || (seed.replace_content_versions || []).includes(currentContentVersion)
      || (seed.replace_exam_wording_versions || []).includes(currentExamVersion)
      || isNewRelease;

    // 1. 同步缺失的专题 (topics)
    const localTopicById = new Map(topics.map(t => [t.id, t]));
    const missingTopics = (seed.topics || []).filter(t => !localTopicById.has(t.id));
    if (missingTopics.length) {
      await putMany('topics', missingTopics);
    }

    // 2. 统计已删除的卡片 (tombstones)，避免死灰复燃
    const deletedCardIds = new Set(
      tombstones.filter(t => t && t.card_id && !t.restored_at).map(t => String(t.card_id))
    );

    // 3. 统计用户主动编辑和移动过的卡片
    const localById = new Map(cards.map(card => [card.id, card]));
    const userEdited = new Set(
      events.filter(e => ['edited', 'restored'].includes(e.action)).map(e => e.card_id)
    );
    const userMoved = new Set(
      events.filter(e => e.action === 'moved').map(e => e.card_id)
    );

    const cardsToPut = [];
    for (const released of seed.cards || []) {
      const local = localById.get(released.id);
      if (!local) {
        // 全新发布的卡片：如果不在回收站中，直接入库
        if (!deletedCardIds.has(String(released.id))) {
          cardsToPut.push(released);
        }
        continue;
      }

      // 已有卡片：若用户手动编辑过，绝对保留用户版本
      if (userEdited.has(local.id)) continue;

      const releasedAnswer = String(released.exam_wording || '').trim();
      const localAnswer = String(local.exam_wording || '').trim();
      if (!trustedReplace && (releasedAnswer.length < 80 || localAnswer.length >= 120)) continue;

      const updated = {
        ...released,
        schedule: local.schedule,
        revision: local.revision
      };
      if (userMoved.has(local.id)) {
        updated.subject = local.subject;
        updated.module = local.module;
        updated.topic_id = local.topic_id;
        updated.order = local.order;
      }
      cardsToPut.push(updated);
    }

    if (cardsToPut.length) {
      await putMany('cards', cardsToPut);
    }

    const now = new Date().toISOString();
    if (releaseId) await setSetting('seed_release_id', releaseId);
    if (version) await setSetting('seed_content_version', version);
    if (seed.exam_wording_version) await setSetting('seed_exam_wording_version', seed.exam_wording_version);

    return cardsToPut.length;
  }

  async function forceResyncSeed(seed) {
    return upgradeSeedContent(seed, true);
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
    const keyPaths = {
      cards: 'id', topics: 'id', review_events: 'event_id', sessions: 'id',
      tombstones: 'card_id', settings: 'id'
    };
    for (const [storeName, keyPath] of Object.entries(keyPaths)) {
      const rows = snapshot.stores[storeName];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) throw new Error(`数据文件中的 ${storeName} 不是有效列表。`);
      const keys = new Set();
      for (const row of rows) {
        const key = row && row[keyPath];
        if (typeof key !== 'string' || !key.trim()) throw new Error(`数据文件中的 ${storeName} 缺少 ${keyPath}。`);
        if (keys.has(key)) throw new Error(`数据文件中的 ${storeName} 存在重复 ${keyPath}。`);
        keys.add(key);
      }
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

    const importedStores = STORES.filter(name => name !== 'sync_state' && Array.isArray(snapshot.stores[name]));
    if (importedStores.length) {
      const db = await open();
      const tx = db.transaction(importedStores, 'readwrite');
      for (const storeName of importedStores) {
        const store = tx.objectStore(storeName);
        store.clear();
        snapshot.stores[storeName].forEach(value => store.put(value));
      }
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
    forceResyncSeed,
    exportSnapshot,
    importSnapshot,
    saveResume
  };
})();
