(function(global) {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ═══════════ ROOT FAMILIES (考研核心同根词家族，全面扩充) ═══════════
  var ROOT_FAMILIES = {
    dict: {
      root: 'dict / dic',
      meaning: '言，说，宣告，命令',
      desc: '源自拉丁语 dicere，表达口述、预言、宣判与反驳',
      words: [
        { en: 'jurisdiction', pos: 'n.', cn: '司法权，管辖权' },
        { en: 'verdict', pos: 'n.', cn: '裁定，判决' },
        { en: 'predict', pos: 'v.', cn: '预言，预测' },
        { en: 'prediction', pos: 'n.', cn: '预言，预测' },
        { en: 'dictate', pos: 'v.', cn: '口述；支配，命令' },
        { en: 'contradict', pos: 'v.', cn: '反驳；与...矛盾' },
        { en: 'contradiction', pos: 'n.', cn: '矛盾，反驳' },
        { en: 'indicate', pos: 'v.', cn: '表明，指出' },
        { en: 'indicator', pos: 'n.', cn: '指标，指示器' },
        { en: 'addict', pos: 'v.', cn: '使沉溺 n. 上瘾者' }
      ]
    },
    spect: {
      root: 'spect / spic',
      meaning: '看，凝视，审视',
      desc: '源自拉丁语 specere，引申为视角、观察、审视与展望',
      words: [
        { en: 'inspect', pos: 'v.', cn: '视察，检查' },
        { en: 'inspection', pos: 'n.', cn: '视察，检查' },
        { en: 'prospect', pos: 'n.', cn: '前景，前途，希望' },
        { en: 'prospective', pos: 'adj.', cn: '预期的，未来的' },
        { en: 'perspective', pos: 'n.', cn: '视角，透视，远景' },
        { en: 'aspect', pos: 'n.', cn: '方面，朝向，外貌' },
        { en: 'respect', pos: 'v./n.', cn: '尊敬，敬意；方面' },
        { en: 'respectable', pos: 'adj.', cn: '值得尊敬的，体面的' },
        { en: 'respective', pos: 'adj.', cn: '各自的，分别的' },
        { en: 'suspect', pos: 'v.', cn: '怀疑 n. 嫌疑人' },
        { en: 'suspicious', pos: 'adj.', cn: '可疑的，多疑的' },
        { en: 'spectacle', pos: 'n.', cn: '壮观景象，奇观；眼镜' },
        { en: 'spectacular', pos: 'adj.', cn: '壮观的，引人注目的' },
        { en: 'conspicuous', pos: 'adj.', cn: '显眼的，引人注目的' },
        { en: 'despise', pos: 'v.', cn: '鄙视，看不起' }
      ]
    },
    tract: {
      root: 'tract',
      meaning: '拉，引，拽，拖',
      desc: '源自拉丁语 trahere，表达拉拽、吸引、抽取与契约',
      words: [
        { en: 'attract', pos: 'v.', cn: '吸引，引起兴趣' },
        { en: 'attraction', pos: 'n.', cn: '吸引力，向往的地方' },
        { en: 'attractive', pos: 'adj.', cn: '有吸引力的' },
        { en: 'contract', pos: 'n.', cn: '合同 v. 收缩，感染' },
        { en: 'contraction', pos: 'n.', cn: '紧缩，收缩' },
        { en: 'distract', pos: 'v.', cn: '分散注意力，打扰' },
        { en: 'distraction', pos: 'n.', cn: '分心，使人分心的事物' },
        { en: 'extract', pos: 'v.', cn: '提取，榨取 n. 摘录' },
        { en: 'abstract', pos: 'adj.', cn: '抽象的 n. 摘要 v. 提取' },
        { en: 'subtract', pos: 'v.', cn: '减去，减掉' },
        { en: 'traction', pos: 'n.', cn: '牵引力，拉力；知名度' }
      ]
    },
    duc: {
      root: 'duc / duct',
      meaning: '引导，引向，带来',
      desc: '源自拉丁语 ducere，引申为生产、引导、推论与减少',
      words: [
        { en: 'conduct', pos: 'v.', cn: '组织，实施；引导' },
        { en: 'introduce', pos: 'v.', cn: '介绍，引进，采用' },
        { en: 'introduction', pos: 'n.', cn: '采用，引进；引言' },
        { en: 'produce', pos: 'v.', cn: '生产，引起 n. 农产品' },
        { en: 'product', pos: 'n.', cn: '产品，产物' },
        { en: 'productive', pos: 'adj.', cn: '富有成效的，多产的' },
        { en: 'productivity', pos: 'n.', cn: '生产率，生产力' },
        { en: 'reduce', pos: 'v.', cn: '减少，降低' },
        { en: 'reduction', pos: 'n.', cn: '削减，减少' },
        { en: 'deduce', pos: 'v.', cn: '推论，推断' },
        { en: 'deduction', pos: 'n.', cn: '推论；扣除额' },
        { en: 'induce', pos: 'v.', cn: '引起，导致；诱导' },
        { en: 'educate', pos: 'v.', cn: '教育，培养' }
      ]
    },
    struct: {
      root: 'struct',
      meaning: '建造，构建，搭起',
      desc: '源自拉丁语 struere，表达构造、指导、破坏与障碍',
      words: [
        { en: 'structure', pos: 'n.', cn: '结构，建筑物 v. 构造' },
        { en: 'structural', pos: 'adj.', cn: '结构上的' },
        { en: 'construct', pos: 'v.', cn: '建筑，构建，创立' },
        { en: 'construction', pos: 'n.', cn: '建造，施工；结构' },
        { en: 'constructive', pos: 'adj.', cn: '建设性的，有积极作用的' },
        { en: 'destruct', pos: 'v.', cn: '破坏，自毁' },
        { en: 'destruction', pos: 'n.', cn: '摧毁，毁灭' },
        { en: 'destructive', pos: 'adj.', cn: '毁灭性的，有害的' },
        { en: 'instruct', pos: 'v.', cn: '指示，教导，通知' },
        { en: 'instruction', pos: 'n.', cn: '指示，教学，说明书' },
        { en: 'instructive', pos: 'adj.', cn: '有启发性的，有益的' },
        { en: 'obstruct', pos: 'v.', cn: '妨碍，阻塞，遮挡' }
      ]
    },
    dic: {
      root: 'dic / dict',
      meaning: '说，宣示，讲',
      desc: '源自拉丁语 dicere，表达预言、指示、矛盾与裁决',
      words: [
        { en: 'predict', pos: 'v.', cn: '预言，预测' },
        { en: 'prediction', pos: 'n.', cn: '预言，预告' },
        { en: 'predictable', pos: 'adj.', cn: '可预测的，意料之中的' },
        { en: 'contradict', pos: 'v.', cn: '反驳，与...相矛盾' },
        { en: 'contradiction', pos: 'n.', cn: '矛盾，不一致' },
        { en: 'contradictory', pos: 'adj.', cn: '相互矛盾的' },
        { en: 'indicate', pos: 'v.', cn: '表明，暗示，指示' },
        { en: 'indication', pos: 'n.', cn: '迹象，暗示' },
        { en: 'indicator', pos: 'n.', cn: '指示器，指标' },
        { en: 'dictate', pos: 'v.', cn: '口授，命令，支配' },
        { en: 'verdict', pos: 'n.', cn: '裁决，定论' },
        { en: 'dedicate', pos: 'v.', cn: '致力于，献身于' }
      ]
    },
    ced: {
      root: 'ced / cess / ceed',
      meaning: '走，行进，让步',
      desc: '源自拉丁语 cedere，表达前进、退让、超过与通达',
      words: [
        { en: 'precede', pos: 'v.', cn: '先于...发生，在...之前' },
        { en: 'precedent', pos: 'n.', cn: '先例，前例' },
        { en: 'unprecedented', pos: 'adj.', cn: '前所未有的，空前的' },
        { en: 'proceed', pos: 'v.', cn: '继续进行，行进' },
        { en: 'procedure', pos: 'n.', cn: '程序，步骤，手续' },
        { en: 'exceed', pos: 'v.', cn: '超过，超出' },
        { en: 'excess', pos: 'n.', cn: '过量，过度' },
        { en: 'excessive', pos: 'adj.', cn: '过分的，过度的' },
        { en: 'succeed', pos: 'v.', cn: '成功；继承，接着发生' },
        { en: 'success', pos: 'n.', cn: '成功，成就' },
        { en: 'successive', pos: 'adj.', cn: '连续的，相继的' },
        { en: 'access', pos: 'n./v.', cn: '通道；获取，存取' },
        { en: 'accessible', pos: 'adj.', cn: '可到达的，易理解的' },
        { en: 'concede', pos: 'v.', cn: '承认；让步' },
        { en: 'recession', pos: 'n.', cn: '经济衰退' }
      ]
    },
    mit: {
      root: 'mit / miss',
      meaning: '送，发射，派遣，放',
      desc: '源自拉丁语 mittere，表达传递、犯下、允许与解散',
      words: [
        { en: 'admit', pos: 'v.', cn: '承认；准许进入' },
        { en: 'admission', pos: 'n.', cn: '准许加入；承认' },
        { en: 'commit', pos: 'v.', cn: '犯(错误)；承诺，投入' },
        { en: 'commitment', pos: 'n.', cn: '承诺，献身，投入' },
        { en: 'emit', pos: 'v.', cn: '散发，发出(光、热、气体)' },
        { en: 'emission', pos: 'n.', cn: '排放物，散发' },
        { en: 'permit', pos: 'v.', cn: '允许，准许 n. 许可证' },
        { en: 'permission', pos: 'n.', cn: '许可，允许' },
        { en: 'submit', pos: 'v.', cn: '提交，屈服' },
        { en: 'transmit', pos: 'v.', cn: '传输，传播，传递' },
        { en: 'transmission', pos: 'n.', cn: '播送，发射，传动装置' },
        { en: 'omit', pos: 'v.', cn: '省略，省去，遗漏' },
        { en: 'omission', pos: 'n.', cn: '遗漏，疏忽' },
        { en: 'dismiss', pos: 'v.', cn: '不予考虑，解雇，解散' }
      ]
    },
    pel: {
      root: 'pel / puls',
      meaning: '推，驱逐，冲撞',
      desc: '源自拉丁语 pellere，引申为动力、强制与排斥',
      words: [
        { en: 'compel', pos: 'v.', cn: '强迫，迫使' },
        { en: 'compelling', pos: 'adj.', cn: '令人信服的，引人入胜的' },
        { en: 'compulsion', pos: 'n.', cn: '强迫，难以克制的冲动' },
        { en: 'impel', pos: 'v.', cn: '推动，激励，驱使' },
        { en: 'impulse', pos: 'n.', cn: '冲动，一时的念头' },
        { en: 'repel', pos: 'v.', cn: '击退，排斥，令人厌恶' },
        { en: 'repulsive', pos: 'adj.', cn: '令人厌恶的' },
        { en: 'propel', pos: 'v.', cn: '推进，驱使' },
        { en: 'expel', pos: 'v.', cn: '驱逐，开除' }
      ]
    },
    clud: {
      root: 'clud / clus',
      meaning: '关，闭，封闭，封锁',
      desc: '源自拉丁语 claudere，表达封闭、终结、包含与排他',
      words: [
        { en: 'conclude', pos: 'v.', cn: '推断出，下结论；结束' },
        { en: 'conclusion', pos: 'n.', cn: '结论，推论；结尾' },
        { en: 'conclusive', pos: 'adj.', cn: '确凿的，决定性的' },
        { en: 'exclude', pos: 'v.', cn: '把...排除在外，不包括' },
        { en: 'exclusive', pos: 'adj.', cn: '排他的，独占的，高级的' },
        { en: 'include', pos: 'v.', cn: '包括，包含' },
        { en: 'inclusive', pos: 'adj.', cn: '包罗万象的，包括在内的' },
        { en: 'preclude', pos: 'v.', cn: '排除，妨碍，阻止' },
        { en: 'seclude', pos: 'v.', cn: '使隔离，使孤立' }
      ]
    },
    tend: {
      root: 'tend / tens / tent',
      meaning: '伸展，趋向，紧绷',
      desc: '源自拉丁语 tendere，引申为延伸、意图、关注与紧绷',
      words: [
        { en: 'extend', pos: 'v.', cn: '延伸，扩展，提供' },
        { en: 'extension', pos: 'n.', cn: '伸展，延期，电话分机' },
        { en: 'extensive', pos: 'adj.', cn: '广泛的，广阔的' },
        { en: 'extent', pos: 'n.', cn: '程度，范围，大小' },
        { en: 'intend', pos: 'v.', cn: '打算，意图，企图' },
        { en: 'intention', pos: 'n.', cn: '意图，目的' },
        { en: 'intentional', pos: 'adj.', cn: '故意的，有意的' },
        { en: 'pretend', pos: 'v.', cn: '假装，装作' },
        { en: 'contend', pos: 'v.', cn: '竞争，声称，争辩' },
        { en: 'intense', pos: 'adj.', cn: '强烈的，剧烈的' },
        { en: 'intensive', pos: 'adj.', cn: '密集的，集中的' },
        { en: 'tension', pos: 'n.', cn: '紧张局势，张力' }
      ]
    },
    vert: {
      root: 'vert / vers',
      meaning: '转，转变，反向',
      desc: '源自拉丁语 vertere，引申为转化、逆境、多样与争议',
      words: [
        { en: 'convert', pos: 'v.', cn: '转变，转化；使皈依' },
        { en: 'conversion', pos: 'n.', cn: '转化，转变' },
        { en: 'divert', pos: 'v.', cn: '转移注意力；改道' },
        { en: 'diverse', pos: 'adj.', cn: '形形色色的，多样的' },
        { en: 'diversity', pos: 'n.', cn: '多样性，多元化' },
        { en: 'reverse', pos: 'v.', cn: '反转，倒车 adj. 反面的' },
        { en: 'adverse', pos: 'adj.', cn: '不利的，有害的' },
        { en: 'adversity', pos: 'n.', cn: '逆境，不幸' },
        { en: 'controversy', pos: 'n.', cn: '公开辩论，论战' },
        { en: 'controversial', pos: 'adj.', cn: '有争议的' },
        { en: 'subvert', pos: 'v.', cn: '颠覆，推翻' },
        { en: 'avert', pos: 'v.', cn: '避免，防止；转移目光' }
      ]
    },
    pos: {
      root: 'pos / posit / pon',
      meaning: '放，安置，提出',
      desc: '源自拉丁语 ponere，表达摆放、立场、组成与提议',
      words: [
        { en: 'compose', pos: 'v.', cn: '组成，作曲，撰写' },
        { en: 'composition', pos: 'n.', cn: '构成，作文，乐曲' },
        { en: 'decompose', pos: 'v.', cn: '腐烂，分解' },
        { en: 'expose', pos: 'v.', cn: '暴露，揭露' },
        { en: 'exposure', pos: 'n.', cn: '显露，暴露；报导' },
        { en: 'impose', pos: 'v.', cn: '把...强加于；征税' },
        { en: 'oppose', pos: 'v.', cn: '反对，抗争' },
        { en: 'opposite', pos: 'adj.', cn: '对面的，相反的' },
        { en: 'propose', pos: 'v.', cn: '提议，建议；求婚' },
        { en: 'proposal', pos: 'n.', cn: '提议，建议书' },
        { en: 'deposit', pos: 'v.', cn: '存放，付押金 n. 存款' },
        { en: 'dispose', pos: 'v.', cn: '布置；处理，处置' },
        { en: 'disposition', pos: 'n.', cn: '性格，倾向，处理' },
        { en: 'disposable', pos: 'adj.', cn: '一次性的，可自由支配的' },
        { en: 'suppose', pos: 'v.', cn: '假设，料想' },
        { en: 'component', pos: 'n.', cn: '组成部分，成分' },
        { en: 'postpone', pos: 'v.', cn: '推迟，推缓' }
      ]
    },
    cap: {
      root: 'cap / cept / ceiv',
      meaning: '抓，拿，领会，捕获',
      desc: '源自拉丁语 capere，表达捕获、接收、感知与概念',
      words: [
        { en: 'capable', pos: 'adj.', cn: '有能力的，能干的' },
        { en: 'capacity', pos: 'n.', cn: '容量，容积；能力' },
        { en: 'capture', pos: 'v.', cn: '俘获，捕获；引起关注' },
        { en: 'accept', pos: 'v.', cn: '接受，认可' },
        { en: 'acceptable', pos: 'adj.', cn: '可接受的，尚可的' },
        { en: 'concept', pos: 'n.', cn: '概念，观念' },
        { en: 'conception', pos: 'n.', cn: '理解，概念；受孕' },
        { en: 'deceive', pos: 'v.', cn: '欺骗，蒙骗' },
        { en: 'perceive', pos: 'v.', cn: '感知，察觉；看待' },
        { en: 'perception', pos: 'n.', cn: '知觉，看法，洞察力' },
        { en: 'receive', pos: 'v.', cn: '收到，接收' },
        { en: 'susceptible', pos: 'adj.', cn: '易受影响的，易感染的' }
      ]
    },
    gen: {
      root: 'gen / gener / gent',
      meaning: '出生，产生，种类',
      desc: '源自拉丁语 genere，表达发生、普遍、慷慨与起源',
      words: [
        { en: 'generate', pos: 'v.', cn: '产生，引起，发电' },
        { en: 'generation', pos: 'n.', cn: '一代人；产生' },
        { en: 'generator', pos: 'n.', cn: '发电机，发动机' },
        { en: 'general', pos: 'adj.', cn: '大体的，普遍的' },
        { en: 'generalize', pos: 'v.', cn: '概括，归纳' },
        { en: 'generous', pos: 'adj.', cn: '慷慨的，大方的' },
        { en: 'genuine', pos: 'adj.', cn: '真诚的，真正的' },
        { en: 'genius', pos: 'n.', cn: '天才，天赋' },
        { en: 'indigenous', pos: 'adj.', cn: '本土的，土生土长的' },
        { en: 'ingenious', pos: 'adj.', cn: '巧妙的，心灵手巧的' }
      ]
    },
    cur: {
      root: 'cur / curs / cour',
      meaning: '跑，发生，流动',
      desc: '源自拉丁语 currere，表达发生、流传、光标与课程',
      words: [
        { en: 'occur', pos: 'v.', cn: '发生，出现；想起' },
        { en: 'occurrence', pos: 'n.', cn: '发生，出现；事件' },
        { en: 'recur', pos: 'v.', cn: '再发生，反复出现' },
        { en: 'current', pos: 'adj.', cn: '当前的 n. 水流，气流' },
        { en: 'currency', pos: 'n.', cn: '货币，流通' },
        { en: 'concur', pos: 'v.', cn: '同意，赞同；同时发生' },
        { en: 'incur', pos: 'v.', cn: '招致，蒙受' },
        { en: 'excursion', pos: 'n.', cn: '远足，短途旅行' },
        { en: 'curriculum', pos: 'n.', cn: '课程体系' }
      ]
    },
    val: {
      root: 'val / vail',
      meaning: '强壮，有力量，有价值',
      desc: '源自拉丁语 valere，表达有效、强健、战胜与评估',
      words: [
        { en: 'valid', pos: 'adj.', cn: '有效的，符合逻辑的' },
        { en: 'validity', pos: 'n.', cn: '有效性，正当性' },
        { en: 'validate', pos: 'v.', cn: '证实，使合法化' },
        { en: 'avail', pos: 'v.', cn: '利用 n. 效用，利益' },
        { en: 'available', pos: 'adj.', cn: '可获得的，有空的' },
        { en: 'prevail', pos: 'v.', cn: '占优势，战胜；盛行' },
        { en: 'prevalent', pos: 'adj.', cn: '流行的，普遍的' },
        { en: 'evaluate', pos: 'v.', cn: '评估，评价' },
        { en: 'value', pos: 'n.', cn: '价值，重要性 v. 估价' },
        { en: 'valuable', pos: 'adj.', cn: '很有价值的，贵重的' },
        { en: 'invaluable', pos: 'adj.', cn: '极其宝贵的，无价的' }
      ]
    },
    flu: {
      root: 'flu / flux',
      meaning: '流动，流淌，涌出',
      desc: '源自拉丁语 fluere，引申为流利、影响、富裕与波动',
      words: [
        { en: 'fluid', pos: 'adj.', cn: '流动的 n. 流体，液体' },
        { en: 'fluent', pos: 'adj.', cn: '流利的，流畅的' },
        { en: 'fluency', pos: 'n.', cn: '流利度' },
        { en: 'influence', pos: 'v./n.', cn: '影响，左右' },
        { en: 'influential', pos: 'adj.', cn: '有很大影响力的' },
        { en: 'influx', pos: 'n.', cn: '涌入，流入' },
        { en: 'affluent', pos: 'adj.', cn: '富裕的，富足的' },
        { en: 'fluctuate', pos: 'v.', cn: '波动，起伏不定' },
        { en: 'superfluous', pos: 'adj.', cn: '多余的，过剩的' }
      ]
    },
    fin: {
      root: 'fin',
      meaning: '界限，尽头，终结',
      desc: '源自拉丁语 finis，表达限定、终点、提炼与财政',
      words: [
        { en: 'final', pos: 'adj.', cn: '最终的，决定性的' },
        { en: 'finite', pos: 'adj.', cn: '有限的' },
        { en: 'infinite', pos: 'adj.', cn: '无限的，极多的' },
        { en: 'define', pos: 'v.', cn: '给...下定义，界定' },
        { en: 'definition', pos: 'n.', cn: '定义，释义；清晰度' },
        { en: 'definite', pos: 'adj.', cn: '明确的，确定的' },
        { en: 'definitely', pos: 'adv.', cn: '明确地，无可置疑地' },
        { en: 'confine', pos: 'v.', cn: '限制，禁闭' },
        { en: 'refine', pos: 'v.', cn: '提炼，改良，完善' },
        { en: 'refinement', pos: 'n.', cn: '精炼，文雅，细微改进' },
        { en: 'finance', pos: 'n.', cn: '金融，财务 v. 提供资金' }
      ]
    },
    ple: {
      root: 'ple / plet / pli',
      meaning: '满，充满，填补',
      desc: '源自拉丁语 plere，表达充满、完成、互补与消耗',
      words: [
        { en: 'complete', pos: 'adj.', cn: '完整的 v. 完成' },
        { en: 'completion', pos: 'n.', cn: '完成，圆满' },
        { en: 'complement', pos: 'n.', cn: '补充物，互补物 v. 补充' },
        { en: 'complementary', pos: 'adj.', cn: '互补的，相配的' },
        { en: 'deplete', pos: 'v.', cn: '耗尽，大量削减' },
        { en: 'depletion', pos: 'n.', cn: '消耗，枯竭' },
        { en: 'plentiful', pos: 'adj.', cn: '丰富的，丰裕的' },
        { en: 'plenty', pos: 'n.', cn: '大量，充足' },
        { en: 'implement', pos: 'v.', cn: '实施，贯彻 n. 工具' },
        { en: 'supplement', pos: 'n./v.', cn: '增补，补充物' }
      ]
    },
    sens: {
      root: 'sens / sent',
      meaning: '感觉，知觉，情绪',
      desc: '源自拉丁语 sentire，表达感官、理智、赞同与愤恨',
      words: [
        { en: 'sense', pos: 'n.', cn: '感官，意义，辨别力' },
        { en: 'sensitive', pos: 'adj.', cn: '敏感的，体贴的' },
        { en: 'sensitivity', pos: 'n.', cn: '敏感性，善解人意' },
        { en: 'sensible', pos: 'adj.', cn: '明智的，合理的' },
        { en: 'sentiment', pos: 'n.', cn: '情绪，看法，情操' },
        { en: 'consent', pos: 'v./n.', cn: '同意，赞许' },
        { en: 'dissent', pos: 'v./n.', cn: '持有异议，不赞成' },
        { en: 'resent', pos: 'v.', cn: '怨恨，对...愤愤不平' }
      ]
    },
    vol: {
      root: 'vol / volv / volu',
      meaning: '转，卷，转动，演变',
      desc: '源自拉丁语 volvere，引申为进化、旋转、卷入与容积',
      words: [
        { en: 'evolve', pos: 'v.', cn: '演变，进化，逐步发展' },
        { en: 'evolution', pos: 'n.', cn: '演变，进化论' },
        { en: 'evolutionary', pos: 'adj.', cn: '进化的，渐进的' },
        { en: 'revolve', pos: 'v.', cn: '旋转，围绕...转动' },
        { en: 'revolution', pos: 'n.', cn: '革命，巨变；公转' },
        { en: 'revolutionary', pos: 'adj.', cn: '革命性的，划时代的' },
        { en: 'involve', pos: 'v.', cn: '包含，牵涉，卷入' },
        { en: 'involvement', pos: 'n.', cn: '参与，卷入' },
        { en: 'volume', pos: 'n.', cn: '卷，册；容积，音量' }
      ]
    },
    form: {
      root: 'form',
      meaning: '形式，形状，塑造，规则',
      desc: '源自拉丁语 forma，表达形态、顺应、改革与转化',
      words: [
        { en: 'form', pos: 'n.', cn: '形式，表格 v. 塑造' },
        { en: 'formal', pos: 'adj.', cn: '庄重的，正规的' },
        { en: 'format', pos: 'n.', cn: '版式，总体安排' },
        { en: 'formula', pos: 'n.', cn: '公式，方程式，配方' },
        { en: 'formulate', pos: 'v.', cn: '规划，确切表达' },
        { en: 'conform', pos: 'v.', cn: '顺从，符合，遵从' },
        { en: 'conformity', pos: 'n.', cn: '遵从，一致' },
        { en: 'inform', pos: 'v.', cn: '通知，告知；赋予特征' },
        { en: 'information', pos: 'n.', cn: '情报，信息' },
        { en: 'informative', pos: 'adj.', cn: '增进知识的，提供有用信息的' },
        { en: 'reform', pos: 'v./n.', cn: '改革，改良' },
        { en: 'transform', pos: 'v.', cn: '使变形，彻底改变' },
        { en: 'transformation', pos: 'n.', cn: '巨大改观，转化' },
        { en: 'uniform', pos: 'n.', cn: '制服 adj. 统一的' }
      ]
    },
    serv: {
      root: 'serv',
      meaning: '保留，维持，服侍，守护',
      desc: '源自拉丁语 servare，引申为保护、储备、观察与服务',
      words: [
        { en: 'serve', pos: 'v.', cn: '服务，服役，端上' },
        { en: 'service', pos: 'n.', cn: '公共服务，检修' },
        { en: 'conserve', pos: 'v.', cn: '保护，节约(资源)' },
        { en: 'conservation', pos: 'n.', cn: '自然保护，守恒' },
        { en: 'conservative', pos: 'adj.', cn: '保守的，守旧的' },
        { en: 'preserve', pos: 'v.', cn: '保护，完好保存' },
        { en: 'preservation', pos: 'n.', cn: '维持，保存' },
        { en: 'reserve', pos: 'v.', cn: '预订，保留 n. 储备' },
        { en: 'reservation', pos: 'n.', cn: '预订；存疑' },
        { en: 'observe', pos: 'v.', cn: '观察，监视；遵守' },
        { en: 'observation', pos: 'n.', cn: '观察报告，评论' },
        { en: 'deserve', pos: 'v.', cn: '值得，应得' }
      ]
    },
    solv: {
      root: 'solv / solu',
      meaning: '解开，松弛，溶解',
      desc: '源自拉丁语 solvere，表达解答、决心、瓦解与绝对',
      words: [
        { en: 'solve', pos: 'v.', cn: '解答，解决' },
        { en: 'solution', pos: 'n.', cn: '解决办法；溶液' },
        { en: 'soluble', pos: 'adj.', cn: '可溶的' },
        { en: 'resolve', pos: 'v.', cn: '解决；下决心 n. 坚决' },
        { en: 'resolution', pos: 'n.', cn: '决议；决心；分辨率' },
        { en: 'resolute', pos: 'adj.', cn: '坚决的，不动摇的' },
        { en: 'dissolve', pos: 'v.', cn: '溶解，解散' },
        { en: 'absolute', pos: 'adj.', cn: '完全的，绝对的' }
      ]
    },
    viv: {
      root: 'viv / vit',
      meaning: '生命，生活，生机',
      desc: '源自拉丁语 vivere，表达生动、关键、幸存与复苏',
      words: [
        { en: 'vital', pos: 'adj.', cn: '生死攸关的，极其重要的' },
        { en: 'vitality', pos: 'n.', cn: '生命力，活力' },
        { en: 'vivid', pos: 'adj.', cn: '生动的，鲜明的' },
        { en: 'survive', pos: 'v.', cn: '幸存，从...生还' },
        { en: 'survival', pos: 'n.', cn: '生存，幸存' },
        { en: 'revive', pos: 'v.', cn: '苏醒，复兴，重演' },
        { en: 'revival', pos: 'n.', cn: '复苏，再生' }
      ]
    },
    port: {
      root: 'port',
      meaning: '拿，运，携带，港口',
      desc: '源自拉丁语 portare，表达搬运、支持与输出',
      words: [
        { en: 'transport', pos: 'v./n.', cn: '运输，运送' },
        { en: 'export', pos: 'v./n.', cn: '出口，输出' },
        { en: 'import', pos: 'v./n.', cn: '进口，输入；重要性' },
        { en: 'support', pos: 'v./n.', cn: '支持，支撑，供养' },
        { en: 'report', pos: 'v./n.', cn: '报道，汇报' },
        { en: 'portable', pos: 'adj.', cn: '便携的，轻便的' }
      ]
    },
    sta: {
      root: 'sta / stat / stit',
      meaning: '站，立，建立，固定',
      desc: '源自拉丁语 stare，表达稳定、状态、确立与抵制',
      words: [
        { en: 'stable', pos: 'adj.', cn: '稳定的，牢固的' },
        { en: 'stability', pos: 'n.', cn: '稳定性，稳固' },
        { en: 'status', pos: 'n.', cn: '地位，身份；状态' },
        { en: 'constant', pos: 'adj.', cn: '持续不断的，恒定的' },
        { en: 'institute', pos: 'n.', cn: '研究所，学院 v. 设立' },
        { en: 'institution', pos: 'n.', cn: '机构；制度' },
        { en: 'constitute', pos: 'v.', cn: '构成，组成；设立' },
        { en: 'constitution', pos: 'n.', cn: '宪法；构造' },
        { en: 'substitute', pos: 'v./n.', cn: '替代，代用品' },
        { en: 'resist', pos: 'v.', cn: '抵抗，抵制，忍住' },
        { en: 'persist', pos: 'v.', cn: '坚持不懈，执意；持续' }
      ]
    },
    leg: {
      root: 'leg / lect',
      meaning: '采集，挑选，读，法律',
      desc: '源自拉丁语 legere，表达选举、收集、阅读与合法',
      words: [
        { en: 'elect', pos: 'v.', cn: '选举，推选' },
        { en: 'election', pos: 'n.', cn: '选举' },
        { en: 'collect', pos: 'v.', cn: '收集，搜集' },
        { en: 'neglect', pos: 'v./n.', cn: '忽视，疏忽' },
        { en: 'eligible', pos: 'adj.', cn: '合格的，有资格的' },
        { en: 'legible', pos: 'adj.', cn: '清晰可读的' },
        { en: 'lecture', pos: 'n./v.', cn: '讲座，演讲' }
      ]
    },
    sci: {
      root: 'sci',
      meaning: '知道，晓得，知识',
      desc: '源自拉丁语 scire，表达科学、清醒意识与良知',
      words: [
        { en: 'science', pos: 'n.', cn: '科学，自然科学' },
        { en: 'scientific', pos: 'adj.', cn: '科学的' },
        { en: 'conscious', pos: 'adj.', cn: '有知觉的，有意识的' },
        { en: 'consciousness', pos: 'n.', cn: '意识，知觉' },
        { en: 'conscience', pos: 'n.', cn: '良心，良知' },
        { en: 'conscientious', pos: 'adj.', cn: '勤勉认真的，尽责的' },
        { en: 'subconscious', pos: 'adj.', cn: '潜意识的' }
      ]
    },
    vis: {
      root: 'vis / vid',
      meaning: '看，看见，目睹',
      desc: '源自拉丁语 videre，表达视觉、修改、预见与监督',
      words: [
        { en: 'visible', pos: 'adj.', cn: '可见的，明显的' },
        { en: 'vision', pos: 'n.', cn: '视力，远见，视野' },
        { en: 'visual', pos: 'adj.', cn: '视觉的，视力的' },
        { en: 'revise', pos: 'v.', cn: '修改，修订，复习' },
        { en: 'revision', pos: 'n.', cn: '修改，修订' },
        { en: 'supervise', pos: 'v.', cn: '监督，管理，指导' },
        { en: 'supervisor', pos: 'n.', cn: '主管，导师' },
        { en: 'provide', pos: 'v.', cn: '提供，供给' },
        { en: 'envision', pos: 'v.', cn: '设想，展望' }
      ]
    },
    grad: {
      root: 'grad / gress',
      meaning: '步，走，级，阶梯',
      desc: '源自拉丁语 gradi，表达进步、渐进、攻击与回归',
      words: [
        { en: 'progress', pos: 'n./v.', cn: '进步，进展' },
        { en: 'progressive', pos: 'adj.', cn: '进步的，逐步的' },
        { en: 'gradual', pos: 'adj.', cn: '逐渐的，渐进的' },
        { en: 'graduate', pos: 'v.', cn: '毕业 n. 毕业生' },
        { en: 'aggressive', pos: 'adj.', cn: '侵略性的，好斗的；有进取心的' },
        { en: 'congress', pos: 'n.', cn: '国会，代表大会' },
        { en: 'regress', pos: 'v.', cn: '倒退，退化' }
      ]
    },
    cred: {
      root: 'cred',
      meaning: '相信，信任',
      desc: '源自拉丁语 credere，表达信任、凭证与轻信',
      words: [
        { en: 'credible', pos: 'adj.', cn: '可信的，可靠的' },
        { en: 'incredible', pos: 'adj.', cn: '不可思议的，难以置信的' },
        { en: 'credit', pos: 'n.', cn: '信用；赞许；学分' },
        { en: 'credulous', pos: 'adj.', cn: '轻信的，易受骗的' },
        { en: 'credentials', pos: 'n.', cn: '凭证，资格证明' }
      ]
    },
    plic: {
      root: 'plic / ply',
      meaning: '重叠，折叠，倍数',
      desc: '源自拉丁语 plicare，表达应用、暗示、复制与复杂',
      words: [
        { en: 'apply', pos: 'v.', cn: '申请；应用，适用' },
        { en: 'application', pos: 'n.', cn: '申请；应用' },
        { en: 'imply', pos: 'v.', cn: '暗示，暗指' },
        { en: 'implication', pos: 'n.', cn: '含意；可能的影响' },
        { en: 'comply', pos: 'v.', cn: '顺从，服从' },
        { en: 'replicate', pos: 'v.', cn: '复制，再现' },
        { en: 'complicated', pos: 'adj.', cn: '复杂的，难懂的' },
        { en: 'explicit', pos: 'adj.', cn: '清楚明确的，坦率的' },
        { en: 'implicit', pos: 'adj.', cn: '含蓄的，不言明的' }
      ]
    },
    voc: {
      root: 'voc / vok',
      meaning: '声音，呼喊，唤起',
      desc: '源自拉丁语 vocare，表达呼唤、倡导、挑衅与词汇',
      words: [
        { en: 'vocal', pos: 'adj.', cn: '声音的；直言不讳的' },
        { en: 'vocabulary', pos: 'n.', cn: '词汇量，词汇' },
        { en: 'advocate', pos: 'v./n.', cn: '拥护，提倡；拥护者' },
        { en: 'evoke', pos: 'v.', cn: '唤起，引起' },
        { en: 'invoke', pos: 'v.', cn: '援引，援用；唤起' },
        { en: 'provoke', pos: 'v.', cn: '激怒，挑衅，引发' }
      ]
    },
    liter: {
      root: 'liter',
      meaning: '文字，书写，文学',
      desc: '源自拉丁语 litera，表达文字、文学素养与字面义',
      words: [
        { en: 'literacy', pos: 'n.', cn: '读写能力，素养' },
        { en: 'literate', pos: 'adj.', cn: '有读写能力的，有文化的' },
        { en: 'illiterate', pos: 'adj.', cn: '文盲的，未受教育的' },
        { en: 'literal', pos: 'adj.', cn: '字面意义的，本义的' },
        { en: 'literally', pos: 'adv.', cn: '字面上，确实地' },
        { en: 'literature', pos: 'n.', cn: '文学，文献' },
        { en: 'literary', pos: 'adj.', cn: '文学的，适于文学作品的' }
      ]
    }
  };

  // ═══════════ CONFUSABLE PAIRS (考研高频形近/易混辨析) ═══════════
  var CONFUSABLE_LIST = [
    {
      words: ['perspective', 'prospective'],
      analysis: 'perspective (视角/观点，per-看透) 强调观察事物的角度与眼界；prospective (未来的/预期的，pro-向前) 强调未来的潜在可能性。'
    },
    {
      words: ['respectful', 'respective', 'respectable'],
      analysis: 'respectful (恭敬的，充满敬意)；respective (各自的，每个分别的)；respectable (体面的，值得受人尊敬的)。'
    },
    {
      words: ['stationary', 'stationery'],
      analysis: 'stationary (静止不动的，固定的，ary)；stationery (文具/信纸，ery，记忆法：e for envelope信封)。'
    },
    {
      words: ['complement', 'compliment', 'complementary'],
      analysis: 'complement (补充/互补物，ple满，填补缺憾)；compliment (称赞/奉承，i我喜欢赞美)；complementary 为互补的。'
    },
    {
      words: ['principal', 'principle'],
      analysis: 'principal (最重要的/校长/本金，pal朋友，校长是我的pal)；principle (原则/原理/道义，le结尾同rule规则)。'
    },
    {
      words: ['affect', 'effect', 'effective'],
      analysis: 'affect (常用动词，影响/假装)；effect (常用名词，结果/效应，have an effect on)；effective 为有效的。'
    },
    {
      words: ['conscious', 'conscience', 'conscientious'],
      analysis: 'conscious (有清醒意识的)；conscience (良心/良知)；conscientious (勤勉认真的，认认真真对得起良心)。'
    },
    {
      words: ['assure', 'ensure', 'insure'],
      analysis: 'assure (向某人打保票/使确信，后接人)；ensure (确保某事发生，后接宾语或that从句)；insure (给财产/人身投保)。'
    },
    {
      words: ['adapt', 'adopt', 'adept'],
      analysis: 'adapt (适应/改编，apt适宜)；adopt (采纳/收养，opt选择)；adept (熟练的/内行的，e同expert专家)。'
    },
    {
      words: ['access', 'excess', 'assess', 'accessible'],
      analysis: 'access (通道/入口/获得)；excess (过量/过度，ex-超过)；assess (评定/估算)；accessible 为易接近的。'
    },
    {
      words: ['continual', 'continuous'],
      analysis: 'continual (频频的/屡屡发生但中间有间隙的)；continuous (连续不断的/时空上没有停顿的)。'
    },
    {
      words: ['economic', 'economical'],
      analysis: 'economic (经济学的/国家经济上的)；economical (节约的/精打细算的/经济实惠的)。'
    },
    {
      words: ['historic', 'historical'],
      analysis: 'historic (具有重大历史意义的/载入史册的)；historical (历史上的/关于历史题材的)。'
    },
    {
      words: ['sensitive', 'sensible'],
      analysis: 'sensitive (敏感的/易受刺激的/善解人意的)；sensible (明智的/合乎情理的/通情达理的)。'
    },
    {
      words: ['credible', 'credulous', 'creditable'],
      analysis: 'credible (可信赖的/可靠的)；credulous (轻信的/易受欺骗的)；creditable (值得赞许的/虽不完美但可敬的)。'
    },
    {
      words: ['comprehensible', 'comprehensive'],
      analysis: 'comprehensible (容易理解的/易解的)；comprehensive (综合的/全面的/详尽的)。'
    },
    {
      words: ['exhausted', 'exhaustive'],
      analysis: 'exhausted (筋疲力尽的/耗尽的)；exhaustive (详尽无遗的/彻底全面的)。'
    },
    {
      words: ['eligible', 'illegible'],
      analysis: 'eligible (合格的/有资格的，leg选择)；illegible (难以辨认的/字迹模糊的，leg读)。'
    },
    {
      words: ['expand', 'expend', 'extend'],
      analysis: 'expand (体积/规模膨胀扩大)；expend (耗费/花费金钱精力)；extend (时间或空间线性延伸伸展)。'
    },
    {
      words: ['contact', 'contract', 'contrast'],
      analysis: 'contact (接触/联络)；contract (合同/收缩/感染)；contrast (对比/对照)。'
    },
    {
      words: ['conservation', 'conversation'],
      analysis: 'conservation (自然环境保护/守恒)；conversation (交谈/日常对话)。'
    },
    {
      words: ['immigrant', 'emigrant'],
      analysis: 'immigrant (从国外迁入的移民，im-进入)；emigrant (移居国外的移民，e-出去)。'
    },
    {
      words: ['intense', 'intensive'],
      analysis: 'intense (强烈的/剧烈的/感情深切的)；intensive (集中的/密集的/精深细致的，如intensive reading精读)。'
    },
    {
      words: ['invaluable', 'valuable', 'worthless'],
      analysis: 'invaluable (极珍贵的/无价之宝，in-表示极度珍贵无法标价)；valuable (有价值的)；worthless (一文不值的)。'
    },
    {
      words: ['distinct', 'distinctive'],
      analysis: 'distinct (清晰截然不同的/明确的)；distinctive (独具特色的/出众的)。'
    },
    {
      words: ['negligent', 'negligible'],
      analysis: 'negligent (疏忽大意的/失职的)；negligible (微不足道的/可以忽略不计的)。'
    },
    {
      words: ['eminent', 'imminent'],
      analysis: 'eminent (卓越的/显赫的/杰出的)；imminent (迫在眉睫的/即将来临的危难)。'
    },
    {
      words: ['curb', 'cure'],
      analysis: 'curb (控制/抑制狂奔势头，拉缰绳)；cure (治愈/疗法/消除弊端)。'
    },
    {
      words: ['collaborate', 'corroborate'],
      analysis: 'collaborate (合作/协同劳作，labor)；corroborate (证实/确证证据，robor强壮)。'
    },
    {
      words: ['impetus', 'impulse'],
      analysis: 'impetus (外部推动力/促进因素)；impulse (内部心理冲动/一时的心血来潮)。'
    },
    {
      words: ['demonstrate', 'remonstrate'],
      analysis: 'demonstrate (展示/证明/游行)；remonstrate (抗议/严正抗辩)。'
    },
    {
      words: ['shrink', 'shrug'],
      analysis: 'shrink (缩小/萎缩/退缩)；shrug (耸肩表示冷漠或不知所措)。'
    },
    {
      words: ['diminish', 'distinguish'],
      analysis: 'diminish (规模或影响力削弱变小)；distinguish (区分/辨别/使出众)。'
    },
    {
      words: ['literacy', 'literally'],
      analysis: 'literacy (阅读素养/读写能力)；literally (字面真实地/确实地)。'
    }
  ];

  // ═══════════ EXAM SYNONYMS (考研真题高频同义替换群) ═══════════
  var EXAM_SYNONYM_GROUPS = [
    {
      title: '激发 · 驱动 · 刺激',
      words: [
        { en: 'stimulate', pos: 'v.', cn: '激发；刺激' },
        { en: 'motivate', pos: 'v.', cn: '激励；激发' },
        { en: 'spur', pos: 'v.', cn: '鞭策；刺激' },
        { en: 'spark', pos: 'v.', cn: '引发；激起' },
        { en: 'provoke', pos: 'v.', cn: '挑起；激起' },
        { en: 'trigger', pos: 'v.', cn: '触发；引起' }
      ]
    },
    {
      title: '促进 · 提升 · 扶持',
      words: [
        { en: 'promote', pos: 'v.', cn: '促进；提升' },
        { en: 'foster', pos: 'v.', cn: '培养；促进' },
        { en: 'boost', pos: 'v.', cn: '推动；增强' },
        { en: 'nurture', pos: 'v.', cn: '扶持；培植' },
        { en: 'advance', pos: 'v.', cn: '推动；前进' },
        { en: 'facilitate', pos: 'v.', cn: '促进；使便利' }
      ]
    },
    {
      title: '令人畏惧 · 艰巨严峻',
      words: [
        { en: 'formidable', pos: 'adj.', cn: '令人生畏的；难对付的' },
        { en: 'daunting', pos: 'adj.', cn: '使人退缩的；艰巨的' },
        { en: 'intimidating', pos: 'adj.', cn: '吓人的；令人胆怯的' },
        { en: 'challenging', pos: 'adj.', cn: '充满挑战的；艰难的' }
      ]
    },
    {
      title: '不情愿 · 勉强迟疑',
      words: [
        { en: 'reluctant', pos: 'adj.', cn: '不情愿的；勉强的' },
        { en: 'unwilling', pos: 'adj.', cn: '不愿意的；非自愿的' },
        { en: 'hesitant', pos: 'adj.', cn: '犹豫的；迟疑不决的' },
        { en: 'loath', pos: 'adj.', cn: '极不情愿的；厌恶的' }
      ]
    },
    {
      title: '控制 · 抑制 · 约束',
      words: [
        { en: 'curb', pos: 'v.', cn: '抑制；控制' },
        { en: 'restrain', pos: 'v.', cn: '克制；抑制' },
        { en: 'restrict', pos: 'v.', cn: '限制；约束' },
        { en: 'inhibit', pos: 'v.', cn: '阻碍；抑制' },
        { en: 'suppress', pos: 'v.', cn: '镇压；抑制' }
      ]
    },
    {
      title: '缩小 · 减少 · 衰减',
      words: [
        { en: 'shrink', pos: 'v.', cn: '缩小；减少' },
        { en: 'diminish', pos: 'v.', cn: '减少；削弱' },
        { en: 'dwindle', pos: 'v.', cn: '逐渐变小；缩减' },
        { en: 'contract', pos: 'v.', cn: '收缩；缩减' },
        { en: 'lessen', pos: 'v.', cn: '减轻；变少' }
      ]
    },
    {
      title: '至关重要 · 核心必不可少',
      words: [
        { en: 'vital', pos: 'adj.', cn: '生死攸关的；关键的' },
        { en: 'crucial', pos: 'adj.', cn: '关键的；决定性的' },
        { en: 'essential', pos: 'adj.', cn: '必不可少的；本质的' },
        { en: 'critical', pos: 'adj.', cn: '极为重要的；关键的' },
        { en: 'indispensable', pos: 'adj.', cn: '不可或缺的' }
      ]
    },
    {
      title: '模糊 · 隐晦 · 掩盖',
      words: [
        { en: 'obscure', pos: 'adj./v.', cn: '鲜为人知的；掩盖' },
        { en: 'vague', pos: 'adj.', cn: '含糊的；模糊的' },
        { en: 'ambiguous', pos: 'adj.', cn: '模棱两可的' },
        { en: 'murky', pos: 'adj.', cn: '浑浊的；含糊不清的' },
        { en: 'conceal', pos: 'v.', cn: '隐瞒；隐藏' }
      ]
    },
    {
      title: '危害 · 危险 · 风险',
      words: [
        { en: 'hazard', pos: 'n.', cn: '危险；危害' },
        { en: 'peril', pos: 'n.', cn: '严重危险；祸患' },
        { en: 'jeopardy', pos: 'n.', cn: '危险；风险' },
        { en: 'danger', pos: 'n.', cn: '危险；威胁' },
        { en: 'threat', pos: 'n.', cn: '威胁；恐吓' }
      ]
    },
    {
      title: '放弃 · 抛弃 · 遗弃',
      words: [
        { en: 'abandon', pos: 'v.', cn: '离弃；抛弃' },
        { en: 'discard', pos: 'v.', cn: '丢弃；抛弃' },
        { en: 'desert', pos: 'v.', cn: '抛弃；擅离' },
        { en: 'forsake', pos: 'v.', cn: '背弃；摒绝' },
        { en: 'renounce', pos: 'v.', cn: '宣布放弃；断绝' }
      ]
    },
    {
      title: '真实 · 正宗 · 合法',
      words: [
        { en: 'genuine', pos: 'adj.', cn: '真正的；真诚的' },
        { en: 'authentic', pos: 'adj.', cn: '真正的；正宗的' },
        { en: 'legitimate', pos: 'adj.', cn: '合法的；正当的' }
      ]
    },
    {
      title: '协同 · 合作 · 配合',
      words: [
        { en: 'collaborate', pos: 'v.', cn: '合作；协作' },
        { en: 'cooperate', pos: 'v.', cn: '合作；配合' },
        { en: 'coordinate', pos: 'v.', cn: '协调；使配合' },
        { en: 'partner', pos: 'v.', cn: '合伙；结成伙伴' }
      ]
    },
    {
      title: '顺从 · 遵守 · 符合',
      words: [
        { en: 'comply', pos: 'v.', cn: '顺从；服从' },
        { en: 'conform', pos: 'v.', cn: '符合；顺应' },
        { en: 'adhere', pos: 'v.', cn: '坚持；遵守' },
        { en: 'abide', pos: 'v.', cn: '遵守；容忍' }
      ]
    },
    {
      title: '根除 · 消除 · 废除',
      words: [
        { en: 'eliminate', pos: 'v.', cn: '消除；根除' },
        { en: 'eradicate', pos: 'v.', cn: '根绝；拔除' },
        { en: 'abolish', pos: 'v.', cn: '废除；废止' },
        { en: 'remove', pos: 'v.', cn: '移开；消除' }
      ]
    },
    {
      title: '开创性 · 突破性',
      words: [
        { en: 'groundbreaking', pos: 'adj.', cn: '开创性的；突破性的' },
        { en: 'innovative', pos: 'adj.', cn: '创新的；革新的' },
        { en: 'pioneering', pos: 'adj.', cn: '先锋的；开创性的' },
        { en: 'revolutionary', pos: 'adj.', cn: '革命性的' }
      ]
    },
    {
      title: '教学 · 指导 · 训导',
      words: [
        { en: 'instruction', pos: 'n.', cn: '教学；指导' },
        { en: 'guidance', pos: 'n.', cn: '指导；引导' },
        { en: 'pedagogy', pos: 'n.', cn: '教学法；教育学' },
        { en: 'direction', pos: 'n.', cn: '方向；指导' }
      ]
    },
    {
      title: '推断 · 演绎 · 结论',
      words: [
        { en: 'infer', pos: 'v.', cn: '推断；推定' },
        { en: 'deduce', pos: 'v.', cn: '演绎；推论' },
        { en: 'conclude', pos: 'v.', cn: '推断出；下结论' },
        { en: 'surmise', pos: 'v.', cn: '推测；猜测' }
      ]
    },
    {
      title: '共识 · 一致意见',
      words: [
        { en: 'consensus', pos: 'n.', cn: '共识；一致意见' },
        { en: 'accord', pos: 'n.', cn: '协议；一致' },
        { en: 'unanimity', pos: 'n.', cn: '全体一致；无异议' }
      ]
    }
  ];

  // ═══════════ HANDCRAFTED DECOMPOSITIONS (核心构词拆解与记忆公式) ═══════════
  var HANDCRAFTED_DECOMP = {
    'jurisdiction': {
      parts: [
        { type: 'root', text: 'juris', mean: '法律/裁判 (拉丁语 ius)' },
        { type: 'root', text: 'dict', mean: '言/宣告' },
        { type: 'suffix', text: '-ion', mean: '名词后缀' }
      ],
      meaning: '依法律行使宣布判决的权力 → 司法权；管辖权'
    },
    'verdict': {
      parts: [
        { type: 'root', text: 'ver', mean: '真实/客观' },
        { type: 'root', text: 'dict', mean: '言/宣告' }
      ],
      meaning: '审判后宣告的真实结论 → 裁定；判决'
    },
    'rehearsal': {
      parts: [
        { type: 'prefix', text: 're-', mean: '反复/再' },
        { type: 'root', text: 'hearse', mean: '排演/试演' },
        { type: 'suffix', text: '-al', mean: '名词后缀' }
      ],
      meaning: '正式表现前反复试演操练'
    },
    'instruction': {
      parts: [
        { type: 'prefix', text: 'in-', mean: '向内/入心' },
        { type: 'root', text: 'struct', mean: '建造/构建' },
        { type: 'suffix', text: '-ion', mean: '名词后缀' }
      ],
      meaning: '在心智内构建完整的知识与操作框架'
    },
    'vocabulary': {
      parts: [
        { type: 'root', text: 'voc / vocabul', mean: '声音/呼喊/字词' },
        { type: 'suffix', text: '-ary', mean: '集合名词后缀' }
      ],
      meaning: '脑中随时可调出的词汇工具箱'
    },
    'sophisticated': {
      parts: [
        { type: 'root', text: 'soph', mean: '智慧/精明' },
        { type: 'suffix', text: '-ist+-ic+-ated', mean: '复合形容词后缀' }
      ],
      meaning: '充满世事智慧与严谨构造的'
    },
    'stimulate': {
      parts: [
        { type: 'root', text: 'stimul', mean: '刺/尖针' },
        { type: 'suffix', text: '-ate', mean: '动词后缀' }
      ],
      meaning: '用尖刺恰到好处挑逗神经，激发主动思考'
    },
    'desert': {
      parts: [
        { type: 'prefix', text: 'de-', mean: '离开/去除' },
        { type: 'root', text: 'sert', mean: '连接/系结' }
      ],
      meaning: '与生命繁荣切断系结 -> 荒凉空旷之地 / 遗弃'
    },
    'cliche': {
      parts: [
        { type: 'root', text: 'cliché', mean: '铅字版撞击声(拟声)' }
      ],
      meaning: '源自印刷铅版反复套印，引申为磨损新鲜感的陈词滥调'
    },
    'description': {
      parts: [
        { type: 'prefix', text: 'de-', mean: '向下/详尽' },
        { type: 'root', text: 'script', mean: '写/描摹' },
        { type: 'suffix', text: '-ion', mean: '名词后缀' }
      ],
      meaning: '从头到尾详尽描摹，在脑中搭建真实场景'
    },
    'omission': {
      parts: [
        { type: 'prefix', text: 'o- (ob-)', mean: '出/离开' },
        { type: 'root', text: 'miss', mean: '送出/放走' },
        { type: 'suffix', text: '-ion', mean: '名词后缀' }
      ],
      meaning: '放任某物溜走未纳入系统 -> 遗漏；忽略'
    },
    'casual': {
      parts: [
        { type: 'root', text: 'cas', mean: '降临/发生' },
        { type: 'suffix', text: '-ual', mean: '形容词后缀' }
      ],
      meaning: '随遇而发生、不刻意端架子 -> 随意的；不正式的'
    },
    'preference': {
      parts: [
        { type: 'prefix', text: 'pre-', mean: '优先/提前' },
        { type: 'root', text: 'fer', mean: '带来/提出' },
        { type: 'suffix', text: '-ence', mean: '名词后缀' }
      ],
      meaning: '面对多选项时优先带上台面的选择 -> 偏好'
    },
    'promote': {
      parts: [
        { type: 'prefix', text: 'pro-', mean: '向前' },
        { type: 'root', text: 'mote / mov', mean: '移动/推动' }
      ],
      meaning: '扫清阻碍向前推进 -> 促进；提升'
    },
    'literacy': {
      parts: [
        { type: 'root', text: 'liter', mean: '文字/字母' },
        { type: 'suffix', text: '-acy', mean: '性质与综合能力' }
      ],
      meaning: '不仅识字，而且能准确解码、辨析现实文本的素养'
    },
    'infer': {
      parts: [
        { type: 'prefix', text: 'in-', mean: '向内/深入' },
        { type: 'root', text: 'fer', mean: '带来/运载' }
      ],
      meaning: '潜入文字线索底层，提炼未明说的逻辑必然 -> 推断'
    },
    'formidable': {
      parts: [
        { type: 'root', text: 'formid', mean: '恐惧/退缩' },
        { type: 'suffix', text: '-able', mean: '令人...的' }
      ],
      meaning: '庞大艰巨到让人第一反应退缩 -> 令人生畏的'
    },
    'primary': {
      parts: [
        { type: 'root', text: 'prim', mean: '第一/根基' },
        { type: 'suffix', text: '-ary', mean: '形容词后缀' }
      ],
      meaning: '奠定后续所有能力的基石阶段 -> 初级的；首要的'
    },
    'reluctant': {
      parts: [
        { type: 'prefix', text: 're-', mean: '反向/往后' },
        { type: 'root', text: 'luct', mean: '搏斗/抗拒' },
        { type: 'suffix', text: '-ant', mean: '形容词后缀' }
      ],
      meaning: '心里拉起警戒线拼命往后拽 -> 不情愿的'
    },
    'pedagogy': {
      parts: [
        { type: 'root', text: 'ped', mean: '儿童/少年' },
        { type: 'root', text: 'agog', mean: '引导/引领' },
        { type: 'suffix', text: '-y', mean: '学科/学问' }
      ],
      meaning: '引领年轻心智成长建构的系统图谱 -> 教学法'
    },
    'accompany': {
      parts: [
        { type: 'prefix', text: 'ac- (ad-)', mean: '去/朝向' },
        { type: 'root', text: 'company', mean: '同伴/同伙' }
      ],
      meaning: '去成为贴身同伴 -> 伴随；配合'
    },
    'curb': {
      parts: [
        { type: 'root', text: 'curb (courbe)', mean: '弯曲马嚼子/勒马绳' }
      ],
      meaning: '给失控狂奔的势头猛拉缰绳设立刚性边界 -> 抑制；控制'
    },
    'consensus': {
      parts: [
        { type: 'prefix', text: 'con-', mean: '共同/大家' },
        { type: 'root', text: 'sens', mean: '感觉/判断' },
        { type: 'suffix', text: '-us', mean: '名词后缀' }
      ],
      meaning: '所有人对核心原则产生同一共振 -> 共识；普遍看法'
    },
    'collaborate': {
      parts: [
        { type: 'prefix', text: 'col- (con-)', mean: '共同' },
        { type: 'root', text: 'labor', mean: '劳动/付出' },
        { type: 'suffix', text: '-ate', mean: '动词后缀' }
      ],
      meaning: '为同一目标共同投入脑力劳作 -> 合作；协作'
    },
    'diminish': {
      parts: [
        { type: 'prefix', text: 'di- (dis-)', mean: '分散/彻底' },
        { type: 'root', text: 'min', mean: '小/少' },
        { type: 'suffix', text: '-ish', mean: '使...化' }
      ],
      meaning: '从规模或影响力上彻底变小变弱 -> 减少；削弱'
    },
    'shrink': {
      parts: [
        { type: 'root', text: 'shrink', mean: '皱缩/收缩' }
      ],
      meaning: '因外力挤压或能量流失而体积收拢 -> 缩小；减少'
    },
    'coordinate': {
      parts: [
        { type: 'prefix', text: 'co-', mean: '共同' },
        { type: 'root', text: 'ordin', mean: '次序/队列' },
        { type: 'suffix', text: '-ate', mean: '动词后缀' }
      ],
      meaning: '让各方按共同节奏与秩序排列运转 -> 协调；配合'
    },
    'eliminate': {
      parts: [
        { type: 'prefix', text: 'e- (ex-)', mean: '出/门外' },
        { type: 'root', text: 'limin', mean: '门槛/界限' },
        { type: 'suffix', text: '-ate', mean: '动词后缀' }
      ],
      meaning: '毫不留情扫出大门门槛之外 -> 消除；根除'
    },
    'impetus': {
      parts: [
        { type: 'prefix', text: 'im- (in-)', mean: '朝向/进入' },
        { type: 'root', text: 'pet', mean: '追寻/冲击' },
        { type: 'suffix', text: '-us', mean: '名词后缀' }
      ],
      meaning: '像一股强劲冲力灌入系统 -> 推动力；刺激'
    },
    'demonstrate': {
      parts: [
        { type: 'prefix', text: 'de-', mean: '彻底/完全' },
        { type: 'root', text: 'monstr', mean: '展示/显现' },
        { type: 'suffix', text: '-ate', mean: '动词后缀' }
      ],
      meaning: '把逻辑或步骤原原本本摆在眼前证明给人看 -> 展示；证明'
    },
    'interpret': {
      parts: [
        { type: 'prefix', text: 'inter-', mean: '在...之间' },
        { type: 'root', text: 'pret', mean: '买卖中介/搭桥' }
      ],
      meaning: '在文本深意与读者理解之间搭桥引渡 -> 解读；阐释'
    },
    'replicate': {
      parts: [
        { type: 'prefix', text: 're-', mean: '再/重新' },
        { type: 'root', text: 'plic', mean: '折叠/加倍' },
        { type: 'suffix', text: '-ate', mean: '动词后缀' }
      ],
      meaning: '重新折叠出一模一样的一份副本 -> 复制；再现'
    }
  };
  // ═══════════ MOMO RICH CONTENT EXPANSION (墨墨级词汇全景数据) ═══════════
  var EXAM_FREQ_MAP = {
    'jurisdiction': { freq: 9, stars: 4, tag: '高频法律考点' },
    'verdict': { freq: 7, stars: 3, tag: '常考词' },
    'abandon': { freq: 12, stars: 4, tag: '高频核心' },
    'abolish': { freq: 8, stars: 3, tag: '常考动词' },
    'radiate': { freq: 6, stars: 3, tag: '核心词' },
    'object': { freq: 24, stars: 5, tag: '命题极高频' },
    'objective': { freq: 18, stars: 5, tag: '阅读高频' },
    'judge': { freq: 15, stars: 4, tag: '核心常考' },
    'arbitrary': { freq: 9, stars: 4, tag: '阅读高频' },
    'stimulate': { freq: 14, stars: 4, tag: '阅读高频' },
    'prospect': { freq: 16, stars: 5, tag: '高频核心' },
    'inspect': { freq: 10, stars: 4, tag: '常考词' },
    'perspective': { freq: 22, stars: 5, tag: '命题极高频' },
    'distort': { freq: 11, stars: 4, tag: '阅读高频' },
    'reproduce': { freq: 13, stars: 4, tag: '阅读高频' },
    'scale': { freq: 20, stars: 5, tag: '熟词生义高频' },
    'court': { freq: 16, stars: 4, tag: '熟词生义常考' },
    'prompt': { freq: 15, stars: 4, tag: '高频核心' },
    'diminish': { freq: 12, stars: 4, tag: '阅读高频' },
    'shrink': { freq: 10, stars: 4, tag: '阅读高频' },
    'coordinate': { freq: 11, stars: 4, tag: '常考动词' },
    'eliminate': { freq: 14, stars: 4, tag: '高频核心' },
    'promote': { freq: 19, stars: 5, tag: '命题高频' },
    'curb': { freq: 9, stars: 4, tag: '高频动词' },
    'consensus': { freq: 15, stars: 4, tag: '阅读极高频' },
    'collaborate': { freq: 8, stars: 3, tag: '核心词' },
    'hesitate': { freq: 7, stars: 3, tag: '核心词' },
    'assassinate': { freq: 5, stars: 2, tag: '常考词' },
    'ambition': { freq: 13, stars: 4, tag: '阅读高频' },
    'chaos': { freq: 9, stars: 4, tag: '常考词' },
    'fatigue': { freq: 8, stars: 3, tag: '核心词' }
  };

  var EXAM_TRICK_WORDS = {
    'court': { trickPos: 'v.', trickMean: '招致；求取；献殷勤', trapNote: '真题常考 court disaster (自招灾祸)，而非“法庭”' },
    'scale': { trickPos: 'v.', trickMean: '攀登；翻越', trapNote: '真题考查 scale the heights (攀登高峰)，而非“规模”' },
    'entertain': { trickPos: 'v.', trickMean: '怀有，抱有 (想法/希望)', trapNote: '阅读常考 entertain a belief (怀有信念)，而非“娱乐”' },
    'company': { trickPos: 'n.', trickMean: '陪伴；交往；伴侣', trapNote: '真题考查 keep sb company (陪伴某人)，而非“公司”' },
    'prompt': { trickPos: 'v.', trickMean: '促使，推动；提示', trapNote: '真题高频考察 prompt sb to act (促使某人行动)' },
    'desert': { trickPos: 'v.', trickMean: '抛弃，擅离 (职守)', trapNote: '阅读常考 desert one’s post / duty，而非“沙漠”' },
    'novel': { trickPos: 'adj.', trickMean: '新颖的，前所未有的', trapNote: '阅读常考 a novel solution / approach，而非“小说”' },
    'observe': { trickPos: 'v.', trickMean: '遵守 (法规/习俗)；评述', trapNote: '阅读常考 observe regulations / rules，而非“观察”' },
    'champion': { trickPos: 'v.', trickMean: '支持，拥护，捍卫', trapNote: '真题考查 champion the cause of (捍卫...事业)，而非“冠军”' },
    'harbor': { trickPos: 'v.', trickMean: '心怀，怀有 (恶意/疑虑)', trapNote: '常考 harbor doubts / suspicions (心存疑虑)，而非“海港”' },
    'object': { trickPos: 'v.', trickMean: '反对；提出异议', trapNote: '阅读最爱考 object to (doing) sth，而非“物体”' }
  };

  var MNEMONIC_HACKS = {
    'abandon': '【抓手巧记】a (一个) + bandon (拼音: 绊倒) → 赶路被绊倒后，干脆把身上的行囊都丢弃了 → 放弃，遗弃',
    'abolish': '【趣味谐音】啊暴力死 → 用革命暴力手段把陈规旧俗彻底终结掉 → 废除，取消',
    'pest': '【趣味谐音】拍死它！看到苍蝇蚊子害虫就必须一巴掌拍死它 → 害虫，讨厌的人',
    'exhaust': '【趣味谐音】一个搞死它 → 把身体的精力和体力一次性全部榨干搞死 → 耗尽，使精疲力竭',
    'hesitate': '【拆词巧记】he (他) + sit (坐着) + ate (吃) → 他坐在一边慢吞吞吃一边发呆拿不定主意 → 犹豫，迟疑',
    'assassinate': '【拆词巧记】ass (驴) + ass (驴) + in (在...里) + ate (吃) → 两头驴在帐篷里面吃草时遭遇了突然暗算 → 暗杀，行刺',
    'ambition': '【趣味谐音】俺必胜！心怀大志、充满野心的人每天都在心底高呼俺必胜 → 雄心，野心',
    'chaos': '【趣味谐音】吵死！现场一片混乱，到处都在吵闹大喊吵死了 → 混乱，无序',
    'morbid': '【趣味谐音】毛病的 → 身上心理全是各种怪毛病的 → 病态的，不健康的',
    'ponder': '【趣味联想】胖的 (ponder) → 那个微胖的人整天都在托腮深思如何科学减脂 → 沉思，深思',
    'frown': '【趣味联想】寒风 (f) 吹过来冷得让小朗 (rown) 紧紧皱起眉头 → 皱眉',
    'scold': '【趣味拆词】s + cold (冰冷) → 摆出一张冷若冰霜的死脸严厉训斥你 → 责骂，训斥',
    'fatigue': '【趣味谐音】法体格 → 身体法力与体格全部透支耗尽 → 疲劳，劳累',
    'drowsy': '【趣味联想】扰睡 (drow) + sy → 睡意被打破但依然极其困顿乏力 → 昏昏欲睡的',
    'arbitrary': '【抓手联想】arbitra (仲裁人) + -ry → 专制裁判官单凭个人主观随心所欲断案 → 随心所欲的，专断的',
    'prospect': '【抓手联想】pro- (向前) + spect (看) → 眼睛往前看能看到的美好前景与展望 → 前景，前途',
    'distort': '【抓手联想】dis- (偏离) + tort (扭曲) → 偏离了原本客观事实并加以扭转 → 扭曲，曲解'
  };

  var EXAM_COLLOCATIONS = {
    'jurisdiction': [
      { en: 'have / exercise jurisdiction over', cn: '对...拥有/行使管辖权 (真题核心短语)' },
      { en: 'under the jurisdiction of', cn: '在...的管辖范围内' },
      { en: 'appellate jurisdiction', cn: '上诉管辖权' }
    ],
    'verdict': [
      { en: 'reach / deliver a verdict', cn: '达成/宣布裁决' },
      { en: 'return a verdict of guilty', cn: '裁定有罪' }
    ],
    'abandon': [
      { en: 'abandon oneself to', cn: '沉溺于；放纵于' },
      { en: 'with abandon', cn: '放任地；放纵自流' }
    ],
    'abolish': [
      { en: 'abolish the death penalty', cn: '废除死刑' },
      { en: 'abolish trade tariffs', cn: '取消贸易关税' }
    ],
    'object': [
      { en: 'object to (doing) sth', cn: '反对做某事 (真题高频考点)' },
      { en: 'raise an objection to', cn: '对...提出强烈异议' }
    ],
    'objective': [
      { en: 'achieve / fulfill the objective', cn: '达成预定目标' },
      { en: 'objective reality / evaluation', cn: '客观现实 / 客观公正的评价' }
    ],
    'prompt': [
      { en: 'prompt sb to do sth', cn: '促使 / 激励某人做某事' },
      { en: 'a prompt response / decision', cn: '迅速的回应 / 果断的决定' }
    ],
    'scale': [
      { en: 'on a global / massive scale', cn: '在大规模 / 全球范围内' },
      { en: 'scale back / down budget', cn: '缩减预算；调低比例' }
    ],
    'stimulate': [
      { en: 'stimulate economic growth', cn: '刺激经济增长 (真题核心考点)' },
      { en: 'stimulate critical thinking', cn: '激发批判性思维' }
    ],
    'prospect': [
      { en: 'in prospect', cn: '在展望中；有望发生' },
      { en: 'bright career / market prospects', cn: '光明的职业前景 / 市场远景' }
    ],
    'arbitrary': [
      { en: 'arbitrary decision / exercise of power', cn: '武断的决定 / 专断行使权力' },
      { en: 'arbitrary standard', cn: '随意设定的标准' }
    ],
    'diminish': [
      { en: 'diminish in importance / influence', cn: '重要性 / 影响力减弱' },
      { en: 'law of diminishing returns', cn: '边际效益递减规律' }
    ],
    'shrink': [
      { en: 'shrink from responsibility / doing sth', cn: '回避责任；退缩不前' },
      { en: 'shrink by ... percent', cn: '缩减了...百分比' }
    ]
  };

  var CORE_IPA_MAP = {
    'jurisdiction': { uk: 'ˌdʒʊərɪsˈdɪkʃn', us: 'ˌdʒʊrɪsˈdɪkʃn' },
    'verdict': { uk: 'ˈvɜːdɪkt', us: 'ˈvɜːrdɪkt' },
    'abandon': { uk: 'əˈbændən', us: 'əˈbændən' },
    'abolish': { uk: 'əˈbɒlɪʃ', us: 'əˈbɑːlɪʃ' },
    'radiate': { uk: 'ˈreɪdieɪt', us: 'ˈreɪdieɪt' },
    'object': { uk: 'ˈɒbdʒɪkt', us: 'ˈɑːbdʒekt' },
    'objective': { uk: 'əbˈdʒektɪv', us: 'əbˈdʒektɪv' },
    'judge': { uk: 'dʒʌdʒ', us: 'dʒʌdʒ' },
    'arbitrary': { uk: 'ˈɑːbɪtrəri', us: 'ˈɑːrbətreri' },
    'inspect': { uk: 'ɪnˈspekt', us: 'ɪnˈspekt' },
    'prospect': { uk: 'ˈprɒspekt', us: 'ˈprɑːspekt' },
    'perspective': { uk: 'pəˈspektɪv', us: 'pərˈspektɪv' },
    'stimulate': { uk: 'ˈstɪmjuleɪt', us: 'ˈstɪmjuleɪt' },
    'diminish': { uk: 'dɪˈmɪnɪʃ', us: 'dɪˈmɪnɪʃ' },
    'shrink': { uk: 'ʃrɪŋk', us: 'ʃrɪŋk' },
    'prompt': { uk: 'prɒmpt', us: 'prɑːmpt' },
    'scale': { uk: 'skeɪl', us: 'skeɪl' },
    'court': { uk: 'kɔːt', us: 'kɔːrt' },
    'distort': { uk: 'dɪˈstɔːt', us: 'dɪˈstɔːrt' },
    'reproduce': { uk: 'ˌriːprəˈdjuːs', us: 'ˌriːprəˈduːs' },
    'coordinate': { uk: 'kəʊˈɔːdɪneɪt', us: 'koʊˈɔːrdɪneɪt' },
    'eliminate': { uk: 'ɪˈlɪmɪneɪt', us: 'ɪˈlɪmɪneɪt' },
    'promote': { uk: 'prəˈməʊt', us: 'prəˈmoʊt' },
    'curb': { uk: 'kɜːb', us: 'kɜːrb' },
    'consensus': { uk: 'kənˈsensəs', us: 'kənˈsensəs' },
    'collaborate': { uk: 'kəˈlæbəreɪt', us: 'kəˈlæbəreɪt' }
  };



    // ═══════════ CORE MORPHOLOGY ROOTS (考研核心高频词根库) ═══════════
  var CORE_ROOT_LIST = [
    { r: 'spect', m: '看/视' }, { r: 'spic', m: '看/视' },
    { r: 'dict', m: '说/言' }, { r: 'dic', m: '说/言' },
    { r: 'tract', m: '拉/拽/抽' },
    { r: 'port', m: '运/带/搬' },
    { r: 'press', m: '压/逼' },
    { r: 'struct', m: '建造/构建' }, { r: 'stru', m: '构建' },
    { r: 'vers', m: '转/反转' }, { r: 'vert', m: '转/转换' },
    { r: 'cess', m: '走/退让' }, { r: 'ced', m: '走/退让' }, { r: 'ceed', m: '前进/走' },
    { r: 'ject', m: '投/掷/扔' },
    { r: 'tend', m: '伸展/趋向' }, { r: 'tens', m: '伸展/拉紧' }, { r: 'tent', m: '伸展/维持' },
    { r: 'vent', m: '来/发生' }, { r: 'ven', m: '来/到达' },
    { r: 'rupt', m: '破裂/断绝' },
    { r: 'pel', m: '推/驱使' }, { r: 'puls', m: '推/驱动' },
    { r: 'gen', m: '产生/生育/基因' }, { r: 'gener', m: '出生/种类' },
    { r: 'duc', m: '引导/带来' }, { r: 'duct', m: '引导/传导' },
    { r: 'fer', m: '带来/承受/运' },
    { r: 'vis', m: '看/看见' }, { r: 'vid', m: '看/清楚' },
    { r: 'mit', m: '发送/委派/放行' }, { r: 'miss', m: '发送/释放' },
    { r: 'pos', m: '放置/摆放' }, { r: 'posit', m: '放置/定位' }, { r: 'pon', m: '放置' },
    { r: 'cur', m: '跑/发生/流动' }, { r: 'curs', m: '跑/流动' },
    { r: 'sens', m: '感觉/意识' }, { r: 'sent', m: '感觉/认同' },
    { r: 'cap', m: '抓/拿/头' }, { r: 'cept', m: '抓取/接受' }, { r: 'ceiv', m: '接受/领悟' },
    { r: 'fac', m: '做/制造' }, { r: 'fec', m: '做/影响' }, { r: 'fic', m: '做/产生' },
    { r: 'tort', m: '扭曲/纠缠' },
    { r: 'tain', m: '拿住/保持' }, { r: 'ten', m: '握住/持续' },
    { r: 'fin', m: '界限/终结' },
    { r: 'flu', m: '流动/流淌' }, { r: 'flux', m: '流动' },
    { r: 'solv', m: '解开/松开' }, { r: 'solu', m: '解开/溶解' },
    { r: 'leg', m: '读/选/法律' }, { r: 'lect', m: '挑选/汇集/读' },
    { r: 'voc', m: '声音/召唤' }, { r: 'vok', m: '喊/呼唤' },
    { r: 'sta', m: '站立/稳定' }, { r: 'stat', m: '建立/站立' }, { r: 'stit', m: '设立/放置' },
    { r: 'pend', m: '悬挂/衡量/支出' }, { r: 'pens', m: '支付/衡量' },
    { r: 'aud', m: '听/听觉' }, { r: 'audit', m: '听/审计' },
    { r: 'plic', m: '折叠/重叠' }, { r: 'ply', m: '重叠/折叠' }
  ];

  // ═══════════ UNIVERSAL AFFIX KNOWLEDGE BASE (通用词缀拆解引擎) ═══════════
  var PREFIX_LIST = [
    { p: 'counter', m: '反向/对应' }, { p: 'trans', m: '跨越/转变' }, { p: 'inter', m: '在...之间' },
    { p: 'super', m: '超级/在上' }, { p: 'under', m: '在...下/不足' }, { p: 'anti', m: '抗/反' },
    { p: 'fore', m: '前/先' }, { p: 'over', m: '过度/在上' }, { p: 'post', m: '在...后' },
    { p: 'sub', m: '在...下/次级' }, { p: 'pre', m: '提前/预先' }, { p: 'pro', m: '向前/赞同' },
    { p: 'con', m: '共同/加强' }, { p: 'com', m: '共同/加强' }, { p: 'col', m: '共同' },
    { p: 'dis', m: '分离/否定' }, { p: 'mis', m: '错误/不当' }, { p: 'out', m: '超出/向外' },
    { p: 'non', m: '非/无' }, { p: 'un', m: '不/未' }, { p: 'in', m: '向内/不' },
    { p: 'im', m: '向内/不' }, { p: 'ir', m: '不' }, { p: 'il', m: '不' },
    { p: 're', m: '反复/再/回' }, { p: 'de', m: '向下/去除' }, { p: 'ex', m: '向外/出' },
    { p: 'en', m: '使成为/进入' }, { p: 'em', m: '使处于' }, { p: 'ad', m: '朝向/去' },
    { p: 'ab', m: '离开/偏离' }, { p: 'se', m: '分开/脱离' }
  ];

  var SUFFIX_LIST = [
    { s: 'ization', m: '化(过程)', pos: 'n.' }, { s: 'isation', m: '化(过程)', pos: 'n.' },
    { s: 'ational', m: '具有...性质的', pos: 'adj.' }, { s: 'ibility', m: '可...性', pos: 'n.' },
    { s: 'ability', m: '能力/性质', pos: 'n.' }, { s: 'ication', m: '行为/动作', pos: 'n.' },
    { s: 'ically', m: '以...方式', pos: 'adv.' }, { s: 'ously', m: '充满...地', pos: 'adv.' },
    { s: 'ively', m: '倾向于...地', pos: 'adv.' }, { s: 'ation', m: '动作/过程', pos: 'n.' },
    { s: 'ition', m: '动作/状态', pos: 'n.' }, { s: 'ution', m: '行为/结果', pos: 'n.' },
    { s: 'sion', m: '行为/状态', pos: 'n.' }, { s: 'tion', m: '动作/状态', pos: 'n.' },
    { s: 'ment', m: '结果/行为', pos: 'n.' }, { s: 'ness', m: '状态/特性', pos: 'n.' },
    { s: 'ance', m: '性质/状态', pos: 'n.' }, { s: 'ence', m: '性质/状态', pos: 'n.' },
    { s: 'ship', m: '身份/关系', pos: 'n.' }, { s: 'hood', m: '时期/状态', pos: 'n.' },
    { s: 'able', m: '可...的', pos: 'adj.' }, { s: 'ible', m: '可...的', pos: 'adj.' },
    { s: 'less', m: '无...的', pos: 'adj.' }, { s: 'ful', m: '充满...的', pos: 'adj.' },
    { s: 'ical', m: '与...相关的', pos: 'adj.' }, { s: 'ous', m: '充满...的', pos: 'adj.' },
    { s: 'ive', m: '有...倾向的', pos: 'adj.' }, { s: 'ize', m: '使成为/化', pos: 'v.' },
    { s: 'ise', m: '使成为/化', pos: 'v.' }, { s: 'ify', m: '使...化', pos: 'v.' },
    { s: 'ate', m: '使发生/造成', pos: 'v.' }, { s: 'ist', m: '从事...者', pos: 'n.' },
    { s: 'ism', m: '主义/学说', pos: 'n.' }, { s: 'ity', m: '性质/状态', pos: 'n.' },
    { s: 'ian', m: '专业人员', pos: 'n.' }, { s: 'ant', m: '施动者/性质', pos: 'n./adj.' },
    { s: 'ent', m: '性质/人', pos: 'adj./n.' }, { s: 'ing', m: '进行/令人...的', pos: 'adj./n.' },
    { s: 'ed', m: '被...的/过去式', pos: 'adj.' }, { s: 'al', m: '具有...属性的', pos: 'adj./n.' },
    { s: 'ic', m: '相关的', pos: 'adj.' }, { s: 'ly', m: '以...方式', pos: 'adv.' },
    { s: 'ry', m: '行业/性质', pos: 'n.' }, { s: 'ty', m: '状态/性质', pos: 'n.' }
  ];

  // ═══════════ INDEX MAPS ═══════════
  var WORD_TO_ROOT = {};
  var ROOT_KEYS = Object.keys(ROOT_FAMILIES);
  for (var r = 0; r < ROOT_KEYS.length; r++) {
    var rKey = ROOT_KEYS[r];
    var fam = ROOT_FAMILIES[rKey];
    for (var w = 0; w < fam.words.length; w++) {
      var item = fam.words[w];
      WORD_TO_ROOT[item.en.toLowerCase()] = rKey;
    }
  }

  var WORD_TO_CONFUSE = {};
  for (var c = 0; c < CONFUSABLE_LIST.length; c++) {
    var pair = CONFUSABLE_LIST[c];
    for (var pw = 0; pw < pair.words.length; pw++) {
      WORD_TO_CONFUSE[pair.words[pw].toLowerCase()] = pair;
    }
  }

  var WORD_TO_SYNONYMS = {};
  for (var s = 0; s < EXAM_SYNONYM_GROUPS.length; s++) {
    var grp = EXAM_SYNONYM_GROUPS[s];
    for (var sw = 0; sw < grp.words.length; sw++) {
      WORD_TO_SYNONYMS[grp.words[sw].en.toLowerCase()] = grp;
    }
  }

  // ═══════════ POS REGISTRY & HEURISTIC ENGINE (墨墨级词性分析引擎) ═══════════
  var CURATED_POS = {
    'rehearsal': 'n.', 'instruction': 'n.', 'vocabulary': 'n.', 'sophisticated': 'adj.',
    'stimulate': 'v.', 'desert': 'adj./v.', 'cliche': 'n.', 'description': 'n.',
    'omission': 'n.', 'casual': 'adj.', 'preference': 'n.', 'promote': 'v.',
    'literacy': 'n.', 'infer': 'v.', 'formidable': 'adj.', 'primary': 'adj.',
    'reluctant': 'adj.', 'groundbreaking': 'adj.', 'commission': 'v./n.', 'pedagogy': 'n.',
    'accompany': 'v.', 'curb': 'v./n.', 'consensus': 'n.', 'collaborate': 'v.',
    'diminish': 'v.', 'shrink': 'v.', 'coordinate': 'v.', 'eliminate': 'v.',
    'demonstrate': 'v.', 'interpret': 'v.', 'impetus': 'n.', 'replicate': 'v.',
    'embed': 'v.', 'scale': 'n./v.', 'crisis': 'n.', 'suspicion': 'n.', 'satellite': 'n.',
    'mushroom': 'v./n.', 'inform': 'v.', 'illustrate': 'v.', 'urgency': 'n.',
    'endeavour': 'n./v.', 'astonish': 'v.', 'triumph': 'n./v.', 'streaming': 'n.',
    'spark': 'v./n.', 'profit': 'n./v.', 'boon': 'n.', 'pirate': 'n./v.', 'rip': 'v.',
    'surpass': 'v.', 'revenue': 'n.', 'margin': 'n.', 'piracy': 'n.', 'aid': 'n./v.',
    'consult': 'v.', 'plateau': 'n.', 'hoard': 'n./v.', 'gravel': 'n.', 'withdrawal': 'n.',
    'abandon': 'v.', 'abolish': 'v.', 'radiate': 'v.', 'judge': 'n./v.', 'prompt': 'adj./v.'
  };

  var VERB_CN_REGEX = /^(?:检查|视察|勘察|审查|勘探|造成|激发|促进|提升|提高|推断|伴随|提供|改善|保护|实现|影响|抵抗|消除|克服|包含|产生|减少|增加|支持|表达|展示|建立|评估|识别|探索|维持|破坏|控制|改变|处理|决定|解决|经历|委托|使|让|导致|建议|要求|禁止|吸引|连接|指导|适应|采纳|分析|调查|复制|嵌入|翻录|抑制|咨询|协调|囤积|超越|说明|阐释|证明|演示|引发|激起|缩小|削弱|加剧|加深|强化|推动|驱动|促使|妨碍|阻碍|损害|危害|侵蚀|消耗|耗尽|利用|开发|拓展|扩展|扩充|扩大|重现|再现|复兴|恢复|复苏|反驳|驳斥|批判|批评|指责|谴责|指控|证实|核实|确认|承认|否认|违背|违反|遵守|服从|遵从|顺从|屈服|投降|屈从|忍受|容忍|承担|享有|拥有|占据|占有|占用|分配|配置|分发|发布|公布|发表|出版|发行|广播|传播|收获|获取|取得|赢得|战胜|击败|跨越|穿透|看透|洞察|观察|审视|监视|监控|监督|督促|催促|呼吁|敦促|劝说|说服|劝阻|警告|告诫|提醒|提示|暗示|预示|预言|预测|设想|构想|想象|回忆|回顾|总结|概括|归纳|提炼|提倡|主张|宣称|声称|主导|引导|追随|跟踪|追踪|追溯|回溯|追求|谋求|争取|索取|索赔|赔偿|补偿|抵消|平衡|打消|排除|排斥|排挤|孤立|隔绝|隔离|封锁|封闭|围绕|涉及|关联|牵涉|卷入|介入|干预|干涉|插手|渗透|渗入|流入|涌入|涌现|浮现|浮出|显露|暴露|显现|展现|呈现|反映|映射|折射|投射|释放|排遣|舒缓|缓解|减轻|减缓|降低|减小|压缩|收缩|紧缩|紧逼|逼迫|迫使|强迫|执行|贯彻|实施|落实|践行|履行|实践|运作|运行|运转|操纵|操作|操控|管辖|治理|管理|规范|规定|界定|限定|限制|制约|克制|抑制|遏制|遏止|阻止|放弃|遗弃|放任|废除|取消|散发|流露|发出|反对|判断|促使|提示|认出|掩盖|遵守|过时|痴迷|获得|表明|显示|指出|揭示|透露|发现|寻找|拒绝|接受|允许|伤害|保卫|防御|攻击|反抗|抵制|合作|妥协|让步|调整|增强|恶化|好转|应对|遭受|缺乏|丧失|遗失|遗忘|思考|考虑|打算|企图|尝试|努力|坚持|停止|中断|继续|开展|进行|达成|领先|监督|审查|核查|解释|传达|传递|交流|沟通|讨论|辩论|称赞|赞美|鼓励|引起|诱发|形成|构成|设立|创造|制作|供应|收集|整理|分类|注视|关注|重视|轻视|蔑视|鄙视|分离|连接|牵连|转型|升级|衰退|繁荣|昌盛|爆发|发生|出现|消逝|灭亡|死亡|诞生|居住|停留|离开|离去|出发|到达|抵达|返回|归来|进入|移出|投入|付出|支出|节约|节省|保留|储存|增长|贬值|升值|投资|理财|借用|借贷|归还|偿还|赔付|惩治|惩罚)/;

  var NOUN_CN_REGEX = /^(?:目标|目的|客体|物体|物质|事物|人物|人员|群众|大众|社会|国家|政府|企业|组织|机构|系统|机制|平台|方案|计划|策略|政策|原则|规则|规律|规范|标准|理论|学说|概念|定义|观念|意识|思想|思维|智力|智慧|知识|科学|技术|信息|数据|证据|事实|真相|现实|情况|现状|环境|背景|条件|需求|需要|动力|动机|原因|理由|借口|结果|后果|效果|成果|成就|成功|失败|问题|困难|阻碍|障碍|危机|挑战|风险|威胁|冲突|矛盾|争议|纠纷|利益|好处|优势|劣势|缺点|短板|弱点|强项|特长|功能|作用|角色|地位|身份|权利|权力|义务|责任|使命|任务|指标|成绩|表现|水平|能力|技巧|技能|艺术|语言|文字|文化|传统|历史|时代|阶段|过程|时期|环节|步骤|细节|部分|整体|全局|局部|结构|框架|核心|基石|基础|源泉|源头|起源|根源|源由|期刊|杂志|报纸|书籍|著作|法官|裁判|记者|学者|专家|教授|学生|导师|读者|观众|听众|用户|客户|公众|陪审团|委员会|法庭|法案|法律|法规|条例|宪法|法度|司法|管辖|权限|行政)/;

  function detectSegmentPos(en, seg) {
    var raw = String(seg || '').trim();
    if (!raw) return 'n.';
    if (raw === '目的' || NOUN_CN_REGEX.test(raw)) return 'n.';
    if (raw.endsWith('的') || raw.endsWith('式的') || raw.endsWith('化的') || raw.endsWith('性的')) return 'adj.';
    if (raw.endsWith('地')) return 'adv.';
    if (VERB_CN_REGEX.test(raw)) return 'v.';
    if (/(?:ize|ise|ify|ate)$/.test(en) && !/(?:tion|ment|ness|ity)$/.test(en)) return 'v.';
    if (/(?:able|ible|ive|ic|ous|ful|less)$/.test(en)) return 'adj.';
    if (/(?:ly)$/.test(en)) return 'adv.';
    if (/(?:tion|sion|ment|ness|ity|ance|ence|ship|hood|ist|ism|er|or|ure|logy)$/.test(en)) return 'n.';
    return 'n.';
  }

  function detectWordPos(rawEn, rawCn) {
    var en = String(rawEn || '').toLowerCase().trim();
    var cn = String(rawCn || '').trim();
    if (CURATED_POS[en]) return CURATED_POS[en];
    if (en.indexOf(' ') !== -1 || (en.indexOf('-') !== -1 && !en.endsWith('ed') && !en.endsWith('able'))) return 'phrase';
    return detectSegmentPos(en, cn);
  }

  function getCleanPosClass(posStr) {
    var p = String(posStr || '').toLowerCase().trim();
    if (p.indexOf('adj') !== -1 || p === 'a.') return 'adj';
    if (p.indexOf('adv') !== -1 || p === 'ad.') return 'adv';
    if (p.indexOf('vt') !== -1) return 'vt';
    if (p.indexOf('vi') !== -1) return 'vi';
    if (p.indexOf('v') !== -1) return 'v';
    if (p.indexOf('n') !== -1) return 'n';
    if (p.indexOf('prep') !== -1) return 'prep';
    if (p.indexOf('conj') !== -1) return 'conj';
    if (p.indexOf('pron') !== -1) return 'pron';
    if (p.indexOf('phrase') !== -1 || p.indexOf('idiom') !== -1) return 'phrase';
    return 'n';
  }

  function formatDefinitions(cnText, enWord) {
    if (!cnText) return '';
    var raw = String(cnText).trim();
    var en = String(enWord || '').toLowerCase().trim();
    var posTokenRegex = /\b(vt\.|vi\.|v\.|n\.|adj\.|adv\.|prep\.|conj\.|pron\.|phrase|idiom|a\.|ad\.|num\.|art\.)/i;

    var rows = [];
    if (posTokenRegex.test(raw)) {
      var tokens = raw.split(/(?=\b(?:vt\.|vi\.|v\.|n\.|adj\.|adv\.|prep\.|conj\.|pron\.|phrase|idiom|a\.|ad\.|num\.|art\.)\s*)/i);
      for (var i = 0; i < tokens.length; i++) {
        var seg = tokens[i].trim();
        if (!seg) continue;
        var match = seg.match(/^([a-z]{1,6}\.)\s*(.*)$/i);
        if (match) {
          rows.push({ pos: match[1].toLowerCase(), text: match[2].trim() });
        } else {
          rows.push({ pos: detectWordPos(en, seg), text: seg });
        }
      }
    } else {
      // 智能分句与墨墨风格多义项聚合
      var parts = raw.split(/[；;]/).map(function(s) { return s.trim(); }).filter(Boolean);
      if (parts.length > 1) {
        var groups = [];
        var curGroup = null;
        for (var p = 0; p < parts.length; p++) {
          var part = parts[p];
          var detected = detectSegmentPos(en, part);
          if (!curGroup || curGroup.pos !== detected) {
            curGroup = { pos: detected, items: [part] };
            groups.push(curGroup);
          } else {
            curGroup.items.push(part);
          }
        }
        for (var g = 0; g < groups.length; g++) {
          rows.push({ pos: groups[g].pos, text: groups[g].items.join('；') });
        }
      } else {
        var singleInferred = detectWordPos(en, raw);
        rows.push({ pos: singleInferred, text: raw });
      }
    }

    if (!rows.length) rows.push({ pos: 'n.', text: raw });

    var html = '<div class="momo-def-group">';
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var cls = getCleanPosClass(row.pos);
      html += '<div class="momo-def-row">'
        + '<span class="momo-pos-pill momo-pos-' + cls + '">' + escapeHTML(row.pos || '释') + '</span>'
        + '<span class="momo-def-text">' + escapeHTML(row.text) + '</span>'
        + '</div>';
    }
    html += '</div>';
    return html;
  }

  // ═══════════ DECOMPOSITION / MNEMONIC ENGINE (构词拆解与记忆抓手) ═══════════
  function smartDecompose(rawWord, rawCn) {
    var word = String(rawWord || '').toLowerCase().trim();
    var cn = String(rawCn || '').trim();
    if (HANDCRAFTED_DECOMP[word]) {
      var hc = HANDCRAFTED_DECOMP[word];
      return { parts: hc.parts, meaning: hc.meaning || cn };
    }

    var pMatch = null, sMatch = null;
    for (var i = 0; i < PREFIX_LIST.length; i++) {
      var p = PREFIX_LIST[i];
      if (word.indexOf(p.p) === 0 && word.length >= p.p.length + 3) {
        pMatch = p;
        break;
      }
    }

    for (var j = 0; j < SUFFIX_LIST.length; j++) {
      var s = SUFFIX_LIST[j];
      if (word.length >= s.s.length + 3 && word.slice(word.length - s.s.length) === s.s) {
        if (!pMatch || (word.length >= pMatch.p.length + s.s.length + 2)) {
          sMatch = s;
          break;
        }
      }
    }

    var start = pMatch ? pMatch.p.length : 0;
    var end = sMatch ? word.length - sMatch.s.length : word.length;
    var stem = word.slice(start, end);

    // 探查核心词根 CORE_ROOT_LIST
    var rMatch = null;
    if (typeof CORE_ROOT_LIST !== 'undefined') {
      for (var cr = 0; cr < CORE_ROOT_LIST.length; cr++) {
        var candidateRoot = CORE_ROOT_LIST[cr];
        if (stem.indexOf(candidateRoot.r) !== -1) {
          rMatch = candidateRoot;
          break;
        }
      }
    }

    var parts = [];
    if (pMatch) parts.push({ type: 'prefix', text: pMatch.p + '-', mean: pMatch.m });
    if (rMatch) {
      parts.push({ type: 'root', text: stem, mean: rMatch.r + ': ' + rMatch.m });
    } else if (stem && stem.length >= 2) {
      parts.push({ type: 'root', text: stem, mean: '核心基干' });
    }
    if (sMatch) parts.push({ type: 'suffix', text: '-' + sMatch.s, mean: sMatch.m });

    if (!parts.length) {
      parts.push({ type: 'root', text: word, mean: '原生词源/基干' });
    }

    var formulaMean = cn || '';
    if (pMatch && rMatch) {
      formulaMean = pMatch.m + ' + ' + rMatch.m + ' → ' + (cn || '核心词义');
    } else if (rMatch) {
      formulaMean = rMatch.m + ' → ' + (cn || '引申词义');
    } else if (cn) {
      formulaMean = cn;
    } else {
      formulaMean = '核心词根引申演变';
    }

    return { parts: parts, meaning: formulaMean };
  }

  // ═══════════ SENTENCE KEYWORD HIGHLIGHTER ═══════════
  function highlightSentence(sentence, targetWord) {
    if (!sentence || !targetWord) return escapeHTML(sentence);
    var rawTarget = String(targetWord).trim().toLowerCase();
    if (rawTarget.length < 3) return escapeHTML(sentence);

    var stem = rawTarget;
    if (stem.endsWith('e') && stem.length > 3) stem = stem.slice(0, -1);
    else if (stem.endsWith('y') && stem.length > 3) stem = stem.slice(0, -1) + '(?:y|i)';

    var escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var pattern;
    try {
      pattern = new RegExp('\\b(' + escapedStem + '(?:s|es|ed|d|ing|ion|ive|able|al)?)\\b', 'gi');
    } catch(e) {
      return escapeHTML(sentence);
    }

    var str = String(sentence);
    var lastIdx = 0, html = '', match;
    while ((match = pattern.exec(str)) !== null) {
      html += escapeHTML(str.slice(lastIdx, match.index));
      html += '<mark class="vc-kw-mark">' + escapeHTML(match[0]) + '</mark>';
      lastIdx = pattern.lastIndex;
    }
    html += escapeHTML(str.slice(lastIdx));
    return html;
  }

  // ═══════════ MAIN LOOKUP & RENDER ═══════════
  function lookup(rawWord, optionalCn) {
    var word = String(rawWord || '').trim().toLowerCase();
    if (!word) return { hasNetwork: false, word: '' };

    var rootKey = WORD_TO_ROOT[word];
    var rootInfo = rootKey ? ROOT_FAMILIES[rootKey] : null;
    var confusable = WORD_TO_CONFUSE[word] || null;
    var synonyms = WORD_TO_SYNONYMS[word] || null;
    var decomp = smartDecompose(word, optionalCn || '');

    return {
      hasNetwork: true,
      word: word,
      root: rootInfo ? { root: rootInfo.root, meaning: rootInfo.meaning, desc: rootInfo.desc } : null,
      family: rootInfo ? rootInfo.words : [],
      confusable: confusable,
      synonyms: synonyms ? synonyms.words : [],
      synonymGroupTitle: synonyms ? synonyms.title : '',
      decomposition: decomp
    };
  }

  function renderNetworkHtml(rawWord, isShown, optionalCn) {
    var word = String(rawWord || '').trim().toLowerCase();
    var info = lookup(rawWord, optionalCn);
    if (!word) return '';

    var hiddenClass = isShown ? '' : ' recite-hidden';
    var html = '<div class="vc-word-network' + hiddenClass + '">';

    // 0. 词头音标与考频星级徽章 (Word Phonetics & Exam Frequency)
    var ipa = CORE_IPA_MAP[word];
    var freq = EXAM_FREQ_MAP[word] || { freq: 8, stars: 3, tag: '考研大纲核心词' };
    var starSvg = '';
    for (var st = 0; st < (freq.stars || 3); st++) {
      starSvg += '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="none" style="vertical-align:-1px;margin-right:1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
    html += '<div class="momo-meta-bar">'
      + '<span class="momo-freq-pill"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' + escapeHTML(freq.tag) + ' · 考频 ' + freq.freq + '次 ' + starSvg + '</span>'
      + (ipa ? '<span class="momo-ipa-tag">英 /' + escapeHTML(ipa.uk) + '/ · 美 /' + escapeHTML(ipa.us) + '/</span>' : '')
      + '</div>';

    // 1. 考研熟词生义专属警示卡 (Trap Sense Alert)
    if (EXAM_TRICK_WORDS[word]) {
      var trick = EXAM_TRICK_WORDS[word];
      html += '<div class="momo-trick-card">'
        + '<div class="momo-trick-hdr">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        + '<b>考研熟词生义 · 命题陷阱</b>'
        + '<span class="momo-trick-pos">' + escapeHTML(trick.trickPos) + '</span>'
        + '</div>'
        + '<div class="momo-trick-mean">' + escapeHTML(trick.trickMean) + '</div>'
        + '<div class="momo-trick-note">' + escapeHTML(trick.trapNote) + '</div>'
        + '</div>';
    }

    // 2. 趣味谐音与联想巧记 (Mnemonic Hacks)
    if (MNEMONIC_HACKS[word]) {
      html += '<div class="momo-hack-card">'
        + '<div class="momo-hack-hdr">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>'
        + '<span>墨式趣味联想 · 秒记抓手</span>'
        + '</div>'
        + '<div class="momo-hack-body">' + escapeHTML(MNEMONIC_HACKS[word]) + '</div>'
        + '</div>';
    }

    // 3. 构词拆解与记忆公式 (Morphology Formula)
    if (info.decomposition && info.decomposition.parts && info.decomposition.parts.length) {
      html += '<div class="vc-net-decomp">'
        + '<div class="vc-net-decomp-head">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
        + '<span>构词拆解 · 记忆公式</span>'
        + '</div>'
        + '<div class="vc-decomp-formula">';
      for (var p = 0; p < info.decomposition.parts.length; p++) {
        var part = info.decomposition.parts[p];
        if (p > 0) html += '<span class="vc-decomp-plus">+</span>';
        var pCls = (part.type === 'prefix') ? 'vc-decomp-prefix' : (part.type === 'suffix' ? 'vc-decomp-suffix' : 'vc-decomp-root');
        html += '<span class="vc-decomp-part ' + pCls + '">' + escapeHTML(part.text) + ' <small>(' + escapeHTML(part.mean) + ')</small></span>';
      }
      if (info.decomposition.meaning) {
        html += '<span class="vc-decomp-arrow">→</span><span class="vc-decomp-meaning">' + escapeHTML(info.decomposition.meaning) + '</span>';
      }
      html += '</div></div>';
    }

    // 4. 真题高频搭配与考点矩阵 (Collocations & Phrases)
    if (EXAM_COLLOCATIONS[word] && EXAM_COLLOCATIONS[word].length) {
      var collocs = EXAM_COLLOCATIONS[word];
      html += '<div class="momo-colloc-box">'
        + '<div class="momo-colloc-head">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
        + '<span>真题高频搭配 · 考点矩阵</span>'
        + '</div>'
        + '<div class="momo-colloc-list">';
      for (var c = 0; c < collocs.length; c++) {
        var cl = collocs[c];
        html += '<div class="momo-colloc-item" onclick="event.stopPropagation();if(typeof playCardWordAudio===&quot;function&quot;)playCardWordAudio(&quot;' + escapeHTML(cl.en) + '&quot;)" title="点击朗读搭配">'
          + '<span class="momo-colloc-en">' + escapeHTML(cl.en) + '</span>'
          + '<span class="momo-colloc-cn">' + escapeHTML(cl.cn) + '</span>'
          + '</div>';
      }
      html += '</div></div>';
    }

    // 5. 考研同义替换群 (Exam Synonyms)
    if (info.synonyms && info.synonyms.length) {
      html += '<div class="vc-net-synonyms">'
        + '<div class="vc-net-syn-head">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>'
        + '<span>真题同义替换 · ' + escapeHTML(info.synonymGroupTitle || '高频考点') + '</span>'
        + '</div>'
        + '<div class="vc-net-chips">';
      for (var s = 0; s < info.synonyms.length; s++) {
        var syn = info.synonyms[s];
        var isCurSyn = (syn.en.toLowerCase() === info.word);
        html += '<span class="vc-net-chip' + (isCurSyn ? ' current' : '') + '" onclick="event.stopPropagation();if(typeof playCardWordAudio===&quot;function&quot;)playCardWordAudio(&quot;' + escapeHTML(syn.en) + '&quot;)" title="点击朗读 ' + escapeHTML(syn.en) + '">'
          + '<b>' + escapeHTML(syn.en) + '</b>'
          + '<small>' + escapeHTML(syn.pos || '') + ' ' + escapeHTML(syn.cn || '') + '</small>'
          + '</span>';
      }
      html += '</div></div>';
    }

    // 6. 同根族词派生 (Word Family)
    if (info.root && info.family && info.family.length) {
      html += '<div class="vc-net-header" style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(7,83,106,.15);">'
        + '<span class="vc-net-tag">'
        + '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="9" x2="12" y2="3"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="12" x2="3" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>'
        + '同根衍生族 · <b>' + escapeHTML(info.root.root) + '</b>'
        + '</span>'
        + '<span class="vc-net-root-mean">' + escapeHTML(info.root.meaning) + '</span>'
        + '</div>';

      html += '<div class="vc-net-chips">';
      for (var i = 0; i < info.family.length; i++) {
        var member = info.family[i];
        var isCurrent = (member.en.toLowerCase() === info.word);
        html += '<span class="vc-net-chip' + (isCurrent ? ' current' : '') + '" onclick="event.stopPropagation();if(typeof playCardWordAudio===&quot;function&quot;)playCardWordAudio(&quot;' + escapeHTML(member.en) + '&quot;)" title="点击朗读 ' + escapeHTML(member.en) + '">'
          + '<b>' + escapeHTML(member.en) + '</b>'
          + '<small>' + escapeHTML(member.pos || '') + ' ' + escapeHTML(member.cn || '') + '</small>'
          + '</span>';
      }
      html += '</div>';
    }

    // 7. 形近辨析 (Confusables)
    if (info.confusable) {
      html += '<div class="vc-net-confuse">'
        + '<div class="vc-confuse-tag">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        + '<span>形近混淆排雷</span>'
        + '</div>'
        + '<div class="vc-confuse-text">' + escapeHTML(info.confusable.analysis) + '</div>'
        + '</div>';
    }

    html += '</div>';
    return html;
  }

  function install() {
    if (typeof document === 'undefined' || !document.getElementById || !document.head) return;
    if (!document.getElementById('wordNetworkStyles')) {
      var style = document.createElement('style');
      style.id = 'wordNetworkStyles';
      style.textContent =
        '.vc-word-network{margin:10px 0 12px;padding:10px 12px;background:rgba(255,255,255,.85);border:1px solid rgba(7,83,106,.14);border-radius:16px;box-shadow:0 4px 16px rgba(7,83,106,.05);text-align:left;animation:vc-net-fade .18s ease}' +
        '@keyframes vc-net-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}' +
        '.momo-def-group{display:flex;flex-direction:column;gap:7px;width:100%;margin:4px 0 12px;text-align:left}' +
        '.momo-def-row{display:flex;align-items:baseline;gap:8px;font-size:16.5px;line-height:1.45}' +
        '.momo-pos-pill{display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:850;padding:2px 7px;border-radius:6px;flex-shrink:0;line-height:1.2;text-transform:lowercase;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:.02em}' +
        '.momo-pos-n{color:#1d4ed8;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.24)}' +
        '.momo-pos-v,.momo-pos-vt,.momo-pos-vi{color:#047857;background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.24)}' +
        '.momo-pos-adj,.momo-pos-a{color:#b45309;background:rgba(217,119,6,.1);border:1px solid rgba(217,119,6,.24)}' +
        '.momo-pos-adv,.momo-pos-ad{color:#7c3aed;background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.24)}' +
        '.momo-pos-prep,.momo-pos-conj,.momo-pos-pron{color:#c026d3;background:rgba(192,38,211,.1);border:1px solid rgba(192,38,211,.24)}' +
        '.momo-pos-phrase,.momo-pos-idiom{color:#0e7490;background:rgba(14,116,144,.1);border:1px solid rgba(14,116,144,.24)}' +
        '.momo-def-text{color:var(--ink,#102a36);font-weight:700;flex:1;word-break:break-word}' +
        '.vc-net-header{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:7px;font-size:11px;font-weight:750;color:var(--deep,#07536a)}' +
        '.vc-net-tag{display:inline-flex;align-items:center;gap:3px}' +
        '.vc-net-root-mean{font-size:10.5px;color:var(--muted,#5f747d);font-weight:600}' +
        '.vc-net-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:3px}' +
        '.vc-net-chip{display:inline-flex;align-items:center;gap:3px;padding:2.5px 8px;border-radius:7px;background:rgba(7,83,106,.05);border:1px solid rgba(7,83,106,.12);font-size:11px;color:var(--ink,#102a36);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all 120ms ease}' +
        '.vc-net-chip:active{transform:scale(.95);background:rgba(7,83,106,.14)}' +
        '.vc-net-chip.current{background:rgba(7,83,106,.15);border-color:rgba(7,83,106,.38);font-weight:750;color:var(--deep,#07536a)}' +
        '.vc-net-chip b{font-weight:700}' +
        '.vc-net-chip small{font-size:9.5px;color:var(--muted,#5f747d)}' +
        '.vc-net-synonyms{margin-top:8px;padding:7px 10px;background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.22);border-radius:10px;font-size:11px}' +
        '.vc-net-syn-head{display:inline-flex;align-items:center;gap:3px;font-weight:800;color:#047857;margin-bottom:5px;font-size:10.5px}' +
        '.vc-net-decomp{margin-top:8px;padding:8px 10px;background:rgba(7,83,106,.04);border:1px dashed rgba(7,83,106,.22);border-radius:10px;font-size:11px}' +
        '.vc-net-decomp-head{display:inline-flex;align-items:center;gap:3px;font-weight:800;color:var(--deep,#07536a);margin-bottom:5px;font-size:10.5px}' +
        '.vc-decomp-formula{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font-size:11px;color:var(--ink,#102a36);line-height:1.45}' +
        '.vc-decomp-part{padding:1.5px 6px;border-radius:5px;background:#ffffff;border:1px solid rgba(7,83,106,.16);font-weight:700}' +
        '.vc-decomp-prefix{color:#059669}' +
        '.vc-decomp-root{color:#0284c7}' +
        '.vc-decomp-suffix{color:#7c3aed}' +
        '.vc-decomp-plus{color:#94a3b8;font-weight:800;font-size:11px}' +
        '.vc-decomp-arrow{color:#07536a;font-weight:800;margin:0 1px}' +
        '.vc-decomp-meaning{font-weight:700;color:#07536a}' +
        '.vc-net-confuse{margin-top:8px;padding:7px 10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.26);border-radius:10px;font-size:11px;line-height:1.45}' +
        '.vc-confuse-tag{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;color:#b45309;margin-bottom:3px}' +
        '.vc-confuse-text{color:#92400e;font-size:10.5px}' +
        '.vc-kw-mark{background:rgba(254,240,138,.65);color:#0c4a6e;font-weight:750;padding:1px 4px;border-radius:4px;border-bottom:2px solid #0284c7}' +
        '.vc-cn-note-hdr{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:800;color:#278275;margin-bottom:4px}' +
        '.vc-cn-note-body{font-size:12.5px;line-height:1.5;color:#31515e}' +
        '.recite-hidden{display:none}' +
        '.momo-meta-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;margin-bottom:9px;padding-bottom:7px;border-bottom:1px solid rgba(7,83,106,.1)}' +'.momo-freq-pill{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;background:rgba(234,88,12,.1);color:#ea580c;border:1px solid rgba(234,88,12,.22);font-size:11px;font-weight:800;letter-spacing:.02em}' +'.momo-ipa-tag{font-family:Menlo,Consolas,monospace;font-size:11.5px;color:#5f747d;font-weight:600;letter-spacing:.01em}' +'.momo-trick-card{margin:8px 0 10px;padding:9px 12px;background:linear-gradient(135deg,rgba(254,242,242,.95),rgba(255,237,213,.9));border:1.5px solid rgba(239,68,68,.3);border-radius:12px;box-shadow:0 3px 10px rgba(239,68,68,.08)}' +'.momo-trick-hdr{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:850;color:#b91c1c;margin-bottom:4px}' +'.momo-trick-pos{display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;background:#ef4444;color:#fff;font-size:10.5px;font-weight:900;margin-left:auto}' +'.momo-trick-mean{font-size:13.5px;font-weight:800;color:#991b1b;line-height:1.45;margin-bottom:3px}' +'.momo-trick-note{font-size:11.5px;color:#7f1d1d;line-height:1.4;opacity:.92}' +'.momo-hack-card{margin:8px 0 10px;padding:9px 11px;background:rgba(240,253,244,.9);border:1px solid rgba(34,197,94,.28);border-radius:12px;font-size:12px;line-height:1.5;color:#14532d}' +'.momo-hack-hdr{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:#16a34a;margin-bottom:3px}' +'.momo-hack-body{font-size:12px;color:#166534;font-weight:650}' +'.momo-colloc-box{margin:9px 0 10px;padding:8px 11px;background:rgba(238,242,255,.8);border:1px solid rgba(99,102,241,.22);border-radius:12px}' +'.momo-colloc-head{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:#4338ca;margin-bottom:6px}' +'.momo-colloc-list{display:flex;flex-direction:column;gap:5px}' +'.momo-colloc-item{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:3px 6px;border-radius:6px;background:rgba(255,255,255,.75);border:1px solid rgba(99,102,241,.12);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .12s ease}' +'.momo-colloc-item:active{background:rgba(99,102,241,.14)}' +'.momo-colloc-en{font-size:12px;font-weight:750;color:#312e81}' +'.momo-colloc-cn{font-size:11px;color:#475569}' +'.vocab-card.revealed,#view-groups.recite-view .vocab-card.revealed,#view-today-recite .vocab-card.revealed{touch-action:pan-y!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;scroll-behavior:smooth}' +'.vocab-card.revealed .vc-sentence-zone{touch-action:pan-y!important;overscroll-behavior:contain!important}';
      document.head.appendChild(style);
    }
  }

  global.WordNetwork = {
    ROOT_FAMILIES: ROOT_FAMILIES,
    CONFUSABLE_LIST: CONFUSABLE_LIST,
    EXAM_SYNONYM_GROUPS: EXAM_SYNONYM_GROUPS,
    formatDefinitions: formatDefinitions,
    detectWordPos: detectWordPos,
    highlightSentence: highlightSentence,
    lookup: lookup,
    renderNetworkHtml: renderNetworkHtml
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  }
})(window);