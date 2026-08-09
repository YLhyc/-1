export const PLAYER = {
  id: "lin-xiao",
  name: "林骁",
  age: 16,
  nationality: "中国",
  club: "上海申花青训",
  squad: "U21",
  position: "CAM",
  foot: "右脚",
  number: 17,
  overall: 67,
  attributes: {
    vision: 73,
    passing: 69,
    dribbling: 66,
    technique: 71,
    composure: 68,
    decisions: 70,
    acceleration: 64,
    strength: 55,
    stamina: 63
  }
};

export const TRAINING_ACTIVITIES = [
  {
    id: "vision",
    title: "轻度视野特训",
    description: "助教在半场布置三组移动门，要求你在接球前完成两次观察。",
    costs: { time: 12, load: 8, mind: -2 },
    gains: { vision: 8, passing: 4 },
    coach: 2,
    signal: "你把考核赛当作一次主动争取，而不是等待挑选。"
  },
  {
    id: "recovery",
    title: "完整恢复日",
    description: "降低髋部与大腿前侧负荷，让周六的第一步启动更干净。",
    costs: { time: 8, load: -12, mind: 6 },
    gains: { stamina: 4, composure: 2 },
    coach: 0,
    signal: "理疗师确认你的身体反应回到安全区。"
  },
  {
    id: "family",
    title: "和家人共进晚餐",
    description: "暂时离开基地谈论生活，而不是合同与首发位置。",
    costs: { time: 10, load: -3, mind: 12 },
    gains: { composure: 5 },
    coach: -1,
    signal: "你想起自己踢球并不只是为了通过一次考核。"
  }
];

export const PEOPLE = [
  {
    id: "coach",
    name: "徐指导",
    role: "主教练",
    initials: "徐",
    summary: "认可你的比赛阅读能力，但仍担心你在成年级别对抗中的生存能力。",
    memory: ["你连续两次执行了纵向传球要求。", "他要求你在考核赛里主动寻找身后空间。"]
  },
  {
    id: "mate",
    name: "顾辰",
    role: "核心搭档",
    initials: "顾",
    summary: "他开始把你的跑动当作传球依据，也愿意在失误后继续把球交给你。",
    memory: ["训练赛中，你为他的后插上送出助攻。", "你们约定在右肋部使用同一套手势。"]
  },
  {
    id: "rival",
    name: "周启明",
    role: "位置竞争者",
    initials: "周",
    summary: "你们争夺同一份合同。他尊重你的视野，但不会主动让出任何训练机会。",
    memory: ["他本周首次进入一线队合练。", "你在分组对抗中从他身后完成了一次抢断。"]
  },
  {
    id: "agent",
    name: "陈岚",
    role: "经纪人",
    initials: "陈",
    summary: "她希望你先获得稳定比赛时间，而不是追逐最大俱乐部的名字。",
    memory: ["她筛掉了一份没有出场规划的意向。", "三家俱乐部将在考核赛后更新条件。"]
  }
];

export const OFFERS = [
  {
    id: "shenhua",
    club: "上海申花",
    tag: "留队",
    contract: "青年球员合同",
    role: "U21 核心 / 一线队杯赛观察",
    city: "上海",
    fit: 82,
    notes: ["熟悉的战术和城市", "一线队同位置竞争激烈", "承诺杯赛轮换考察"]
  },
  {
    id: "zhejiang",
    club: "浙江职业",
    tag: "明确角色",
    contract: "三年职业合同",
    role: "前场组织核心培养",
    city: "杭州",
    fit: 77,
    notes: ["首年角色规划更清楚", "需要离开家庭环境", "可能先租借积累比赛"]
  },
  {
    id: "chengdu",
    club: "成都蓉城",
    tag: "更高挑战",
    contract: "梯队合同 + 一线队训练",
    role: "轮换前腰培养",
    city: "成都",
    fit: 70,
    notes: ["训练设施评价更高", "奖金条件最好", "同位置已有年轻核心"]
  }
];

