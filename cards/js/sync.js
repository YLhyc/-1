(function () {
  'use strict';

  const META_ID = 'sync_meta';
  const CONFIG_ID = 'sync_config';
  const configuredTimeout = Number(window.CARDS_SYNC_TIMEOUT_MS || 20000);
  const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 20000;

  function uid(prefix) {
    const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${random}`;
  }

  function sorted(value) {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce((result, key) => { result[key] = sorted(value[key]); return result; }, {});
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(sorted(value));
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function importKey(raw) {
    if (typeof raw !== 'string' || raw.length < 24) throw new Error('设备密钥至少需要 24 个字符');
    return crypto.subtle.importKey('raw', new TextEncoder().encode(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  }

  async function getMeta() {
    const existing = await CardsDB.get('sync_state', META_ID);
    if (existing) return existing;
    const created = {
      id: META_ID, device_id: uid('browser'), cursor: null, pending_events: [],
      applied_event_ids: [], conflicts: 0
    };
    await CardsDB.put('sync_state', created);
    return created;
  }

  async function saveMeta(meta) {
    meta.id = META_ID;
    await CardsDB.put('sync_state', meta);
    return meta;
  }

  async function getConfig() {
    return CardsDB.get('sync_state', CONFIG_ID);
  }

  async function configure(url, rawKey) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      throw new Error('同步服务地址无效');
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
      throw new Error('同步服务地址必须是独立的服务根地址');
    }
    const normalized = parsed.origin;
    if (!/^https:/.test(normalized) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(normalized)) {
      throw new Error('同步服务必须使用 HTTPS');
    }
    const existing = await getConfig();
    const key = rawKey ? await importKey(rawKey) : existing && existing.key;
    if (!key) throw new Error('请输入设备密钥');
    await CardsDB.put('sync_state', { id: CONFIG_ID, url: normalized, key, updated_at: new Date().toISOString() });
    return { url: normalized };
  }

  async function enqueue(type, entityId, payload, baseRevision) {
    let event;
    await CardsDB.update('sync_state', META_ID, current => {
      const meta = current || {
        id: META_ID, device_id: uid('browser'), cursor: null, pending_events: [],
        applied_event_ids: [], conflicts: 0
      };
      event = {
        event_id: uid('evt'), entity_id: entityId, type,
        occurred_at: new Date().toISOString(), base_revision: baseRevision == null ? null : Number(baseRevision),
        payload: { ...payload, device_id: meta.device_id }
      };
      if (type === 'setting_changed') {
        meta.pending_events = meta.pending_events.filter(item => !(item.type === type && item.entity_id === entityId));
      }
      meta.pending_events.push(event);
      meta.updated_at = event.occurred_at;
      return meta;
    });
    window.dispatchEvent(new CustomEvent('cards-sync-status'));
    return event;
  }

  async function signedFetch(config, meta, method, target, value) {
    const body = value == null ? '' : canonicalJson(value);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = uid('nonce').slice(6);
    const bodyDigest = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)));
    const message = [meta.device_id, method, target, timestamp, nonce, bodyDigest].join('\n');
    const signature = hex(await crypto.subtle.sign('HMAC', config.key, new TextEncoder().encode(message)));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(config.url + target, {
        method,
        headers: {
          'Content-Type': 'application/json', 'X-Cards-Device': meta.device_id,
          'X-Cards-Timestamp': timestamp, 'X-Cards-Nonce': nonce, 'X-Cards-Signature': signature
        },
        body: method === 'POST' ? body : undefined,
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('同步请求超时，请检查网络后重试');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    let result;
    try { result = await response.json(); } catch (error) { result = {}; }
    if (!response.ok || !result.ok) throw new Error(result.error || `同步服务返回 ${response.status}`);
    return result;
  }

  function cardContent(card) {
    const copy = { ...card }; delete copy.schedule; delete copy.revision;
    return canonicalJson(copy);
  }

  async function rememberConflict(event, local, remote) {
    const id = `conflict_${event.event_id}`;
    if (await CardsDB.get('sync_state', id)) return;
    await CardsDB.put('sync_state', {
      id, event_id: event.event_id, card_id: event.entity_id, status: 'unresolved',
      detected_at: new Date().toISOString(), local, remote
    });
  }

  async function applyEvent(event, meta) {
    if (meta.applied_event_ids.includes(event.event_id)) return 'duplicate';
    if (event.payload && event.payload.device_id === meta.device_id) return 'own_event';
    const type = event.type;
    const cardId = event.entity_id;
    const local = await CardsDB.get('cards', cardId);
    const tombstone = await CardsDB.get('tombstones', cardId);
    let outcome = 'ignored';

    if (['card_created', 'card_updated', 'card_moved'].includes(type)) {
      const remote = event.payload.card;
      if (!remote) throw new Error(`${type} 缺少 card`);
      if (event.payload.topic && !await CardsDB.get('topics', event.payload.topic.id)) await CardsDB.put('topics', event.payload.topic);
      if (tombstone) outcome = 'blocked_by_tombstone';
      else if (!local) { await CardsDB.put('cards', remote); outcome = 'applied'; }
      else if (cardContent(local) === cardContent(remote)) {
        if (Number(remote.revision && remote.revision.version || 0) > Number(local.revision && local.revision.version || 0)) await CardsDB.put('cards', remote);
        outcome = 'equivalent';
      } else if (event.base_revision === Number(local.revision && local.revision.version || 0)) {
        await CardsDB.put('cards', remote); outcome = 'applied';
      } else {
        await rememberConflict(event, local, remote); outcome = 'conflict';
      }
    } else if (type === 'review_rated') {
      const remote = event.payload.card;
      if (local && remote) {
        const localTime = String(local.schedule && local.schedule.last_reviewed_at || '');
        const remoteTime = String(remote.schedule && remote.schedule.last_reviewed_at || event.occurred_at);
        if (remoteTime >= localTime) {
          const localVersion = Number(local.revision && local.revision.version || 0);
          const remoteVersion = Number(remote.revision && remote.revision.version || 0);
          await CardsDB.put('cards', { ...local, schedule: remote.schedule, revision: remoteVersion > localVersion ? remote.revision : local.revision });
          outcome = 'applied';
        }
      }
      if (event.payload.review_event) await CardsDB.put('review_events', event.payload.review_event);
    } else if (type === 'card_deleted') {
      if (!event.payload.tombstone) throw new Error('card_deleted 缺少 tombstone');
      await CardsDB.put('tombstones', event.payload.tombstone);
      await CardsDB.remove('cards', cardId);
      outcome = 'applied';
    } else if (type === 'card_restored') {
      if (!event.payload.card) throw new Error('card_restored 缺少 card');
      await CardsDB.put('cards', event.payload.card);
      await CardsDB.remove('tombstones', cardId);
      outcome = 'applied';
    } else if (type === 'session_completed') {
      if (event.payload.session) await CardsDB.put('sessions', event.payload.session);
      outcome = 'applied';
    } else if (type === 'setting_changed') {
      const setting = event.payload.setting;
      const current = setting && await CardsDB.get('settings', setting.id);
      if (setting && (!current || String(setting.updated_at || event.occurred_at) >= String(current.updated_at || ''))) {
        await CardsDB.put('settings', setting); outcome = 'applied';
      }
    }
    return outcome;
  }

  async function applyEvents(events, meta) {
    const counts = {};
    for (const event of events) {
      const outcome = await applyEvent(event, meta);
      counts[outcome] = (counts[outcome] || 0) + 1;
      if (!meta.applied_event_ids.includes(event.event_id)) meta.applied_event_ids.push(event.event_id);
    }
    if (meta.applied_event_ids.length > 5000) meta.applied_event_ids = meta.applied_event_ids.slice(-5000);
    return counts;
  }

  async function syncNow() {
    const config = await getConfig();
    if (!config || !config.url || !config.key) throw new Error('请先配置同步服务');
    const attemptAt = new Date().toISOString();
    const meta = await getMeta();
    await CardsDB.update('sync_state', META_ID, current => ({ ...current, last_attempt_at: attemptAt }));
    meta.last_attempt_at = attemptAt;
    const pending = meta.pending_events.slice();
    let pushed = 0;
    if (pending.length) {
      const result = await signedFetch(config, meta, 'POST', '/v1/sync/push', {
        device_id: meta.device_id, cursor: meta.cursor, sent_at: new Date().toISOString(), events: pending
      });
      const acknowledged = new Set([...(result.accepted_ids || []), ...(result.duplicate_ids || [])]);
      const latest = await CardsDB.update('sync_state', META_ID, current => {
        current.pending_events = current.pending_events.filter(event => !acknowledged.has(event.event_id));
        return current;
      });
      meta.pending_events = latest.pending_events;
      pushed = acknowledged.size;
    }
    const merged = {};
    let hasMore;
    do {
      const target = `/v1/sync/pull?cursor=${encodeURIComponent(meta.cursor || '0')}&limit=500`;
      const result = await signedFetch(config, meta, 'GET', target);
      const counts = await applyEvents(result.events || [], meta);
      Object.keys(counts).forEach(key => { merged[key] = (merged[key] || 0) + counts[key]; });
      meta.cursor = result.cursor || meta.cursor;
      hasMore = Boolean(result.has_more);
    } while (hasMore);
    meta.last_synced_at = new Date().toISOString();
    meta.last_error = null;
    meta.conflicts = (await CardsDB.getAll('sync_state')).filter(item => String(item.id).startsWith('conflict_') && item.status === 'unresolved').length;
    const appliedIds = meta.applied_event_ids.slice();
    const latest = await CardsDB.update('sync_state', META_ID, current => ({
      ...current,
      cursor: meta.cursor,
      applied_event_ids: Array.from(new Set([...(current.applied_event_ids || []), ...appliedIds])).slice(-5000),
      last_synced_at: meta.last_synced_at,
      last_attempt_at: attemptAt,
      last_error: null,
      conflicts: meta.conflicts
    }));
    meta.pending_events = latest.pending_events;
    window.dispatchEvent(new CustomEvent('cards-sync-applied', { detail: { pushed, merged, conflicts: meta.conflicts } }));
    return { pushed, merged, conflicts: meta.conflicts, pending: meta.pending_events.length, last_synced_at: meta.last_synced_at };
  }

  async function listSnapshots() {
    const config = await getConfig();
    if (!config || !config.url || !config.key) throw new Error('请先配置同步服务');
    const meta = await getMeta();
    const result = await signedFetch(config, meta, 'GET', '/v1/snapshots?limit=14');
    return Array.isArray(result.snapshots) ? result.snapshots : [];
  }

  async function restoreSnapshot(snapshotId = null) {
    const config = await getConfig();
    if (!config || !config.url || !config.key) throw new Error('请先配置同步服务');
    const meta = await getMeta();
    const target = snapshotId === null ? '/v1/snapshot' : `/v1/snapshot?id=${encodeURIComponent(snapshotId)}`;
    const result = await signedFetch(config, meta, 'GET', target);
    const snapshot = result.snapshot;
    if (!snapshot || snapshot.format !== 'cards-sync-snapshot' || snapshot.version !== 1) throw new Error('同步服务没有有效快照');
    if (!['cards', 'topics', 'tombstones'].every(key => Array.isArray(snapshot[key]))) throw new Error('同步快照不完整');
    await CardsDB.importSnapshot({
      format: 'cards-snapshot', version: 1, exported_at: snapshot.created_at,
      stores: { cards: snapshot.cards, topics: snapshot.topics, tombstones: snapshot.tombstones }
    });
    await CardsDB.update('sync_state', META_ID, current => ({
      ...current, cursor: snapshot.cursor || current.cursor, pending_events: [],
      restored_at: new Date().toISOString(), last_error: null
    }));
    window.dispatchEvent(new CustomEvent('cards-sync-applied', { detail: { restored: true } }));
    return { cards: snapshot.cards.length, topics: snapshot.topics.length, tombstones: snapshot.tombstones.length };
  }

  async function status() {
    const meta = await getMeta();
    const config = await getConfig();
    return {
      configured: Boolean(config && config.url && config.key), url: config && config.url,
      device_id: meta.device_id, cursor: meta.cursor, pending: meta.pending_events.length,
      last_synced_at: meta.last_synced_at || null, last_error: meta.last_error || null,
      last_attempt_at: meta.last_attempt_at || null,
      conflicts: Number(meta.conflicts || 0)
    };
  }

  async function recordError(error) {
    const meta = await getMeta();
    meta.last_error = error && error.message || String(error);
    meta.last_attempt_at = new Date().toISOString();
    await saveMeta(meta);
    window.dispatchEvent(new CustomEvent('cards-sync-status'));
  }

  async function listConflicts() {
    return (await CardsDB.getAll('sync_state'))
      .filter(item => String(item.id || '').startsWith('conflict_') && item.status === 'unresolved')
      .sort((left, right) => String(right.detected_at || '').localeCompare(String(left.detected_at || '')));
  }

  async function resolveConflict(conflictId, selectedCard, resolution) {
    const conflict = await CardsDB.get('sync_state', conflictId);
    if (!conflict || conflict.status !== 'unresolved') throw new Error('冲突已经处理或不存在');
    if (!selectedCard || selectedCard.id !== conflict.card_id) throw new Error('冲突版本与卡片不一致');
    const meta = await getMeta();
    const localVersion = Number(conflict.local && conflict.local.revision && conflict.local.revision.version || 0);
    const remoteVersion = Number(conflict.remote && conflict.remote.revision && conflict.remote.revision.version || 0);
    const localTime = String(conflict.local && conflict.local.schedule && conflict.local.schedule.last_reviewed_at || '');
    const remoteTime = String(conflict.remote && conflict.remote.schedule && conflict.remote.schedule.last_reviewed_at || '');
    const schedule = remoteTime > localTime ? conflict.remote.schedule : conflict.local.schedule;
    const baseRevision = Math.max(localVersion, remoteVersion);
    const resolved = {
      ...selectedCard,
      schedule: schedule || selectedCard.schedule,
      revision: { version: baseRevision + 1, updated_at: new Date().toISOString(), device_id: meta.device_id }
    };
    await CardsDB.put('cards', resolved);
    await CardsDB.put('sync_state', { ...conflict, status: 'resolved', resolution, resolved_at: new Date().toISOString(), resolved_revision: resolved.revision.version });
    await enqueue('card_updated', resolved.id, { card: resolved, topic: await CardsDB.get('topics', resolved.topic_id) }, baseRevision);
    await CardsDB.update('sync_state', META_ID, current => ({ ...current, conflicts: Math.max(0, Number(current.conflicts || 0) - 1) }));
    window.dispatchEvent(new CustomEvent('cards-sync-status'));
    return resolved;
  }

  window.CardsSync = { configure, enqueue, syncNow, listSnapshots, restoreSnapshot, status, recordError, listConflicts, resolveConflict, canonicalJson };
})();
