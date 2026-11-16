(function(root){
  var SPRINT_VOCAB_DATA = [
  {
    "word": "supportive",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "支持的，拥护的",
    "contrast": "作者正面挺某种改革举措",
    "note": "真题阅读正面议论文高频正解"
  },
  {
    "word": "optimistic",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "乐观的",
    "contrast": "对科技发展、产业转型持积极预期",
    "note": "常与 skeptical / worried 形成反差考查"
  },
  {
    "word": "approving",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "赞成的，称许的",
    "contrast": "明确赞许某项政策或研究成果",
    "note": "直接体现作者肯定倾向"
  },
  {
    "word": "sympathetic",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "同情的，赞同认可的",
    "contrast": "⚡ 赞同/共情 ≠ ❌ 仅怜悯",
    "note": "常用于作者对弱势群体或先锋理念的态度"
  },
  {
    "word": "appreciative",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "欣赏的，感激的",
    "contrast": "正面认可艺术、文化或社会贡献",
    "note": "褒义考查题眼"
  },
  {
    "word": "favorable",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "赞许的，有利的",
    "contrast": "⚡ 持赞同态度 (favorable towards) ≠ ❌ 喜爱的",
    "note": "态度题常考正向选项"
  },
  {
    "word": "confident",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "有信心的，确信的",
    "contrast": "对克服危机或方案可行性抱有坚定信心",
    "note": "通常伴随严谨论据"
  },
  {
    "word": "tolerant",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "包容的，宽容的",
    "contrast": "对多元文化、争议技术持开放接纳态度",
    "note": "社会学题材常见正向立场"
  },
  {
    "word": "receptive",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "乐于接受的，虚心的",
    "contrast": "对新思想、新批评愿意吸纳倾听",
    "note": "态度题高分生动选项"
  },
  {
    "word": "enthusiastic",
    "category": "attitude",
    "type": "pos",
    "badge": "🟢 正向支持",
    "meaning": "热情的，高度认可的",
    "contrast": "⚠️ 仅在文中有极强正面溢美之词时入选",
    "note": "若文章仅客观论述，此项通常嫌太极端"
  },
  {
    "word": "critical",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "批判的，挑剔的",
    "contrast": "⚡ 批判抨击 (critical of) ≠ ❌ 危急严重的",
    "note": "【考研核心题眼】揭露资本、学术造假正解"
  },
  {
    "word": "skeptical",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "怀疑的，存疑的",
    "contrast": "对夸张宣传、未经验证的技术持质疑审视",
    "note": "【最高频态度正解】命题人最爱态度"
  },
  {
    "word": "suspicious",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "起疑心的，猜疑的",
    "contrast": "对商业机构的隐藏动机深表怀疑",
    "note": "常与商业垄断、数据隐私题材挂钩"
  },
  {
    "word": "dubious",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "怀疑的，不可信的",
    "contrast": "认为某些论调证据不足或荒谬",
    "note": "常考态度题同义替换"
  },
  {
    "word": "scornful",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "轻蔑的，嘲讽蔑视的",
    "contrast": "带有冷嘲热讽的贬抑感情色彩",
    "note": "真题评论文中批判性词汇"
  },
  {
    "word": "contemptuous",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "鄙视的，蔑视的",
    "contrast": "对愚蠢政令或倒退行径的不屑",
    "note": "强批判立场词"
  },
  {
    "word": "cynical",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "愤世嫉俗的，讽刺怀疑的",
    "contrast": "认为人做事皆自私利己的怀疑主义",
    "note": "批判商业运作内幕常现"
  },
  {
    "word": "intolerant",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "不容忍的，无法忍受的",
    "contrast": "对腐败、低效、虚伪的零容忍立场",
    "note": "明确负面批判"
  },
  {
    "word": "pessimistic",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "悲观的",
    "contrast": "对生态恶化、传统行业衰落的消极预期",
    "note": "常与 optimistic 对立设置"
  },
  {
    "word": "dismissive",
    "category": "attitude",
    "type": "neg",
    "badge": "🔴 批判题眼",
    "meaning": "不屑一顾的，轻蔑抛弃的",
    "contrast": "直接否定或无视某种无稽之谈",
    "note": "高阶批判态度词"
  },
  {
    "word": "objective",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "客观中立的",
    "contrast": "不偏不倚呈现双边论据，不下绝对结论",
    "note": "【说明文/自然科学文】标准高频正解"
  },
  {
    "word": "impartial",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "公正的，不偏不倚的",
    "contrast": "兼听则明，两方观点平衡陈述",
    "note": "社科法理类篇目常考"
  },
  {
    "word": "detached",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "超然独立的，客观冷静的",
    "contrast": "⚡ 冷静超然 (keep detached) ≠ ❌ 脱离的分离的",
    "note": "学术研究者标准态度"
  },
  {
    "word": "cautious",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "谨慎小心的",
    "contrast": "承认前景但警告潜在风险，常带 reserved",
    "note": "考研高频稳妥正解"
  },
  {
    "word": "reserved",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "有保留的，内敛克制的",
    "contrast": "⚡ 有保留的赞同 (reserved approval) ≠ ❌ 预订的",
    "note": "典型折中审慎立场"
  },
  {
    "word": "neutral",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "中立的",
    "contrast": "纯报告性事实记录，不表露喜恶",
    "note": "科普短文常见"
  },
  {
    "word": "pragmatic",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "务实的，注重实效的",
    "contrast": "注重现实可操作性而非理想空谈",
    "note": "政策与管理考题常见"
  },
  {
    "word": "realistic",
    "category": "attitude",
    "type": "neutral",
    "badge": "🟡 客观谨慎",
    "meaning": "现实的，面对实际的",
    "contrast": "正视困难现状，不作脱离实际幻想",
    "note": "社科经济分析常见"
  },
  {
    "word": "indifferent",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "漠不关心的，冷漠的",
    "contrast": "🚫 95%见之即排！学术作者绝不可能漠不关心",
    "note": "【致命陷阱】考场直接秒杀排除"
  },
  {
    "word": "unconcerned",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "漫不经心的，毫不挂虑的",
    "contrast": "🚫 绝不可能写一千字文章却表示无所谓",
    "note": "考场直接秒杀排除"
  },
  {
    "word": "ambiguous",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "模棱两可的，模糊不清的",
    "contrast": "🚫 作者观点可以复杂审慎，绝不能首鼠两端",
    "note": "考场直接秒杀排除"
  },
  {
    "word": "confused",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "困惑混乱的",
    "contrast": "🚫 命题人不会选定一个自己都糊涂的作者",
    "note": "考场直接秒杀排除"
  },
  {
    "word": "puzzled",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "茫然不解的",
    "contrast": "🚫 遇到科学未解之谜也用 curious 而非 puzzled",
    "note": "考场直接秒杀排除"
  },
  {
    "word": "biased",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "有偏见的，片面的",
    "contrast": "🚫 作者不会自我定性为带有偏见",
    "note": "考场直接秒杀排除"
  },
  {
    "word": "arbitrary",
    "category": "attitude",
    "type": "warn",
    "badge": "⚪ 必排陪跑",
    "meaning": "武断随意的",
    "contrast": "🚫 贬义极端词，绝非作者自我写照",
    "note": "考场直接秒杀排除"
  },
  {
    "word": "address",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "解决，处理 (deal with / tackle)",
    "contrast": "⚡ 应对危机 (address the crisis) ≠ ❌ 地址/致辞",
    "note": "真题例：address the housing shortage"
  },
  {
    "word": "spell",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "招致，带来（灾祸/厄运）",
    "contrast": "⚡ 招致厄运 (spell disaster) ≠ ❌ 拼写单词",
    "note": "真题例：spell ruin for local retailers"
  },
  {
    "word": "compromise",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "危及，损害 (undermine / damage)",
    "contrast": "⚡ 损害安全 (compromise security) ≠ ❌ 妥协折中",
    "note": "真题例：compromise national interests"
  },
  {
    "word": "contain",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "遏制，控制扩散 (halt / curb)",
    "contrast": "⚡ 遏制通胀 (contain inflation) ≠ ❌ 包含容纳",
    "note": "真题例：contain the spread of wildfire"
  },
  {
    "word": "check",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "制止，阻碍，控制 (restraint)",
    "contrast": "⚡ 抑制冲动 (keep temper in check) ≠ ❌ 检查/支票",
    "note": "真题例：checks and balances (制约与平衡)"
  },
  {
    "word": "weather",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "平安度过（经济风暴/危机）",
    "contrast": "⚡ 渡过衰退 (weather the recession) ≠ ❌ 天气气候",
    "note": "真题例：weather the economic storm"
  },
  {
    "word": "champion",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "捍卫，积极支持 (defend / advocate)",
    "contrast": "⚡ 捍卫民权 (champion civil rights) ≠ ❌ 体育冠军",
    "note": "真题例：champion the cause of free trade"
  },
  {
    "word": "court",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "招致，招惹风险是非 (invite)",
    "contrast": "⚡ 自招争议 (court controversy) ≠ ❌ 法庭/球场",
    "note": "真题例：court disaster by taking excessive risks"
  },
  {
    "word": "count",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "有价值，重要；罪状指控",
    "contrast": "⚡ 每一秒都很关键 (every second counts) ≠ ❌ 数数字",
    "note": "真题例：guilty on all counts (各项罪名成立)"
  },
  {
    "word": "cater for",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "迎合，投合低级趣味",
    "contrast": "⚡ 迎合大众趣味 (cater to public taste) ≠ ❌ 提供饮食",
    "note": "真题常含批评商业媒体之意"
  },
  {
    "word": "subject to",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "易受……影响的；受制于",
    "contrast": "⚡ 易受波动 (subject to fluctuations) ≠ ❌ 科目/主题",
    "note": "真题常考法令或市场制约机制"
  },
  {
    "word": "balance",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "余款，差额；结余",
    "contrast": "⚡ 银行余额 (account balance) ≠ ❌ 身体平衡",
    "note": "经济商业阅读常考 balance sheet"
  },
  {
    "word": "credit",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "把……归功于 (credit A with B)；赞誉",
    "contrast": "⚡ 归功于技术创新 ≠ ❌ 信用卡/信用",
    "note": "真题例：be credited with inventing..."
  },
  {
    "word": "discipline",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "学科，学术领域",
    "contrast": "⚡ 交叉学科 (interdisciplinary) ≠ ❌ 纪律惩处",
    "note": "高等教育与科研类篇目高频"
  },
  {
    "word": "harbor",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "心怀（怨恨/希望）；窝藏",
    "contrast": "⚡ 心怀怀疑 (harbor doubts) ≠ ❌ 轮船港口",
    "note": "真题例：harbor reservations about AI"
  },
  {
    "word": "casual",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "漫不经心的，草率随意的",
    "contrast": "⚡ 草率态度 (casual disregard) ≠ ❌ 休闲便服",
    "note": "2025 Text 1 选项题眼词"
  },
  {
    "word": "climate",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "社会风气，大环境，思潮",
    "contrast": "⚡ 政治/投资气候 (investment climate) ≠ ❌ 自然气候",
    "note": "真题例：the current economic climate"
  },
  {
    "word": "desert",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "抛弃，背弃；荒芜的",
    "contrast": "⚡ 抛弃传统原则 (desert the principle) ≠ ❌ 沙漠荒漠",
    "note": "2025 Text 1 题眼词"
  },
  {
    "word": "observe",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "遵守规则；评论指出",
    "contrast": "⚡ 遵守法律 (observe laws) / 评论道 ≠ ❌ 用眼观察",
    "note": "学术引用常写 As Smith observed..."
  },
  {
    "word": "doctor",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "篡改，伪造（数据/事实）",
    "contrast": "⚡ 篡改实验报告 (doctor the data) ≠ ❌ 医院医生",
    "note": "揭露学术造假篇目关键动词"
  },
  {
    "word": "novel",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "新颖的，前所未有的",
    "contrast": "⚡ 新颖疗法 (a novel approach) ≠ ❌ 长篇小说",
    "note": "科技与教学创新篇目高频赞赏词"
  },
  {
    "word": "rent",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "裂缝，分裂，撕裂 (rend的过去式)",
    "contrast": "⚡ 意见分歧撕裂 (rent the party) ≠ ❌ 房屋租金",
    "note": "政治与社会撕裂题材考点"
  },
  {
    "word": "wage",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "发动，开展（斗争/运动/战争）",
    "contrast": "⚡ 开展扫盲斗争 (wage a campaign) ≠ ❌ 工人工资",
    "note": "真题例：wage war against poverty"
  },
  {
    "word": "school",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "学派，流派；鱼群",
    "contrast": "⚡ 芝加哥学派 (a school of thought) ≠ ❌ 中小学校",
    "note": "人文社科类学术论战高频"
  },
  {
    "word": "agency",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "主观能动性，自主力量",
    "contrast": "⚡ 人的能动性 (human agency) ≠ ❌ 中介/代理处",
    "note": "哲学、社科及AI伦理篇目必考"
  },
  {
    "word": "pool",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "集中，汇集（资金/智力资源）",
    "contrast": "⚡ 共享人才库 (pool resources) ≠ ❌ 游泳水池",
    "note": "产学研联合体常考动词"
  },
  {
    "word": "mirror",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "真实反映，映射，与……极其相似",
    "contrast": "⚡ 反映现实矛盾 (mirror the reality) ≠ ❌ 梳妆镜子",
    "note": "分析文学与时代关系高频词"
  },
  {
    "word": "couch",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "以……辞令表达，隐晦措辞",
    "contrast": "⚡ 措辞含蓄 (couched in polite terms) ≠ ❌ 客厅沙发",
    "note": "外交与商业公关辞令常考"
  },
  {
    "word": "arrest",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "阻止，遏制发展；吸引（注意力）",
    "contrast": "⚡ 遏制病情恶化 (arrest the decline) ≠ ❌ 警方逮捕",
    "note": "真题例：arrest public attention"
  },
  {
    "word": "commission",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "委托制作；委任执役",
    "contrast": "⚡ 委托开展调查 (commission a survey) ≠ ❌ 销售佣金",
    "note": "2025 Text 1 原文原句考点"
  },
  {
    "word": "air",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "公开发表，宣泄；电视广播播出",
    "contrast": "⚡ 公开发表异见 (air grievances) ≠ ❌ 呼吸空气",
    "note": "媒体与言论自由篇目常考"
  },
  {
    "word": "flat",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "断然的，斩钉截铁的；经济萧条的",
    "contrast": "⚡ 断然拒绝 (a flat refusal) ≠ ❌ 平坦的/公寓",
    "note": "态度与论辩描写考点"
  },
  {
    "word": "sound",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "合理的，可靠扎实的，健康的",
    "contrast": "⚡ 扎实有力的论证 (sound reasoning) ≠ ❌ 声音响声",
    "note": "【高频赞美词】赞赏论点合理"
  },
  {
    "word": "fashion",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "手工塑造，制作，形成",
    "contrast": "⚡ 打造新模式 (fashion a response) ≠ ❌ 服装时装",
    "note": "真题例：fashion tools out of stones"
  },
  {
    "word": "plant",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "栽赃；暗插眼线卧底；工厂",
    "contrast": "⚡ 栽赃伪造证据 (plant evidence) ≠ ❌ 种植植物",
    "note": "司法与侦探类故事常见"
  },
  {
    "word": "shade",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "细微差别 (nuance)；微量",
    "contrast": "⚡ 细微意义差别 (shades of meaning) ≠ ❌ 树荫遮阳",
    "note": "语言学与文学赏析考点"
  },
  {
    "word": "table",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "美式：搁置讨论；英式：提交讨论",
    "contrast": "⚡ 暂时搁置法案 (table the bill) ≠ ❌ 吃饭桌子",
    "note": "英美议会政治报道常考陷阱"
  },
  {
    "word": "coin",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "创造（新词语、新概念）",
    "contrast": "⚡ 创造新术语 (coin a new term) ≠ ❌ 金属硬币",
    "note": "真题文化科普篇目必考"
  },
  {
    "word": "smart",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "剧烈刺痛；深受创伤蒙受打击",
    "contrast": "⚡ 仍受失利折磨 (smart from defeat) ≠ ❌ 聪明的",
    "note": "描写经济与民生受损高频"
  },
  {
    "word": "exercise",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "行使，运用（权力、权利或判断）",
    "contrast": "⚡ 行使否决权 (exercise caution/power) ≠ ❌ 体育锻炼",
    "note": "法律与政治制度高频搭配"
  },
  {
    "word": "digest",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "文摘，简报；深刻领会吸收",
    "contrast": "⚡ 吸收海量信息 (digest the facts) ≠ ❌ 肠胃消化",
    "note": "信息爆炸与阅读方式篇目考点"
  },
  {
    "word": "secure",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "设法弄到，争取到；系紧固定",
    "contrast": "⚡ 争取到科研经费 (secure funding) ≠ ❌ 安全可靠的",
    "note": "大学科研与商战篇目高频"
  },
  {
    "word": "tax",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "使承受沉重负担；耗尽心力",
    "contrast": "⚡ 耗尽承受力 (tax one's patience) ≠ ❌ 国家税收",
    "note": "描写医疗系统或精神压力考点"
  },
  {
    "word": "gross",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "极其严重的，公然恶劣的；总额",
    "contrast": "⚡ 严重失职 (gross negligence) ≠ ❌ 恶心粗俗的",
    "note": "法理批判与商界丑闻高频词"
  },
  {
    "word": "mean",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "平均数；简陋贫寒的",
    "contrast": "⚡ 黄金中道/均值 (the golden mean) ≠ ❌ 吝啬/意味着",
    "note": "统计学与社会阶层篇目考点"
  },
  {
    "word": "minute",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "微小的，极其详尽细致的 [mai'nju:t]",
    "contrast": "⚡ 细枝末节 (in minute detail) ≠ ❌ 时间分钟",
    "note": "显微科技与刑侦取证考点"
  },
  {
    "word": "party",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "合同当事人，诉讼参与方",
    "contrast": "⚡ 第三方机构 (a third party) ≠ ❌ 狂欢聚会",
    "note": "法律合同与国际公约常考"
  },
  {
    "word": "patent",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "显而易见的，公然的 (obvious)",
    "contrast": "⚡ 弥天大谎/荒谬 (patent absurdity) ≠ ❌ 发明专利",
    "note": "批判性议论文犀利措辞"
  },
  {
    "word": "save",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "除……之外 (except / save for)",
    "contrast": "⚡ 除一人外全部 (all save one) ≠ ❌ 拯救挽救",
    "note": "长难句经典否定排除陷阱"
  },
  {
    "word": "second",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "赞同，附议支持动议",
    "contrast": "⚡ 附议提案 (second the motion) ≠ ❌ 第二/秒钟",
    "note": "立法与决议表决篇目常考"
  },
  {
    "word": "spring",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "突然涌现，猛然跳出 (spring from)",
    "contrast": "⚡ 泉涌般产生 (spring to life) ≠ ❌ 温暖春天",
    "note": "描写新业态迅猛兴起"
  },
  {
    "word": "state",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "正式郑重声明，陈述",
    "contrast": "⚡ 正式表明立场 (state the case) ≠ ❌ 国家/身体状态",
    "note": "学术转述高频动词"
  },
  {
    "word": "stem from",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "起源于，由于……引起",
    "contrast": "⚡ 源于历史旧怨 (stem from prejudice) ≠ ❌ 植物茎杆",
    "note": "【因果关系题眼】同义于 originate from"
  },
  {
    "word": "treat",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "系统论述，探讨专著",
    "contrast": "⚡ 系统探讨该课题 (treat the subject) ≠ ❌ 对待/请客",
    "note": "学术文献评论高频"
  },
  {
    "word": "want",
    "category": "polysemy",
    "type": "poly",
    "badge": "⚡ 考研僻义",
    "meaning": "匮乏，贫困缺乏 (lack / poverty)",
    "contrast": "⚡ 因缺乏证据 (for want of evidence) ≠ ❌ 渴望想要",
    "note": "经典固定短语高频设题点"
  },
  {
    "word": "bolster",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "支持，加强，为……撑腰",
    "contrast": "⬆️ 巩固论点 (bolster the argument) [同向支持]",
    "note": "【正解高频】为假说或政策提供支撑"
  },
  {
    "word": "reinforce",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "增强，加固，强化",
    "contrast": "⬆️ 强化偏见/共识 (reinforce consensus)",
    "note": "加强既有逻辑走向"
  },
  {
    "word": "foster",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "培养，促进，助长",
    "contrast": "⬆️ 促进创新生态 (foster innovation)",
    "note": "政策与教育利好高频词"
  },
  {
    "word": "facilitate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "促进，使便利，推动",
    "contrast": "⬆️ 促进贸易流通 (facilitate exchange)",
    "note": "良性机制运行题眼"
  },
  {
    "word": "substantiate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "证实，证明……属实",
    "contrast": "⬆️ 用数据确证假说 (substantiate claims)",
    "note": "科学论证题正解替换 prove"
  },
  {
    "word": "propel",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "推动，驱使……向前",
    "contrast": "⬆️ 驱动产业变革 (propel growth)",
    "note": "强力正向推力"
  },
  {
    "word": "endorse",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "背书，公开赞同认可",
    "contrast": "⬆️ 专家背书提议 (endorse the plan)",
    "note": "作者或权威支持观点时常用"
  },
  {
    "word": "uphold",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "维护，支持，确认判决",
    "contrast": "⬆️ 捍卫正义宪法 (uphold the constitution)",
    "note": "法律案件最终审判高频"
  },
  {
    "word": "stimulate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "激发，刺激促进",
    "contrast": "⬆️ 刺激经济复苏 (stimulate demand)",
    "note": "积极干预措施正向效果"
  },
  {
    "word": "advance",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "推进，提出（理论观感）",
    "contrast": "⬆️ 提出开创新说 (advance a hypothesis)",
    "note": "学术探索正向动词"
  },
  {
    "word": "affirm",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "断言，肯定证实",
    "contrast": "⬆️ 肯定人本价值 (affirm the value)",
    "note": "正向结论升华"
  },
  {
    "word": "vindicate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "证明……清白，证实……正确",
    "contrast": "⬆️ 事实证明先驱无误 (vindicate theory)",
    "note": "翻案文章正向高光词"
  },
  {
    "word": "corroborate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "确证，提供证据支持",
    "contrast": "⬆️ 独立实验互相印证 (corroborate evidence)",
    "note": "实证主义论文核心动词"
  },
  {
    "word": "buttress",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "支持，加固，为……充当支柱",
    "contrast": "⬆️ 支撑摇摇欲坠的论点 (buttress the claim)",
    "note": "形象化支持论点动词"
  },
  {
    "word": "advocate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "提倡，主张，拥护",
    "contrast": "⬆️ 提倡绿色税制 (advocate reform)",
    "note": "改革建议段落题眼"
  },
  {
    "word": "nurture",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "养育，悉心培育",
    "contrast": "⬆️ 培育创新幼苗 (nurture talent)",
    "note": "人文关怀类题眼"
  },
  {
    "word": "generate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "催生，产生，激发",
    "contrast": "⬆️ 催生巨大财富/争议 (generate interest)",
    "note": "因果链条起始动词"
  },
  {
    "word": "warrant",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "使……显得必要正当；保证",
    "contrast": "⬆️ 该情况值得进一步深究 (warrant investigation)",
    "note": "学术论证正当性题眼"
  },
  {
    "word": "cultivate",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "培养，树立，营造",
    "contrast": "⬆️ 培养审辩思维 (cultivate critical thinking)",
    "note": "积极正面倡导"
  },
  {
    "word": "underpin",
    "category": "logic",
    "type": "pos",
    "badge": "⬆️ 撑腰促进",
    "meaning": "巩固，构成……的基石",
    "contrast": "⬆️ 支撑整个理论大厦 (underpin the theory)",
    "note": "核心底层支撑逻辑"
  },
  {
    "word": "undermine",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "暗中破坏，逐渐削弱根基",
    "contrast": "⬇️ 破坏公信力 (undermine credibility) [反向拆台]",
    "note": "【考研极高频】正反逻辑反转主犯"
  },
  {
    "word": "impede",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "阻碍，妨碍进展",
    "contrast": "⬇️ 繁文缛节阻碍创新 (impede progress)",
    "note": "批判官僚主义高频词"
  },
  {
    "word": "hamper",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "牵制，妨碍，束缚",
    "contrast": "⬇️ 资金匮乏束缚手脚 (hamper efforts)",
    "note": "同义替换 block / delay"
  },
  {
    "word": "curb",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "控制，约束，勒紧缰绳",
    "contrast": "⬇️ 抑制碳排放/通胀 (curb emissions)",
    "note": "治理负面现象动词"
  },
  {
    "word": "erode",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "侵蚀，蚕食，逐渐损害",
    "contrast": "⬇️ 通胀蚕食购买力 (erode trust/purchasing power)",
    "note": "长期隐蔽衰退题眼"
  },
  {
    "word": "dampen",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "挫伤，抑制（热情/信心）",
    "contrast": "⬇️ 挫伤投资热情 (dampen enthusiasm)",
    "note": "心理与市场预期降温"
  },
  {
    "word": "stifle",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "扼杀，压制，使窒息",
    "contrast": "⬇️ 垄断扼杀自由竞争 (stifle competition)",
    "note": "反垄断与学术自由篇目高频"
  },
  {
    "word": "suppress",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "压制，隐瞒（不利事实）",
    "contrast": "⬇️ 隐瞒临床实验副作用 (suppress evidence)",
    "note": "揭露造假关键负向动词"
  },
  {
    "word": "obstruct",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "阻挠，人为设置障碍",
    "contrast": "⬇️ 蓄意阻挠司法公正 (obstruct justice)",
    "note": "强力反向阻碍"
  },
  {
    "word": "impair",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "损害，削弱（功能/健康/判断）",
    "contrast": "⬇️ 睡眠不足损害认知 (impair judgment)",
    "note": "脑科学与公共卫生常考"
  },
  {
    "word": "hinder",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "妨碍，拖后腿",
    "contrast": "⬇️ 贸易壁垒妨碍复苏 (hinder development)",
    "note": "2023 Text 4 选项设坑词"
  },
  {
    "word": "counteract",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "抵消，对抗，中和",
    "contrast": "⬇️ 积极政策抵消冲击 (counteract negative effects)",
    "note": "力道相互对抗逻辑"
  },
  {
    "word": "detract from",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "减损，贬低……的价值",
    "contrast": "⬇️ 瑕疵减损整部巨著魅力 (detract from merits)",
    "note": "评论写作与文本赏析常考"
  },
  {
    "word": "negate",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "否定，取消，使无效",
    "contrast": "⬇️ 这一漏洞全盘否定结论 (negate the premise)",
    "note": "逻辑反驳致命一击"
  },
  {
    "word": "diminish",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "减少，降低，贬低重要性",
    "contrast": "⬇️ 权威影响力下降 (diminish importance)",
    "note": "渐进削弱过程"
  },
  {
    "word": "jeopardize",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "使陷入险境，危及",
    "contrast": "⬇️ 激进盲动危及全局 (jeopardize future)",
    "note": "比 compromise 更强烈的危机动词"
  },
  {
    "word": "frustrate",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "挫败，阻挠……实现",
    "contrast": "⬇️ 既得利益挫败改革 (frustrate reform)",
    "note": "阻挠方案落地常用"
  },
  {
    "word": "restrain",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "制止，克制，管束",
    "contrast": "⬇️ 约束垄断巨头行为 (restrain monopolies)",
    "note": "监管干预正反博弈"
  },
  {
    "word": "preclude",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "排除，预先阻止，妨碍",
    "contrast": "⬇️ 严苛前置条件排除可能性 (preclude options)",
    "note": "排他性逻辑推论词"
  },
  {
    "word": "deplete",
    "category": "logic",
    "type": "neg",
    "badge": "⬇️ 削弱阻碍",
    "meaning": "耗尽，大量消耗",
    "contrast": "⬇️ 过度开采耗尽天然资源 (deplete resources)",
    "note": "环境与能源主题高频"
  }
];
  root.SPRINT_VOCAB_DATA = SPRINT_VOCAB_DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = SPRINT_VOCAB_DATA;
})(typeof window !== 'undefined' ? window : globalThis);
