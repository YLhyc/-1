const fs = require('fs');
const path = 'D:/AAA考研/words-publish-202/';

function loadVar(file, name) {
  const s = fs.readFileSync(path + file, 'utf8');
  const m = s.match(new RegExp('var ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*\\r?\\n'));
  if (!m) throw new Error('not found ' + name + ' in ' + file);
  return JSON.parse(m[1]);
}

const hb = JSON.parse(fs.readFileSync(path + 'hongbaoshu.json', 'utf8'));
const hbW = loadVar('hb/index.html', 'WORDS');
const ufW = loadVar('uf/index.html', 'HONGBAOSHU');
const vocab = loadVar('index.html', 'VOCAB');
const ver = JSON.parse(fs.readFileSync(path + 'version.json', 'utf8'));
const sw = fs.readFileSync(path + 'sw.js', 'utf8');
const idx = fs.readFileSync(path + 'index.html', 'utf8');

const out = [];
const ok = (c, m) => out.push((c ? '  OK   ' : '  FAIL ') + m);

ok(hb.length === 6549, 'hongbaoshu.json 6549');
ok(hbW.length === 6549 && ufW.length === 6549, 'hb/uf 6549');
ok(vocab.length === 336, 'VOCAB 336');
ok(hb.every((w, i) => w.cn === hbW[i].cn && w.cn === ufW[i].cn), '三个内嵌副本 cn 完全一致');
ok(hb.every(w => w.examples && w.examples.length >= 1), '每个词条都有例句');
ok(hb.every(w => w.ex && w.ex === w.examples[0].en), '顶层 ex == examples[0].en');
ok(hb.every(w => w.ex_cn === w.examples[0].ex_cn), '顶层 ex_cn == examples[0].ex_cn');
ok(hb.every(w => w.cn_note && w.cn_note.length > 10), 'cn_note 全量');
ok(hb.every(w => ['en','cn','examples','ex','ex_cn','cn_note'].every(k => k in w)) && hb.every(w => Object.keys(w).length === 6),
   'hongbaoshu.json 字段形状恰为 6 字段');
ok(hbW.every(w => ['index','en','cn','examples','ex','ex_cn','cn_note','example_audio_available'].every(k => k in w)),
   'hb WORDS 字段形状完整');
ok(ufW.every(w => Object.keys(w).length === 2), 'uf 只有 en/cn');
ok(!hb.some(w => /(modal|ord|suff|usage)\./.test(w.cn)), '无词性标记残留');
ok(!hb.some(w => /[\u2E80-\u2EFF\u2F00-\u2FDF]/.test(w.cn)), '无部首畸形码位');

// morning listening plan simulation
const t = hb.find(w => w.en === 'train'), o = hb.find(w => w.en === 'object');
out.push('  train   cn = ' + t.cn + '  ex = ' + t.ex);
out.push('  object  cn = ' + o.cn + '  ex = ' + o.ex);
ok(t.cn.startsWith('培训'), 'train 主项 = 培训');
ok(o.cn.includes('反对'), 'object 含 反对');

ok(ver.version === '2.0.24', 'version.json = 2.0.24');
ok(/const CACHE = 'kv-2\.0\.24'/.test(sw), 'sw CACHE = kv-2.0.24');
ok(/var APP_BUILD_ID = "2\.0\.24"/.test(idx), 'APP_BUILD_ID = 2.0.24');
ok(/var BUILD_TS = 1790715000/.test(idx), 'BUILD_TS 已更新');
ok(!/\?v=2\.0\.19/.test(sw + idx), '无残留旧版本键');

const bad = out.filter(x => x.startsWith('  FAIL'));
console.log(out.join('\n'));
console.log('\n== 失败 ' + bad.length + ' 项 ==');
