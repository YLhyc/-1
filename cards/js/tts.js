(function () {
  'use strict';

  // 卡片朗读，仅服务于背诵模式的手动朗读按钮。
  // 双轨：优先播放构建时预生成的整卡 MP3（tts/<卡片ID>.mp3?v=<文本哈希>，Service Worker 首次播放后离线缓存）；
  // 音频缺失（新卡未生成、离线未缓存、404）时回退到浏览器原生 Web Speech API 朗读。
  // iOS 对长 utterance 有中途静音的已知问题，因此按句切成 ≤90 字的小块排队朗读；
  // iOS 的 speechSynthesis.pause() 在主屏幕 PWA 下不可靠，暂停统一用 cancel + 记录进度实现。
  const CHUNK_MAX = 90;

  let status = 'idle'; // idle | playing | paused
  let key = null;
  let engine = null;   // 'audio' | 'speech'
  let chunks = [];
  let cursor = 0;      // 正在朗读（或暂停时待续）的块下标
  let epoch = 0;       // 每次 stop/start 递增，让旧回调失效
  let voice = null;
  let onChange = null;
  let audioEl = null;

  function supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function ensureVoice() {
    if (!supported()) return;
    const voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    const zh = voices.filter(v => /^zh[-_]?/i.test(v.lang || ''));
    voice = zh.find(v => /tingting|ting-ting|婷婷|yu-shu|雨舒|meijia|美佳/i.test(v.name))
      || zh.find(v => /-CN|_CN|zh-CN/i.test(v.lang))
      || zh[0]
      || null;
  }

  if (supported()) {
    speechSynthesis.onvoiceschanged = ensureVoice;
    ensureVoice();
  }

  function plainText(value) {
    return String(value == null ? '' : value)
      .replace(/\{\{(?:accent|danger|success|muted)\|/g, '')
      .replace(/\}\}/g, '')
      .replace(/\*\*/g, '')
      .replace(/==/g, '')
      .trim();
  }

  function chunkText(text) {
    const clean = plainText(text);
    if (!clean) return [];
    const sentences = clean.match(/[^。！？；\n]+[。！？；]?/g) || [clean];
    const out = [];
    let buffer = '';
    for (const sentence of sentences) {
      const piece = sentence.trim();
      if (!piece) continue;
      if ((buffer + piece).length <= CHUNK_MAX) {
        buffer += piece;
        continue;
      }
      if (buffer) out.push(buffer);
      if (piece.length <= CHUNK_MAX) {
        buffer = piece;
      } else {
        for (let i = 0; i < piece.length; i += CHUNK_MAX) {
          out.push(piece.slice(i, i + CHUNK_MAX));
        }
        buffer = '';
      }
    }
    if (buffer) out.push(buffer);
    return out;
  }

  function buildChunks(card, options) {
    const opts = options || {};
    const segments = [];
    segments.push(card.title || '');
    if (card.prompt) segments.push('回忆问题。' + card.prompt);
    if (card.summary) segments.push('简要答案。' + card.summary);
    if (Array.isArray(card.outline) && card.outline.length) {
      segments.push('知识主干。');
      card.outline.forEach((item, index) => {
        segments.push(`第${index + 1}，${item.heading || ''}。${item.text || ''}`);
        (item.children || []).forEach(child => segments.push(`${child.heading || ''}：${child.text || ''}`));
      });
    }
    if (opts.examExpanded && card.exam_wording) {
      segments.push('规范答案。');
      segments.push(card.exam_wording);
    }
    let list = [];
    segments.forEach(segment => { list = list.concat(chunkText(segment)); });
    return list;
  }

  // ?v= 取种子里的逐卡文本哈希：正文修改重新发布后 URL 随之变化，
  // 让已缓存旧音频的客户端绕开 Service Worker 里永不清的 cards-tts-v1 缓存重新下载。
  function audioUrlFor(cardId) {
    try {
      const url = new URL(`tts/${encodeURIComponent(cardId)}.mp3`, document.baseURI);
      const versions = window.CardsSeed && window.CardsSeed.tts_versions;
      const version = versions && versions[cardId];
      if (version) url.searchParams.set('v', String(version));
      return url.href;
    } catch (error) { return null; }
  }

  function releaseAudio() {
    if (!audioEl) { engine = engine === 'audio' ? null : engine; return; }
    const el = audioEl; audioEl = null;
    el.pause();
    el.removeAttribute('src');
    try { el.load(); } catch (error) {}
    engine = engine === 'audio' ? null : engine;
  }

  // 预生成音频不可用（新卡未生成、离线未缓存、404）时回退到原生合成朗读。
  function fallbackToSpeech(card, options) {
    if (engine !== 'audio') return;
    releaseAudio();
    startSpeech(card, options);
  }

  function playFromAudio(url, onUnavailable) {
    const myEpoch = epoch;
    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.addEventListener('ended', () => { if (epoch === myEpoch) finish(); });
    el.addEventListener('error', () => { if (epoch === myEpoch) onUnavailable(); });
    audioEl = el;
    engine = 'audio';
    const playback = el.play();
    if (playback && playback.catch) playback.catch(() => { if (epoch === myEpoch) onUnavailable(); });
  }

  function startSpeech(card, options) {
    if (!supported()) { finish(); return false; }
    engine = 'speech';
    chunks = buildChunks(card, options);
    cursor = 0;
    if (!chunks.length) { finish(); return false; }
    status = 'playing';
    speakFrom(0);
    notify();
    return true;
  }

  function speakFrom(start) {
    const synth = speechSynthesis;
    const myEpoch = epoch;
    speakAt(start);

    function speakAt(index) {
      if (epoch !== myEpoch || status !== 'playing') return;
      if (index >= chunks.length) {
        finish();
        return;
      }
      cursor = index;
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = voice ? voice.lang : 'zh-CN';
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onend = () => { if (epoch === myEpoch) speakAt(index + 1); };
      utterance.onerror = () => { if (epoch === myEpoch) speakAt(index + 1); };
      synth.speak(utterance);
    }
  }

  function stop() {
    epoch += 1;
    status = 'idle';
    releaseAudio();
    if (supported()) speechSynthesis.cancel();
    notify();
  }

  function finish() {
    epoch += 1;
    status = 'idle';
    key = null;
    chunks = [];
    cursor = 0;
    releaseAudio();
    notify();
  }

  // 同一张卡：播放中点击＝暂停，暂停中点击＝从当前位置继续；换卡则从头播放。
  // 新卡优先播放预生成整卡音频；没有音频或播放失败时回退到原生合成（该路径按当前展开层级组稿）。
  function toggleCard(card, options) {
    const nextKey = card && card.id ? String(card.id) : '';
    if (!nextKey) return false;
    if ((status === 'playing' || status === 'paused') && nextKey === key) {
      if (status === 'playing' && engine === 'audio' && audioEl) {
        audioEl.pause();
        status = 'paused';
        notify();
        return true;
      }
      if (status === 'playing' && engine === 'speech' && supported()) {
        epoch += 1;
        speechSynthesis.cancel();
        status = 'paused';
        notify();
        return true;
      }
      if (status === 'paused' && engine === 'audio' && audioEl) {
        status = 'playing';
        const resumed = audioEl.play();
        if (resumed && resumed.catch) resumed.catch(() => fallbackToSpeech(card, options));
        notify();
        return true;
      }
      if (status === 'paused' && engine === 'speech' && supported()) {
        status = 'playing';
        speakFrom(cursor);
        notify();
        return true;
      }
      return false;
    }
    stop();
    key = nextKey;
    status = 'playing';
    const url = audioUrlFor(nextKey);
    if (url) {
      playFromAudio(url, () => fallbackToSpeech(card, options));
      notify();
      return true;
    }
    return startSpeech(card, options);
  }

  function state() {
    return { status, key, engine, supported: supported() };
  }

  function applyButton(button) {
    if (!button) return;
    const buttonKey = button.getAttribute('data-tts-key');
    const active = buttonKey && buttonKey === key && status !== 'idle';
    button.classList.toggle('active', Boolean(active));
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    const label = status === 'playing' && active ? '停止朗读'
      : status === 'paused' && active ? '继续朗读' : '朗读本卡';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function setOnChange(callback) {
    onChange = typeof callback === 'function' ? callback : null;
  }

  function notify() {
    if (onChange) onChange();
  }

  // 进入后台即停止，避免后台残留语音；回前台时若合成状态仍是播放但合成器已静默
  // （iOS 挂起后偶发），复位为空闲避免按钮假亮。音频路径由浏览器自行挂起，无需特殊处理。
  if (typeof document !== 'undefined' && 'visibilitychange' in document) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (status !== 'idle') stop();
      } else if (status === 'playing' && engine === 'speech' && supported() && !speechSynthesis.speaking && !speechSynthesis.pending) {
        finish();
      }
    });
  }

  window.CardsTTS = { supported, toggleCard, stop, state, applyButton, setOnChange };
})();
