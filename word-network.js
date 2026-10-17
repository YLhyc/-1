(function(global) {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ═══════════ ROOT FAMILIES (考研核心同根词家族) ═══════════
  var ROOT_FAMILIES = {
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
      meaning: '拉，引，抽出',
      desc: '源自拉丁语 trahere，表达牵引、吸引、收缩与抽提',
      words: [
        { en: 'attract', pos: 'v.', cn: '吸引，引起' },
        { en: 'attractive', pos: 'adj.', cn: '有吸引力的' },
        { en: 'contract', pos: 'n.', cn: '合同 v. 收缩，感染' },
        { en: 'distract', pos: 'v.', cn: '分心，转移注意力' },
        { en: 'distraction', pos: 'n.', cn: '分心，干扰物' },
        { en: 'extract', pos: 'v.', cn: '提取，拔出 n. 榨出物' },
        { en: 'abstract', pos: 'adj.', cn: '抽象的 n. 摘要' },
        { en: 'subtract', pos: 'v.', cn: '减去，扣除' },
        { en: 'protract', pos: 'v.', cn: '延长，拖延' },
        { en: 'retract', pos: 'v.', cn: '撤回，缩回' },
        { en: 'intractable', pos: 'adj.', cn: '棘手的，难对付的' }
      ]
    },
    port: {
      root: 'port',
      meaning: '运，拿，港口',
      desc: '源自拉丁语 portare，引申为搬运、传达、携带与输出',
      words: [
        { en: 'export', pos: 'v./n.', cn: '出口，输出' },
        { en: 'import', pos: 'v./n.', cn: '进口，输入；重要性' },
        { en: 'transport', pos: 'v./n.', cn: '运输，客运' },
        { en: 'portable', pos: 'adj.', cn: '轻便的，手提式的' },
        { en: 'report', pos: 'v./n.', cn: '报告，报道' },
        { en: 'support', pos: 'v./n.', cn: '支持，支撑，抚养' },
        { en: 'deport', pos: 'v.', cn: '驱逐出境' }
      ]
    },
    scrib: {
      root: 'scrib / script',
      meaning: '写，刻写，记述',
      desc: '源自拉丁语 scribere，表达书写、记录、规定与归因',
      words: [
        { en: 'describe', pos: 'v.', cn: '描写，叙述' },
        { en: 'description', pos: 'n.', cn: '描述，说明书' },
        { en: 'prescribe', pos: 'v.', cn: '开处方；规定' },
        { en: 'prescription', pos: 'n.', cn: '处方，药方；法规' },
        { en: 'subscribe', pos: 'v.', cn: '订阅，赞成，签署' },
        { en: 'subscription', pos: 'n.', cn: '订阅费，签署' },
        { en: 'inscribe', pos: 'v.', cn: '题写，铭刻' },
        { en: 'manuscript', pos: 'n.', cn: '手稿，原稿' },
        { en: 'transcript', pos: 'n.', cn: '成绩单，文字记录' },
        { en: 'ascribe', pos: 'v.', cn: '把...归因于' }
      ]
    },
    dict: {
      root: 'dic / dict',
      meaning: '说，言，宣告',
      desc: '源自拉丁语 dicere，表达陈述、预言、指令与裁决',
      words: [
        { en: 'predict', pos: 'v.', cn: '预言，预测' },
        { en: 'prediction', pos: 'n.', cn: '预言，预报' },
        { en: 'dictate', pos: 'v.', cn: '听写，口述；指令' },
        { en: 'indicate', pos: 'v.', cn: '表明，指出，暗示' },
        { en: 'indicator', pos: 'n.', cn: '指标，指示器' },
        { en: 'contradict', pos: 'v.', cn: '反驳，与...相矛盾' },
        { en: 'contradiction', pos: 'n.', cn: '矛盾，驳斥' },
        { en: 'verdict', pos: 'n.', cn: '裁定，评决' },
        { en: 'dedicate', pos: 'v.', cn: '献身，奉献' },
        { en: 'jurisdiction', pos: 'n.', cn: '司法权，管辖范围' }
      ]
    },
    mit: {
      root: 'mit / miss',
      meaning: '送，放，派，放出',
      desc: '源自拉丁语 mittere，表达派发、许可、承担与传送',
      words: [
        { en: 'admit', pos: 'v.', cn: '承认，准许入内' },
        { en: 'admission', pos: 'n.', cn: '准许进入，入场费；承认' },
        { en: 'commit', pos: 'v.', cn: '承诺，犯(罪)，托付' },
        { en: 'commitment', pos: 'n.', cn: '承诺，许诺，奉献' },
        { en: 'committee', pos: 'n.', cn: '委员会' },
        { en: 'emit', pos: 'v.', cn: '散发，发射，排放' },
        { en: 'emission', pos: 'n.', cn: '散发，排放物' },
        { en: 'permit', pos: 'v.', cn: '允许，许可 n. 许可证' },
        { en: 'permission', pos: 'n.', cn: '允许，许可证' },
        { en: 'submit', pos: 'v.', cn: '屈服；提交，呈递' },
        { en: 'submission', pos: 'n.', cn: '投降；屈从；提交' },
        { en: 'transmit', pos: 'v.', cn: '传输，传播，传递' },
        { en: 'transmission', pos: 'n.', cn: '播送，发射，传动装置' },
        { en: 'omit', pos: 'v.', cn: '省略，省去，遗漏' },
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
        { en: 'contend', pos: 'v.', cn: '竞争，争夺；声称' },
        { en: 'contention', pos: 'n.', cn: '争论，论点' },
        { en: 'attend', pos: 'v.', cn: '出席，参加；照顾' },
        { en: 'attention', pos: 'n.', cn: '注意，专心，留心' },
        { en: 'attentive', pos: 'adj.', cn: '专心的，关心的' },
        { en: 'tense', pos: 'adj.', cn: '紧绷的，紧张的' },
        { en: 'tension', pos: 'n.', cn: '紧张，张力' },
        { en: 'intense', pos: 'adj.', cn: '强烈的，剧烈的' },
        { en: 'intensive', pos: 'adj.', cn: '密集的，深入的' }
      ]
    },
    fer: {
      root: 'fer',
      meaning: '带，拿，承载，转移',
      desc: '源自拉丁语 ferre，引申为传递、推断、差异与会议',
      words: [
        { en: 'differ', pos: 'v.', cn: '有差异，持不同看法' },
        { en: 'difference', pos: 'n.', cn: '差别，差异' },
        { en: 'different', pos: 'adj.', cn: '不同的' },
        { en: 'infer', pos: 'v.', cn: '推断，推论' },
        { en: 'inference', pos: 'n.', cn: '推断结果，结论' },
        { en: 'prefer', pos: 'v.', cn: '较喜欢，偏好' },
        { en: 'preference', pos: 'n.', cn: '偏爱，偏好' },
        { en: 'refer', pos: 'v.', cn: '参考，涉及，指的是' },
        { en: 'reference', pos: 'n.', cn: '参考，涉及，推荐信' },
        { en: 'transfer', pos: 'v./n.', cn: '调动，转移，转车' },
        { en: 'confer', pos: 'v.', cn: '商讨，协商；授予' },
        { en: 'conference', pos: 'n.', cn: '会议，讨论会' },
        { en: 'suffer', pos: 'v.', cn: '遭受，受苦' },
        { en: 'defer', pos: 'v.', cn: '推迟；顺从，听从' }
      ]
    },
    ceed: {
      root: 'ceed / ced / cess',
      meaning: '走，行走，让步，前进',
      desc: '源自拉丁语 cedere，表达前行、程序、让步与衰退',
      words: [
        { en: 'proceed', pos: 'v.', cn: '继续进行，前进' },
        { en: 'procedure', pos: 'n.', cn: '程序，手续，步骤' },
        { en: 'process', pos: 'n.', cn: '过程 v. 加工，处理' },
        { en: 'precede', pos: 'v.', cn: '在...之前，先于' },
        { en: 'precedent', pos: 'n.', cn: '先例，前例' },
        { en: 'unprecedented', pos: 'adj.', cn: '史无前例的，空前的' },
        { en: 'succeed', pos: 'v.', cn: '成功；继承，接替' },
        { en: 'success', pos: 'n.', cn: '成功' },
        { en: 'successor', pos: 'n.', cn: '继任者，继承人' },
        { en: 'access', pos: 'n.', cn: '通道，接入权 v. 访问' },
        { en: 'accessible', pos: 'adj.', cn: '易接近的，可使用的' },
        { en: 'exceed', pos: 'v.', cn: '超过，超出' },
        { en: 'excess', pos: 'n.', cn: '过多，过量' },
        { en: 'excessive', pos: 'adj.', cn: '过分的，过度的' },
        { en: 'recede', pos: 'v.', cn: '退后，逐渐减弱' },
        { en: 'recession', pos: 'n.', cn: '经济衰退，萧条期' },
        { en: 'concede', pos: 'v.', cn: '承认属实；让步' },
        { en: 'concession', pos: 'n.', cn: '让步，妥协' }
      ]
    },
    sta: {
      root: 'sta / stat / stit / sist',
      meaning: '立，站，稳固，驻留',
      desc: '源自拉丁语 stare，表达确立、稳定、机构与坚持',
      words: [
        { en: 'consist', pos: 'v.', cn: '由...组成，在于' },
        { en: 'consistent', pos: 'adj.', cn: '始终如一的，前后一致的' },
        { en: 'insist', pos: 'v.', cn: '坚持，强调' },
        { en: 'persist', pos: 'v.', cn: '坚持不懈，持续存在' },
        { en: 'persistent', pos: 'adj.', cn: '执着的，顽强的，持续的' },
        { en: 'resist', pos: 'v.', cn: '抵制，反抗，抵抗' },
        { en: 'resistance', pos: 'n.', cn: '阻力，抗拒，抵抗力' },
        { en: 'assist', pos: 'v.', cn: '帮助，协助' },
        { en: 'assistant', pos: 'n.', cn: '助手，助理' },
        { en: 'constitute', pos: 'v.', cn: '构成，组成；设立' },
        { en: 'constitution', pos: 'n.', cn: '宪法；体质；构造' },
        { en: 'institute', pos: 'n.', cn: '研究所，学院 v. 设立' },
        { en: 'institution', pos: 'n.', cn: '制度；社会公共机构' },
        { en: 'substitute', pos: 'v./n.', cn: '代替，替补品' },
        { en: 'stable', pos: 'adj.', cn: '稳定的，安定的' },
        { en: 'stability', pos: 'n.', cn: '稳定性' },
        { en: 'establish', pos: 'v.', cn: '建立，确立，使立足' },
        { en: 'stationary', pos: 'adj.', cn: '静止不动的，固定的' }
      ]
    },
    duc: {
      root: 'duc / duct',
      meaning: '引，导，率领，带来',
      desc: '源自拉丁语 ducere，表达引导、生产、诱导与演绎',
      words: [
        { en: 'conduct', pos: 'v.', cn: '组织，实施；引导 n. 举止' },
        { en: 'produce', pos: 'v.', cn: '生产，制造 n. 农产品' },
        { en: 'product', pos: 'n.', cn: '产品，产物' },
        { en: 'production', pos: 'n.', cn: '生产，产量' },
        { en: 'productive', pos: 'adj.', cn: '多产的，富有成效的' },
        { en: 'reduce', pos: 'v.', cn: '减少，降低' },
        { en: 'reduction', pos: 'n.', cn: '缩小，减少' },
        { en: 'introduce', pos: 'v.', cn: '介绍；引入，采用' },
        { en: 'introduction', pos: 'n.', cn: '介绍，序言' },
        { en: 'deduce', pos: 'v.', cn: '推断，推论' },
        { en: 'induce', pos: 'v.', cn: '引诱，引起，催生' },
        { en: 'educate', pos: 'v.', cn: '教育，教导' }
      ]
    },
    gen: {
      root: 'gen / gener',
      meaning: '生，诞生，种类，天性',
      desc: '源自希腊/拉丁语，表达产生、通用、种族与天才',
      words: [
        { en: 'generate', pos: 'v.', cn: '产生，引起，发电' },
        { en: 'generation', pos: 'n.', cn: '一代人；产生' },
        { en: 'general', pos: 'adj.', cn: '总的，普遍的 n. 将军' },
        { en: 'generalize', pos: 'v.', cn: '概括，归纳' },
        { en: 'generous', pos: 'adj.', cn: '慷慨的，大方的' },
        { en: 'genius', pos: 'n.', cn: '天才，天赋' },
        { en: 'genuine', pos: 'adj.', cn: '真诚的，真正的，正品的' },
        { en: 'ingenious', pos: 'adj.', cn: '巧妙的，机敏的' },
        { en: 'indigenous', pos: 'adj.', cn: '本土的，土生土长的' },
        { en: 'homogeneous', pos: 'adj.', cn: '同种类的，同质的' }
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
        { en: 'acceptance', pos: 'n.', cn: '接受，赞同' },
        { en: 'concept', pos: 'n.', cn: '概念，观念' },
        { en: 'conception', pos: 'n.', cn: '设想，概念；怀孕' },
        { en: 'perceive', pos: 'v.', cn: '察觉，感知，视为' },
        { en: 'perception', pos: 'n.', cn: '知觉，洞察力，认知' },
        { en: 'receive', pos: 'v.', cn: '拿到，接收，接待' },
        { en: 'reception', pos: 'n.', cn: '招待会，接待；反响' },
        { en: 'deceive', pos: 'v.', cn: '欺骗，瞒骗' },
        { en: 'deception', pos: 'n.', cn: '欺骗，圈套' },
        { en: 'susceptible', pos: 'adj.', cn: '易受影响的，易动感情的' },
        { en: 'anticipate', pos: 'v.', cn: '预料，预期，期待' }
      ]
    },
    fac: {
      root: 'fac / fec / fic',
      meaning: '做，作，制作，促成',
      desc: '源自拉丁语 facere，表达制造、效果、缺陷与利益',
      words: [
        { en: 'factory', pos: 'n.', cn: '工厂' },
        { en: 'factor', pos: 'n.', cn: '因素，要素' },
        { en: 'manufacture', pos: 'v./n.', cn: '大批量制造，生产' },
        { en: 'affect', pos: 'v.', cn: '影响，使感染，打动' },
        { en: 'effect', pos: 'n.', cn: '效应，结果，影响' },
        { en: 'effective', pos: 'adj.', cn: '有效的，生效的' },
        { en: 'efficient', pos: 'adj.', cn: '高效率的，有能力的' },
        { en: 'defect', pos: 'n.', cn: '缺陷，瑕疵 v. 背叛' },
        { en: 'deficient', pos: 'adj.', cn: '缺乏的，不足的' },
        { en: 'infect', pos: 'v.', cn: '传染，感染' },
        { en: 'sufficient', pos: 'adj.', cn: '足够的，充足的' },
        { en: 'beneficial', pos: 'adj.', cn: '有益的，有利的' },
        { en: 'proficient', pos: 'adj.', cn: '精通的，熟练的' }
      ]
    },
    struct: {
      root: 'struct',
      meaning: '建造，构筑，筑成',
      desc: '源自拉丁语 struere，表达构建、破坏、指导与结构',
      words: [
        { en: 'structure', pos: 'n.', cn: '结构，体系，建筑物' },
        { en: 'structural', pos: 'adj.', cn: '结构上的' },
        { en: 'construct', pos: 'v.', cn: '构建，建造，组成' },
        { en: 'construction', pos: 'n.', cn: '建造，施工' },
        { en: 'constructive', pos: 'adj.', cn: '建设性的，有助益的' },
        { en: 'destruct', pos: 'v.', cn: '破坏，自毁' },
        { en: 'destruction', pos: 'n.', cn: '毁灭，破坏' },
        { en: 'destructive', pos: 'adj.', cn: '破坏性的，毁灭性的' },
        { en: 'instruct', pos: 'v.', cn: '指示，吩咐，教授' },
        { en: 'instruction', pos: 'n.', cn: '用法说明，命令' },
        { en: 'instructive', pos: 'adj.', cn: '有启发性的，增长见识的' },
        { en: 'obstruct', pos: 'v.', cn: '阻碍，堵塞，妨碍' }
      ]
    },
    val: {
      root: 'val / vail',
      meaning: '强健，价值，效力',
      desc: '源自拉丁语 valere，表达价值、合法有效、胜过与普及',
      words: [
        { en: 'valid', pos: 'adj.', cn: '有法律效力的，合理的' },
        { en: 'validity', pos: 'n.', cn: '有效性，合理性' },
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
    norm: {
      root: 'norm',
      meaning: '规矩，准则，尺度',
      desc: '源自拉丁语 norma，表达标准、常规与超常',
      words: [
        { en: 'norm', pos: 'n.', cn: '行为准则，规范，常态' },
        { en: 'normal', pos: 'adj.', cn: '正常的，平常的' },
        { en: 'abnormal', pos: 'adj.', cn: '反常的，畸形的' },
        { en: 'enormous', pos: 'adj.', cn: '巨大的，庞大的' }
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
    }
  ];

  // ═══════════ FAST INDEX MAPS ═══════════
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

  function lookup(rawWord) {
    var word = String(rawWord || '').trim().toLowerCase();
    if (!word) return { hasNetwork: false, word: '' };

    var rootKey = WORD_TO_ROOT[word];
    var rootInfo = rootKey ? ROOT_FAMILIES[rootKey] : null;
    var confusable = WORD_TO_CONFUSE[word] || null;

    return {
      hasNetwork: Boolean(rootInfo || confusable),
      word: word,
      root: rootInfo ? { root: rootInfo.root, meaning: rootInfo.meaning, desc: rootInfo.desc } : null,
      family: rootInfo ? rootInfo.words : [],
      confusable: confusable
    };
  }

  function renderNetworkHtml(rawWord, isShown) {
    var info = lookup(rawWord);
    if (!info.hasNetwork) return '';

    var hiddenClass = isShown ? '' : ' recite-hidden';
    var html = '<div class="vc-word-network' + hiddenClass + '">';

    // 1. Root Family Block
    if (info.root && info.family && info.family.length) {
      html += '<div class="vc-net-header">'
        + '<span class="vc-net-tag">'
        + '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="9" x2="12" y2="3"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="12" x2="3" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>'
        + '同根族 · <b>' + escapeHTML(info.root.root) + '</b>'
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

    // 2. Confusable Pair Block
    if (info.confusable) {
      html += '<div class="vc-net-confuse">'
        + '<div class="vc-confuse-tag">'
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        + '<span>形近辨析</span>'
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
        '.vc-word-network{margin:8px 0 10px;padding:9px 11px;background:rgba(255,255,255,.76);border:1px solid rgba(7,83,106,.12);border-radius:14px;box-shadow:0 3px 12px rgba(7,83,106,.05);text-align:left;animation:vc-net-fade .18s ease}' +
        '@keyframes vc-net-fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}' +
        '.vc-net-header{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;font-size:11px;font-weight:750;color:var(--deep,#07536a)}' +
        '.vc-net-tag{display:inline-flex;align-items:center;gap:3px}' +
        '.vc-net-root-mean{font-size:10px;color:var(--muted,#5f747d);font-weight:600}' +
        '.vc-net-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:2px}' +
        '.vc-net-chip{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;background:rgba(7,83,106,.05);border:1px solid rgba(7,83,106,.1);font-size:10.5px;color:var(--ink,#102a36);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all 120ms ease}' +
        '.vc-net-chip:active{transform:scale(.95);background:rgba(7,83,106,.12)}' +
        '.vc-net-chip.current{background:rgba(7,83,106,.14);border-color:rgba(7,83,106,.35);font-weight:750;color:var(--deep,#07536a)}' +
        '.vc-net-chip b{font-weight:700}' +
        '.vc-net-chip small{font-size:9.5px;color:var(--muted,#5f747d)}' +
        '.vc-net-confuse{margin-top:7px;padding:6px 9px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.24);border-radius:8px;font-size:10.5px;line-height:1.4}' +
        '.vc-confuse-tag{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;color:#b45309;margin-bottom:2px}' +
        '.vc-confuse-text{color:#92400e;font-size:10px}' +
        '.recite-hidden{display:none}';
      document.head.appendChild(style);
    }
  }

  global.WordNetwork = {
    ROOT_FAMILIES: ROOT_FAMILIES,
    CONFUSABLE_LIST: CONFUSABLE_LIST,
    lookup: lookup,
    renderNetworkHtml: renderNetworkHtml
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  }
})(window);