export const MATCH = {
  id: "academy-assessment-w07",
  seed: "lin-xiao-2026-week-07",
  competition: "青训考核赛",
  venue: "康桥基地 2 号场",
  weather: "雨后转阴，草皮湿滑",
  home: "上海申花 U21",
  away: "北京国安 U21",
  kickoff: "周六 15:30",
  role: "首发前腰",
  tacticalBrief: "在右肋部接应，先吸引后腰，再寻找边锋顾辰的斜插。",
  pregame: [
    "午后的雨是在热身结束前停的。回到更衣室时，每个人的球袜上都粘着深色草屑，门口的除湿机发出持续的低鸣。你坐在最靠里的位置，把右脚鞋带解开又系了一遍，直到两边的松紧完全一样。",
    "名单贴在战术板右侧。你的名字排在首发十一人中间，位置写着前腰，旁边没有任何解释。三份仍停留在“意向”阶段的合同被留在手机里；陈岚最后一条消息只有一句：今天别向看台踢球。",
    "徐指导没有进行长篇动员。他把代表国安后腰的磁块向前推了半格，又用指节敲了敲右侧肋部：对手会跟着你的第一次接球移动。你需要做的不是每次都冒险，而是让他们无法确定你下一次会不会冒险。",
    "通道门打开后，湿冷空气贴到脸上。顾辰在你前面两步回头，伸出两根手指——这是这周训练里约定的暗号：他准备从边后卫和中卫之间斜插。你点了一下头，没有再看场边那三名球探。"
  ],
  moments: [
    {
      id: "m12-right-halfspace",
      minute: 12,
      label: "第一次被看见",
      interval: "开球至第 12 分钟",
      zone: "右侧肋部",
      leadIn: [
        "开球后的第一次触球只是回做。球从你的右脚内侧离开，滚向身后的后腰；你随即转身向前跑，没有试图用第一脚证明任何事。徐指导在场边把双臂抱在胸前，视线跟着你移动。",
        "第三分钟，国安的后腰第一次贴到你身后。他没有抢球，只用前臂确认你的位置。你把球护回中路，肩胛骨记住了他的力量：下一次如果原地等球，他会比你更早接触皮球。",
        "第七分钟，顾辰按照暗号从右路斜插。传球却来自另一侧，慢了半秒，被中卫提前解围。顾辰跑回来的时候没有抱怨，只从你身边经过时低声说：再来一次。",
        "比赛逐渐从试探变成真实的对抗。你开始在每次接球前转头两次：一次看后腰，一次看中卫。第十二分钟，右后卫终于把球沿地面送向你一直寻找的那块区域。"
      ],
      pressure: "对方后腰从你的左肩逼近，中卫正在向前补位",
      sensory: "鞋钉切进湿草，球滚过来时带着一层薄水。看台边只有教练组的低声交谈，你能听见顾辰在右路吸了一口气。",
      tactical: "直塞窗口只存在一瞬；自己转身的空间更宽，却会把你带向对方的包围。",
      decisionCue: "球还没有抵达脚下，但你已经必须决定第一脚触球的方向。顾辰正在加速，对方中卫的右脚刚刚离开草皮，而身后的后腰不会给你第二次完整抬头的机会。",
      choices: [
        { id: "through", title: "送出提前量直塞", intent: "创造", risk: "高风险", detail: "让球越过中卫伸出的脚，交给顾辰的第一步。", primary: "vision", secondary: "passing", difficulty: 69, effects: { success: { home: 1, rating: .7, coach: 5, mate: 6, fatigue: 5 }, mixed: { rating: .2, coach: 2, mate: 2, fatigue: 4 }, fail: { rating: -.25, coach: -2, fatigue: 4 } } },
        { id: "drive", title: "转身带球推进", intent: "承担", risk: "中风险", detail: "利用对手重心前移，从他的外侧把球带向禁区。", primary: "dribbling", secondary: "acceleration", difficulty: 65, effects: { success: { rating: .5, coach: 4, fatigue: 8 }, mixed: { rating: .1, coach: 1, fatigue: 7 }, fail: { rating: -.3, coach: -1, fatigue: 8 } } },
        { id: "reset", title: "回传并重新组织", intent: "控制", risk: "低风险", detail: "把球交回后腰，转身寻找下一次接应角度。", primary: "decisions", secondary: "composure", difficulty: 55, effects: { success: { rating: .2, coach: 2, fatigue: 2 }, mixed: { rating: .05, fatigue: 2 }, fail: { rating: -.1, coach: -1, fatigue: 2 } } }
      ],
      bridge: { minute: 24, away: 1, text: "你们的右侧角球被顶出禁区。国安沿边线连续两次传递，反击最后从远门柱钻进球门。教练没有喊人名，只把战术板上的防守箭头重新画了一遍。" }
    },
    {
      id: "m38-second-ball",
      minute: 38,
      label: "比分改变以后",
      interval: "第 13 至第 38 分钟",
      zone: "禁区弧顶",
      leadIn: [
        "那次处理结束后，比赛没有为你停下来。国安重新开球，后腰开始更早地跟随你的回撤；每当你向右侧移动，他都会先看一眼身后的中卫，再决定是否继续贴住。你已经改变了对方的判断，却还没有控制比赛。",
        "第二十四分钟，你们的角球被顶出禁区。国安沿边线连续完成两次一脚传递，反击从你们尚未合拢的右侧穿过去。远门柱的射门碰到湿草后加速，守门员的手掌只来得及擦过球面。",
        "重新站到中圈时，徐指导没有喊任何人的名字。他只是把战术板上的防守箭头重新画了一遍。你看见场边球探中的一人低头写了几笔，却不知道记录的是失球，还是此前那个由你制造的窗口。",
        "此后的十分钟变得更直接。申花把阵线向前推，国安则把禁区前沿压得越来越窄。第三十八分钟，一次传中被中卫顶向弧顶；皮球在风里短暂停住，像是在等待第二个人决定这个回合。"
      ],
      pressure: "解围球正在下落，两名中场同时冲向第二点",
      sensory: "雨停了，风把替补席的塑料棚吹得轻响。皮球从高处掉下来，你先看见的是防守者扬起的手肘，然后才是球。",
      tactical: "直接凌空处理能立刻制造威胁；先把球卸下，则可能得到一次更稳定的二次进攻。",
      decisionCue: "你有时间完成一个动作，却未必有时间完成两个。身后的碰撞正在靠近，守门员的视线被人群切成几段，弱侧队友则刚刚摆脱盯防。",
      choices: [
        { id: "volley", title: "迎球凌空抽射", intent: "终结", risk: "高风险", detail: "不等皮球落地，利用守门员视线被挡住的瞬间。", primary: "technique", secondary: "composure", difficulty: 73, effects: { success: { home: 1, rating: .8, coach: 5, fatigue: 7 }, mixed: { rating: .2, coach: 1, fatigue: 6 }, fail: { rating: -.25, fatigue: 6 } } },
        { id: "cushion", title: "卸球后送向弱侧", intent: "组织", risk: "中风险", detail: "把第一脚触球留在身前，再寻找左边锋的空位。", primary: "technique", secondary: "vision", difficulty: 64, effects: { success: { rating: .55, coach: 4, mate: 2, fatigue: 5 }, mixed: { rating: .15, coach: 1, fatigue: 5 }, fail: { rating: -.2, fatigue: 5 } } },
        { id: "shield", title: "卡住身位等待支援", intent: "稳定", risk: "低风险", detail: "用身体把对手挡在身后，争取一次前场定位球。", primary: "strength", secondary: "decisions", difficulty: 61, effects: { success: { rating: .25, coach: 2, fatigue: 6 }, mixed: { rating: .05, fatigue: 6 }, fail: { rating: -.2, fatigue: 7 } } }
      ],
      bridge: { minute: 46, home: 0, away: 0, text: "半场结束。通道里没有人说话，只有鞋底敲击水泥地面的声音。徐指导在更衣室门口拦住你：‘别追比分，继续找他们后腰转身的那一下。’" }
    },
    {
      id: "m71-fatigue",
      minute: 71,
      label: "身体开始讨价还价",
      interval: "中场休息至第 71 分钟",
      zone: "中圈右侧",
      leadIn: [
        "半场哨响后，所有人先低头走向通道。鞋底敲在水泥地面上，声音比场上的呼喊更整齐。你刚准备进入更衣室，徐指导把你留在门口：别追着比分跑，继续找他们后腰转身的那一下。",
        "更衣室里没有人讨论球探或合同。助教播放了两段不到十秒的录像：一次是你接球前没有观察身后，另一次是对方后腰被你带离中路。画面停住后，徐指导只问你还跑不跑得动。你说能。",
        "下半场开始后，比赛的空间反而变大。双方的第一脚逼抢都比上半场慢了一点，传球却更愿意直接穿过中场。你连续三次从右侧回到中路，帮助球队把球送过第一道压力。",
        "第六十四分钟之后，髋部的紧绷不再只出现在冲刺结束时。它开始提前半步提醒你：下一次启动会付出什么。第七十一分钟，对方两名中场同时被吸引到左侧，右边的纵向通道第一次完整打开。"
      ],
      pressure: "对手阵型被拉开，但你的髋部在连续启动后发紧",
      sensory: "汗水从眉骨滑进眼角，呼吸已经盖过场边的声音。每次停步，湿球衣都会贴回后背。",
      tactical: "继续无球前插可能撕开最后一道线，也可能让你在真正接球时失去处理质量。",
      decisionCue: "持球队友已经抬头。如果你现在启动，他会把球送向身后；如果你回撤，球队可以重新获得中场人数。场边的理疗师也在看你，但只有你知道那阵紧绷究竟是疲劳，还是警告。",
      choices: [
        { id: "burst", title: "继续冲击中卫身后", intent: "冒险", risk: "身体风险", detail: "用一次最大强度启动迫使防线后退。", primary: "stamina", secondary: "acceleration", difficulty: 70, effects: { success: { rating: .6, coach: 5, fatigue: 13 }, mixed: { rating: .1, coach: 1, fatigue: 14 }, fail: { rating: -.35, coach: -2, fatigue: 15 } } },
        { id: "drop", title: "回撤成为出球点", intent: "阅读", risk: "中风险", detail: "放弃直接威胁，帮助球队重新获得中场控制。", primary: "decisions", secondary: "passing", difficulty: 62, effects: { success: { rating: .45, coach: 4, fatigue: 7 }, mixed: { rating: .15, coach: 1, fatigue: 7 }, fail: { rating: -.15, fatigue: 7 } } },
        { id: "signal", title: "向教练示意身体反应", intent: "诚实", risk: "角色风险", detail: "请求调整跑动任务，把最危险的冲刺留给队友。", primary: "composure", secondary: "decisions", difficulty: 58, effects: { success: { rating: .15, coach: 3, fatigue: 2 }, mixed: { coach: 1, fatigue: 3 }, fail: { rating: -.1, coach: -1, fatigue: 3 } } }
      ],
      bridge: { minute: 79, home: 1, text: "顾辰在左侧抢下一个几乎出界的球，倒三角传中被后插上的中场推入近角。比分重新回到同一起点，替补席第一次全部站了起来。" }
    },
    {
      id: "m87-last-window",
      minute: 87,
      label: "最后一个窗口",
      interval: "第 72 至第 87 分钟",
      zone: "禁区右角",
      leadIn: [
        "第七十一分钟的选择改变了你接下来参与比赛的方式。你不再能把每次跑动都当成相同成本：有些球必须追，有些球只能用站位迫使对手绕路。教练席的喊声越来越少，替补席却几乎每次进攻都会站起来。",
        "第七十九分钟，顾辰在左侧抢下一个几乎已经出界的球。他倒地前把球扫回六码线外，后插上的中场迎球推射。球网晃动时，你没有立刻庆祝，而是先弯腰扶住膝盖，把呼吸重新压回可以说话的节奏。",
        "重新开球后，国安不再让后腰跟着你离开中路。他们宁愿放你在边缘接球，也不愿再暴露中卫身前的空间。场灯已经全部亮起，湿草上的每一道鞋印都比上半场更深。",
        "第八十七分钟，申花在右侧连续传递。你先把球让给套边的边后卫，随后从防守者背后折回禁区右角。回传穿过两双腿来到面前，远门柱、后点队友和补位中卫同时进入视野。"
      ],
      pressure: "比分接近，防线已经不再冒险上抢",
      sensory: "天色压下来，场灯刚刚亮起。你停球的一刻，四周突然像被抽走了声音，只剩皮球贴着鞋面的摩擦。",
      tactical: "射门角度很小；横传更合理，但后点队友也被盯住。一次选择会决定教练记住你的哪一面。",
      decisionCue: "近角被守门员封住，远角只露出一条弧线。后点的队友正在减速等待横传，而防守者已经把重心压向你的右脚。终场前也许不会再有同样完整的一次触球。",
      choices: [
        { id: "curl", title: "兜射远角", intent: "决定比赛", risk: "高风险", detail: "把球绕过封堵腿与守门员的指尖。", primary: "technique", secondary: "composure", difficulty: 75, effects: { success: { home: 1, rating: 1, coach: 6, fatigue: 8 }, mixed: { rating: .25, coach: 1, fatigue: 7 }, fail: { rating: -.3, coach: -2, fatigue: 7 } } },
        { id: "square", title: "横传后点", intent: "无私", risk: "中风险", detail: "相信队友会抵达你看见的那块空地。", primary: "vision", secondary: "passing", difficulty: 67, effects: { success: { home: 1, rating: .8, coach: 5, mate: 5, fatigue: 6 }, mixed: { rating: .2, coach: 2, mate: 1, fatigue: 5 }, fail: { rating: -.2, fatigue: 5 } } },
        { id: "recycle", title: "护球等待整体压上", intent: "耐心", risk: "低风险", detail: "不把最后一次进攻浪费在狭小角度里。", primary: "decisions", secondary: "strength", difficulty: 60, effects: { success: { rating: .3, coach: 3, fatigue: 5 }, mixed: { rating: .1, coach: 1, fatigue: 5 }, fail: { rating: -.15, fatigue: 6 } } }
      ]
    }
  ]
};
