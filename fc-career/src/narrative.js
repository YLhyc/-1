import { deterministicRoll, hashString } from "./engine.js";

export const NARRATIVE_VERSION = 1;
export const NARRATIVE_LENGTHS = ["concise", "standard", "long"];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function paragraphCount(mode) {
  return mode === "concise" ? 1 : mode === "long" ? 7 : 4;
}

function safeText(value, fallback = "") {
  return String(value || fallback).trim();
}

function feedTitle(state, index = 0) {
  return state?.feed?.[index]?.title || "本周进展";
}

function feedText(state, index = 0) {
  return state?.feed?.[index]?.text || "";
}

function normalizedWeeklyTitle(state, phase) {
  const week = state?.world?.week || 0;
  const fallback = `${phaseLabel(phase)}第 ${week} 周`;
  const raw = feedTitle(state, 0) || fallback;
  return raw.replace(/第\s*\d+\s*周/, `第 ${week} 周`) || fallback;
}

function phaseLabel(phase) {
  return {
    academy: "青训",
    contract: "合同",
    season: "职业赛季",
    offseason: "休赛期",
    retirement: "退役",
    coach: "教练",
    final: "生涯尾声"
  }[phase] || "生涯";
}

function coachFacts(state) {
  const coach = state?.coach;
  return {
    club: coach?.club || state?.player?.club || "俱乐部",
    formation: coach?.formation || "",
    trainingFocus: coach?.trainingFocus || "",
    morale: coach?.morale ?? null,
    budget: coach?.budget ?? null,
    transfers: coach?.transfers || [],
    lineupCount: coach?.lineup?.starters?.length || 0,
    result: coach?.seasonStats ? null : null
  };
}

export function microSceneForAction(state, action, detail = {}) {
  const name = state?.player?.name || "你";
  const club = state?.player?.club || state?.coach?.club || "球队";
  const value = state?.contract?.weeklyWage || state?.coach?.budget || "";
  const templates = {
    plan: [
      `${name}把训练计划调成“${detail.planName || "新计划"}”。`,
      "教练组没有多说什么，但下一次分组对抗里，你的跑动路线已经按新计划移动。"
    ],
    "position-training": [
      `${name}在位置特训里反复练习${detail.positionName || "新位置"}的接球角度。`,
      "训练结束时，你的大腿比平时更沉，记忆却比昨天更清晰。"
    ],
    "training-position": [
      `${name}把位置特训目标设为${detail.positionName || "新位置"}。`,
      "计划写进本周日程，下一节特训会按它执行。"
    ],
    "weak-foot": [
      `${name}用逆足多完成了一组短传。`,
      "球第一次偏出，第二次压住脚背，第三次终于滚到了目标脚边。"
    ],
    "accept-offer": [
      `${name}在合同上签下名字，${club}的新赛季有了确定的开头。`,
      "签字笔离开纸面时，经纪人把另一份行程表推了过来。"
    ],
    "negotiate-offer": [
      `${name}把合同里的数字反复看过，又补了一条关于出场时间的约定。`,
      "谈判结束，桌上的水凉了，双方都拿到了可以接受的答案。"
    ],
    "accept-transfer": [
      `${name}同意转会，更衣室柜子里的东西被装进纸箱。`,
      "新俱乐部发来的消息停在手机屏幕上方，你还没有点开。"
    ],
    "reject-transfer": [
      `${name}拒绝了这份报价，留在${club}继续竞争。`,
      "经纪人点头，没有追问原因。"
    ],
    retire: [
      `${name}在最后一场比赛结束后绕场走了一圈，看台没有散。`,
      "你把球鞋留在更衣室，转身时听见门在身后轻轻合上。"
    ],
    "coach-job": [
      `${name}接过${detail.club || "新俱乐部"}的教练合同。`,
      "更衣室白板上写着你自己的名字，球员们正在等第一次训话。"
    ],
    "retire-coach": [
      `${name}在教练席上坐完最后九十分钟。`,
      "终场哨响，你把战术板上的字擦掉，没有带走。"
    ],
    "coach-formation": [
      `${name}在白板上画下${detail.formation || "新阵型"}。`,
      "球员们的目光从阵型图移到你脸上，等你说出第一句解释。"
    ],
    "coach-lineup": [
      `${name}公布了首发名单。`,
      "有人点头，有人低头喝水，更衣室安静了几秒。"
    ],
    "coach-training": [
      `${name}把训练重点改成“${detail.focus || "新重点"}”。`,
      "助理教练把训练桩摆成新的形状，球场上的呼吸声跟着变了节奏。"
    ],
    "coach-buy": [
      `${name}为球队签下一名新援，转会费从预算里划走${value || "一笔"}。`,
      "新援到训练场时，老队员多看了他几眼。"
    ],
    "coach-sell": [
      `${name}放走了一名球员，更衣室里少了一张熟悉的脸。`,
      "教练组把剩余预算重新排了一遍。"
    ],
    "coach-morale": [
      `${name}在更衣室里说了实话，没有用漂亮话代替问题。`,
      "球员们散开时，脚步比进来时轻了一点。"
    ],
    "interview-standard": [
      `${name}在采访里给出稳妥的回答。`,
      "记者把录音笔收起来，又问了一句没有出现在提纲里的问题。"
    ],
    "post-social": [
      `${name}发布了一条内容，手机屏幕亮了一下又暗下去。`,
      "评论区里有人赞同，有人质疑，你没有继续看。"
    ],
    "national-captain": [
      `${name}在训练里戴上队长袖标。`,
      "袖标比想象中轻，但教练看你的眼神比平时重。"
    ],
    "choose-national": [
      `${name}确认了国家队选择。`,
      "足协邮件里的日期和城市开始变得具体。"
    ],
    "trait-add": [
      `${name}在特性槽里加入“${detail.traitName || "新特性"}”。`,
      "训练里，你开始用新的方式处理同一个局面。"
    ],
    "injury-rehab": [
      `${name}完成了今天的康复课。`,
      "队医在记录表上打勾，没有承诺具体日期。"
    ],
    "golden-ball": [
      `${name}站在颁奖台边，听见自己的名字被念出来。`,
      "奖杯比想象中沉，你把它举起来时，闪光灯连成一片。"
    ],
    "record-milestone": [
      `${name}把第 ${detail.number || ""} 场里程碑写进生涯记录。`,
      "队友在更衣室里喊了一声，水花溅到储物柜上。"
    ],
    "family-next": [
      `${name}和家人吃完一顿晚饭，桌上的话题从足球挪开。`,
      "你看见他们的生活也在向前，不只是你的。"
    ],
    "agent-replace": [
      `${name}换了一位经纪人，旧名片被收进抽屉。`,
      "新经纪人第一次通话，先问了你真正想要什么。"
    ],
    "brand-create": [
      `${name}注册了自己的品牌标识。`,
      "第一版设计稿摆在桌上，还不算完美，但属于你。"
    ],
    "transfer-adapt": [
      `${name}在适应期里记住新更衣室的规矩。`,
      "语言和战术都能学，最难的是把陌生变成日常。"
    ],
    "potential-breakthrough": [
      `${name}在对抗课里完成了一次突破。`,
      "教练第一次没有喊停，而是等你自己做出下一个决定。"
    ],
    "create-rivals": [
      `${name}和对手的交锋多了一层长期记忆。`,
      "下一次相遇时，双方都记得上次的细节。"
    ],
    "resolve-promise": [
      `${name}兑现了俱乐部承诺，管理层把后续安排递了过来。`,
      "承诺的分量，只有兑现之后才看得清。"
    ],
    "suggest-tactics": [
      `${name}向教练提出战术建议。`,
      "教练听完没有立刻回答，只是把建议写在了战术板角落。"
    ],
    "moral-honest": [
      `${name}选择了诚实。`,
      "规则没有惩罚你，但更衣室里有人记住了这一幕。"
    ],
    "mentor-teach": [
      `${name}在训练后多留了二十分钟指导年轻球员。`,
      "对方离开时说了声谢谢，语气里多了一点认真。"
    ],
    "award-nomination": [
      `${name}被列入年度评选名单。`,
      "提名本身不是奖杯，但它让整个赛季的痕迹变得可见。"
    ],
    "comeback-traditional": [
      `${name}收到一份传统路径的复出邀约。`,
      "合同条款清楚，训练安排也清楚，接下来只需要决定是否走回去。"
    ],
    "comeback-legendary": [
      `${name}收到一份传奇路径的复出邀约，条件更苛刻，记忆也更重。`,
      "对方希望你不只是复出，而是成为下一段故事的开头。"
    ],
    "create-factions": [
      `更衣室里出现新的派系边界，${name}在训练中观察谁先开口。`,
      "你不想站队，但沉默本身也是一种位置。"
    ],
    "create-promise": [
      `${name}向俱乐部管理层作出承诺。`,
      "承诺写进档案，也写进更衣室对你的预期。"
    ],
    "fan-betray": [
      `有球迷在训练场外喊出质疑，${name}没有停下脚步。`,
      "声音追到停车场入口才消失。"
    ],
    "fan-greet": [
      `训练结束后，${name}给等待的球迷签名，有人喊出你的名字。`,
      "笔尖落在球衣上的那一刻，你会想起为什么开始踢球。"
    ],
    "halftime-motivate": [
      `中场休息时，${name}用一句话让更衣室安静下来。`,
      "球员们抬头看向你，没有人打断。"
    ],
    "halftime-silence": [
      `中场休息时，${name}选择沉默，让球员自己面对比分。`,
      "更衣室里只剩下呼吸声和水瓶拧开的声音。"
    ],
    "hidden-title": [
      `${name}解锁了一个隐藏称号。`,
      "称号不会改变下一场比赛，但它会留在生涯档案里。"
    ],
    "interview-bold": [
      `${name}在采访里说出更直接的观点。`,
      "记者把录音笔往前推了一点，像在等更锋利的句子。"
    ],
    "interview-humor": [
      `${name}用一个玩笑把采访拉回轻松的气氛。`,
      "发布会结束，队友在更衣室里重复了那句玩笑。"
    ],
    "mark-focus": [
      `${name}把这场比赛标记为焦点。`,
      "对手的名字被写在战术板最中间。"
    ],
    "mentor-apply": [
      `${name}申请成为年轻球员的导师。`,
      "教练组把你的名字放进候选名单，也放进观察名单。"
    ],
    "mind-aggressive": [
      `${name}在赛前用言语施加压力。`,
      "对方教练在新闻发布会上回了一句，比赛还没开始就有了温度。"
    ],
    "mind-calm": [
      `${name}选择用沉默回应对手的心理战。`,
      "沉默没有输赢，但你的呼吸一直很稳。"
    ],
    "moral-dive": [
      `${name}选择了欺骗，裁判没有看见，但有人记住了。`,
      "那一次摔倒换来的机会，之后会在你的记忆里反复回放。"
    ],
    "moral-strong": [
      `${name}在争议中坚持站着。`,
      "裁判没有改判，但你不需要改判也知道自己选择了什么。"
    ],
    "politics-facilities": [
      `管理层听取了${name}关于设施的意见。`,
      "施工队进场的时间写进了下一周日程。"
    ],
    "politics-support": [
      `${name}在更衣室政治里选择了支持的一方。`,
      "有人靠近，也有人后退，关系会随这次表态重新排列。"
    ],
    "psych-scar": [
      `一次失利在${name}心里留下痕迹。`,
      "它不会定义你，但下一次站在同样位置时，你会记得它。"
    ],
    "referee-calm": [
      `${name}控制住情绪，避免与裁判冲突。`,
      "裁判没有掏牌，但多看了你一眼。"
    ],
    "referee-pressure": [
      `${name}向裁判施加压力，吃到口头警告。`,
      "看台的嘘声替你表达了不满，裁判把哨子攥得更紧。"
    ],
    "ritual-flash": [
      `${name}在赛前重复了自己的固定动作。`,
      "鞋带、袖标、球衣下摆，每一步都像在确认自己还在。"
    ],
    "trait-replace": [
      `${name}用新特性替换旧槽位，学习记忆仍保留。`,
      "旧习惯没有被删除，只是让出了上场时间。"
    ],
    "trait-suppress": [
      `${name}压制了一个旧特性，槽位空了出来。`,
      "你暂时把它放回记忆里，等待更合适的时机。"
    ],
    "unemployment-abroad": [
      `${name}接受海外试训邀请，行李箱被拖到门口。`,
      "语言和天气都是新的，唯一不变的是训练开始的时间。"
    ],
    "unemployment-trial": [
      `${name}参加一次试训，训练服上的号码还是临时的。`,
      "教练在表格上写了几笔，没有当场给出答案。"
    ],
    "world-change": [
      `世界足坛发生一次规则或格局变化，${name}的下一周随之改变。`,
      "新闻在更衣室屏幕上滚动，球员们都在算这件事对自己意味着什么。"
    ],
    "start-match": [
      `${name}站在球员通道口，听见球场里的声音先于画面涌出来。`,
      "裁判核对完名单，比赛的事实将从第一声哨响开始写入存档。"
    ],
    "match-choice": [
      `${name}在关键回合做出选择。`,
      "球继续滚动，选择已经写进连续性记忆。"
    ],
    "continue-match": [
      `${name}继续投入比赛，每一秒的事实都被保存下来。`,
      "看台的声音、身体的疲劳和战术的变化，都在形成下一段故事。"
    ]
  };
  const paragraphs = templates[action];
  if (!paragraphs) return null;
  return {
    id: `micro-${action}-${hashString(`${action}|${JSON.stringify(detail)}|${state?.world?.date || ""}`).toString(16)}`,
    title: detail.title || "操作后的微场景",
    paragraphs
  };
}

export function defaultNarrativeState() {
  return {
    version: NARRATIVE_VERSION,
    chapters: [],
    currentChapterId: null,
    read: {},
    continuity: [],
    pendingChapter: null,
    reader: { sceneIndex: 0, expanded: false, choice: null }
  };
}

export function collectWeeklyFacts(before, after) {
  const previous = before || {};
  const next = after || {};
  const phase = next.world?.phase || previous.world?.phase || "academy";
  const injuryBefore = previous.health?.injuries || [];
  const injuryAfter = next.health?.injuries || [];
  const newInjuries = injuryAfter.filter((item) => !injuryBefore.some((old) => old.id === item.id));
  const oldPlayerClub = previous.player?.clubId;
  const newPlayerClub = next.player?.clubId;
  const playerMoved = Boolean(oldPlayerClub && newPlayerClub && oldPlayerClub !== newPlayerClub);
  const coachBefore = previous.coach || {};
  const coachAfter = next.coach || {};
  const coachChanged = phase === "coach" && (
    coachBefore.formation !== coachAfter.formation ||
    coachBefore.trainingFocus !== coachAfter.trainingFocus ||
    (coachAfter.transfers || []).length !== (coachBefore.transfers || []).length ||
    coachBefore.morale !== coachAfter.morale
  );
  const retirementChanged = Boolean(!previous.player?.retired && next.player?.retired);
  const unemploymentChanged = Boolean(previous.unemployment?.status !== next.unemployment?.status && next.unemployment?.status && next.unemployment?.status !== "none");
  const nationalChanged = Boolean(previous.nationalTeam?.status !== next.nationalTeam?.status && next.nationalTeam?.status);
  const familyChanged = Boolean((next.relations?.family?.memory || []).length !== (previous.relations?.family?.memory || []).length);
  const mediaChanged = Boolean(next.media?.social?.length !== previous.media?.social?.length || next.media?.reputation !== previous.media?.reputation);
  const fixtureResult = next.season?.results?.slice(-1)[0] || null;
  const score = fixtureResult?.score || null;
  const opponent = phase === "coach"
    ? (fixtureResult?.home?.id === coachAfter.clubId ? fixtureResult?.away?.name : fixtureResult?.home?.name)
    : fixtureResult?.home?.id === newPlayerClub ? fixtureResult?.away?.name : fixtureResult?.home?.name;

  return Object.freeze({
    id: `${next.seed || "fc"}|${next.world?.date || "date"}|${next.world?.week || 0}`,
    date: next.world?.date || previous.world?.date || "",
    week: next.world?.week || previous.world?.week || 0,
    season: next.world?.season || previous.world?.season || 2026,
    phase,
    phaseLabel: phaseLabel(phase),
    club: phase === "coach" ? coachAfter.club || coachFacts(next).club : next.player?.club || previous.player?.club || "俱乐部",
    opponent: safeText(opponent, "对手"),
    venue: next.match?.venue || "",
    weather: next.match?.weather || "",
    title: normalizedWeeklyTitle(next, phase),
    summary: feedText(next, 0),
    important: Boolean(
      playerMoved ||
      retirementChanged ||
      unemploymentChanged ||
      newInjuries.length ||
      nationalChanged ||
      familyChanged ||
      mediaChanged ||
      coachChanged ||
      score ||
      next.world?.phase !== previous.world?.phase
    ),
    score: score ? Object.freeze({ home: Number(score[0] || 0), away: Number(score[1] || 0) }) : null,
    result: fixtureResult?.result || null,
    playerMoved,
    newClub: playerMoved ? newPlayerClub : null,
    injuries: Object.freeze(newInjuries.map((item) => ({ id: item.id, body: item.body, weeks: item.weeks }))),
    retirement: retirementChanged,
    unemployment: unemploymentChanged ? next.unemployment?.status : null,
    national: nationalChanged ? next.nationalTeam?.status : null,
    family: familyChanged,
    media: mediaChanged,
    coach: coachChanged ? Object.freeze(coachFacts(next)) : null,
    feed: Object.freeze((next.feed || []).slice(0, 3).map((item) => ({ time: item.time, title: item.title, text: item.text })))
  });
}

function choicesForFacts(facts) {
  const choices = [];
  if (facts.playerMoved) {
    choices.push(
      { id: "settle", title: "尽快融入新更衣室", intent: "适应", risk: "低风险", detail: "把陌生城市和队友当作新的起点，不急于证明自己。" },
      { id: "push", title: "用训练表现争取位置", intent: "进取", risk: "中风险", detail: "主动向教练询问角色，并用连续训练证明自己。" },
      { id: "observe", title: "先观察更衣室规则", intent: "谨慎", risk: "低风险", detail: "不立刻表态，先理解球队内部的语言与权力结构。" }
    );
  } else if (facts.coach) {
    choices.push(
      { id: "formation", title: "坚持战术方案", intent: "果断", risk: "中风险", detail: "给球员清晰指令，也接受更衣室短期不适应。" },
      { id: "listen", title: "先听队长意见", intent: "沟通", risk: "低风险", detail: "把关键球员拉进决策，减少执行阻力。" },
      { id: "rotate", title: "用轮换降低风险", intent: "平衡", risk: "中风险", detail: "让更多球员参与，用比赛验证阵容。" }
    );
  } else if (facts.injuries.length) {
    choices.push(
      { id: "rehab", title: "严格按康复计划", intent: "纪律", risk: "低风险", detail: "不提前复出，把长期健康放在第一位。" },
      { id: "push", title: "加速恢复训练", intent: "冒险", risk: "高风险", detail: "希望尽快回到球场，但可能延长恢复期。" },
      { id: "support", title: "转向队内角色", intent: "务实", risk: "中风险", detail: "在恢复期间协助年轻球员，保持参与感。" }
    );
  } else if (facts.retirement) {
    choices.push(
      { id: "coach", title: "准备走上教练席", intent: "延续", risk: "中风险", detail: "把经验转化为训练和战术，而不是留在过去。" },
      { id: "mentor", title: "留在青训指导", intent: "传承", risk: "低风险", detail: "从最熟悉的年轻球员开始，重新理解足球。" },
      { id: "life", title: "先远离足球", intent: "休息", risk: "低风险", detail: "给身体和生活留出空白，再决定下一步。" }
    );
  } else if (facts.unemployment) {
    choices.push(
      { id: "trial", title: "接受试训", intent: "争取", risk: "中风险", detail: "用短时间证明自己仍能适应职业强度。" },
      { id: "abroad", title: "尝试海外机会", intent: "冒险", risk: "高风险", detail: "离开熟悉环境，换取新的出场可能。" },
      { id: "wait", title: "保持训练等待报价", intent: "耐心", risk: "低风险", detail: "不仓促签约，等待更合理的角色。" }
    );
  } else if (facts.national) {
    choices.push(
      { id: "commit", title: "确认代表资格", intent: "承诺", risk: "中风险", detail: "正式选择国家队，接受随之而来的责任。" },
      { id: "wait", title: "推迟最终选择", intent: "谨慎", risk: "低风险", detail: "继续观察自己的状态与球队需要。" }
    );
  } else if (facts.family || facts.media) {
    choices.push(
      { id: "family", title: "把家庭放在前面", intent: "平衡", risk: "低风险", detail: "先处理关系，再回应外界期待。" },
      { id: "career", title: "优先职业节奏", intent: "专注", risk: "中风险", detail: "用稳定表现回应一切，再补回生活时间。" },
      { id: "share", title: "主动公开回应", intent: "透明", risk: "中风险", detail: "不躲避问题，但只表达已经发生的事实。" }
    );
  } else if (facts.score) {
    choices.push(
      { id: "attack", title: "继续保持侵略性", intent: "进取", risk: "中风险", detail: "不满足于当前比分，继续寻找下一次机会。" },
      { id: "control", title: "控制比赛节奏", intent: "稳定", risk: "低风险", detail: "减少冒险，把结果稳稳握在手里。" },
      { id: "reflect", title: "赛后复盘细节", intent: "学习", risk: "低风险", detail: "把注意力从结果转向过程中能改进的部分。" }
    );
  } else {
    choices.push(
      { id: "focus", title: "把本周训练做扎实", intent: "纪律", risk: "低风险", detail: "不追逐戏剧性，用连续表现累积信任。" },
      { id: "extra", title: "加练薄弱环节", intent: "进取", risk: "中风险", detail: "主动增加负荷，但需要管理身体恢复。" },
      { id: "connect", title: "维护身边关系", intent: "平衡", risk: "低风险", detail: "和家人、队友保持联系，让生活不只有训练。" }
    );
  }
  return choices;
}

function ordinaryOpening(facts) {
  return [
    `${facts.club}。这一周没有戏剧性开场，但训练与生活仍在向前。`,
    "你按计划完成每一次合练，也留意到身体和心态留下的细节。",
    "训练场边，教练组把注意力放在下一场的选择上，你也在其中。",
    "午饭时你放慢速度，让身体在两次训练之间恢复，也把上午的问题重新想过一遍。",
    "下午的对抗课里，你试着在对手压上来之前完成一次观察，而不是急着把球送出去。",
    "傍晚离开基地前，你多做了两组力量，护腿板在口袋里硌着大腿，像一枚不会说话的提醒。",
    "你没有追逐戏剧性，只把这一周的事实一件件做好。",
    "这些片段会放进连续性记忆，在未来的章节回扣。"
  ];
}

function importantOpening(facts) {
  const lead = facts.score
    ? `记分牌上是 ${facts.score.home}—${facts.score.away}，结果已经写入本周事实。`
    : facts.playerMoved
      ? "你离开熟悉的更衣室，前往新的俱乐部，新环境还没有写入任何人的固定印象。"
      : facts.injuries.length
        ? `${facts.injuries[0].body || "伤病"}需要你重新安排本周与未来数周。`
        : facts.coach
          ? `教练组在本周完成阵型、训练或更衣室动作。${facts.coach.formation ? `当前阵型为${facts.coach.formation}。` : ""}`
          : facts.retirement || facts.unemployment
            ? `职业身份发生变化。${facts.retirement ? "退役决定已经生效。" : `当前状态：${facts.unemployment}。`}`
            : facts.national
              ? "国家队资格出现变化，你的选择会写进这份事实。"
              : facts.family || facts.media
                ? "生活与外界期望同时出现变化，你需要决定先回应哪一边。"
                : "本周没有改变比分或身份，却改变了你的连续性记忆。";
  return [
    `${facts.phaseLabel}迎来关键节点。${facts.summary || `${facts.title}写进了本周的事实。`}`,
    lead,
    "球队与周围的人都看见了变化，但真正需要你决定的是接下来的方向。",
    "你站在本周的岔路口，比分、伤病、转会或信任都已发生，剩下的选择属于你。",
    "上午的训练没有因此停下，教练组在战术板边把新事实放进原有计划。",
    "午后的阳光落在更衣室地面，你听见自己的名字在不同讨论里被提起。",
    "你不想急着证明什么，只想先把这一周的事实看清楚，再决定下一步。",
    "选择只影响后续连续性记忆，不改变已经发生的比分、伤病、转会或数值。",
    "这些细节会在未来的章节回扣；连续性记忆保存的是事实，而不是印象。"
  ];
}

function weekAftermath(facts) {
  const lead = facts.score
    ? `记分牌最终是 ${facts.score.home}—${facts.score.away}。${facts.result ? `比赛以${facts.result === "win" ? "胜利" : facts.result === "draw" ? "平局" : "失利"}结束。` : ""}`
    : facts.injuries.length
      ? `${facts.injuries[0].body || "伤病"}需要你重新安排本周与未来数周。队医给出恢复周期，训练计划随之改变。`
      : facts.coach
        ? "教练周的事实已写入复盘：战术、阵容、训练、转会或更衣室选择需要连续验证。"
        : facts.playerMoved
          ? "转会已经发生。新的俱乐部、城市与角色会进入后续章节。"
          : facts.retirement || facts.unemployment
            ? "职业身份已经改变，下一步选择会影响人生报告的主题。"
            : facts.national
              ? "国家队资格的变化已经记录，接下来的选择会决定你的代表路径。"
              : facts.family || facts.media
                ? "生活与外界的变化已经记录，关系与形象会随这些事实重新排列。"
                : "本周没有改变比分或身份，却改变了你的连续性记忆。";
  return [
    lead,
    "这一周的结果已经写入存档，接下来是复盘与恢复。",
    "你记住的不只是一次触球，而是整个过程如何连续地影响了你。",
    "教练组把关键回合写进报告，关系与信任也会随这些事实变化。",
    "更衣室里的声音逐渐被理疗和复盘取代，你在心里把片段按顺序放好。",
    "没有人要求你立刻定义自己；事实会替你保留答案。",
    "选择只影响后续连续性记忆，不改变已经发生的比分、伤病、转会或数值。",
    "当你离开球场时，夜色已经把训练场的灯光收进身后。",
    "下一周会从这些事实开始，而不是从空白开始。"
  ];
}

function settlementForFacts(facts) {
  return {
    verdict: facts.score
      ? `比分 ${facts.score.home}—${facts.score.away} 是本周最客观的结果。${facts.result === "win" ? "你带走了胜利，也带走比赛中的问题。" : facts.result === "draw" ? "平局让你看见控制与冒险之间的边界。" : "失败是事实，不是对你的定义。"}`
      : facts.injuries.length
        ? `伤病事实：${facts.injuries.map((item) => item.body || "身体部位").join("、")}。恢复周期已写入存档。`
        : facts.coach
          ? "教练周的事实已写入复盘：战术、阵容、训练、转会或更衣室选择需要连续验证。"
          : facts.playerMoved
            ? "转会已经发生。新的俱乐部、城市与角色会进入后续章节。"
            : facts.retirement || facts.unemployment
              ? "职业身份已经改变，下一步选择会影响人生报告的主题。"
              : facts.national
                ? "国家队资格的变化已经记录，接下来的选择会决定你的代表路径。"
                : facts.family || facts.media
                  ? "生活与外界的变化已经记录，关系与形象会随这些事实重新排列。"
                  : "平静周没有编造冲突；连续性和细节本身已经构成阅读内容。",
    stats: [
      ["日期", facts.date],
      ["阶段", facts.phaseLabel],
      ["周次", `${facts.week}`],
      ...(facts.score ? [["比分", `${facts.score.home}—${facts.score.away}`]] : []),
      ...(facts.injuries.length ? [["伤病", facts.injuries.map((item) => item.body || "身体").join("、")]] : [])
    ]
  };
}

function sceneForFactsV2(facts, index, mode) {
  const baseCount = paragraphCount(mode);
  const count = baseCount + (facts.important ? 4 : 0);
  const rawParagraphs = index === 0
    ? (facts.important ? importantOpening(facts) : ordinaryOpening(facts))
    : index === 1
      ? weekAftermath(facts)
      : [settlementForFacts(facts).verdict];
  const pads = [
    "你把手放在膝盖上，让呼吸慢下来，再把这些事实放进下一段的判断。",
    "教练组没有催你表态，训练照常进行，时间会把选择变成证据。",
    "看台或更衣室里的声音不会替你决定，只有你接下来的行动会写进档案。"
  ];
  const padCount = facts.important ? 3 : 2;
  const paragraphs = index === 2
    ? rawParagraphs
    : rawParagraphs.slice(0, count + 1).map((paragraph) => `${paragraph} ${pads.slice(0, padCount).join(" ")}`);
  return {
    kicker: index === 0 ? "开始本周" : index === 1 ? "结果余韵" : "章节结算",
    title: index === 0 ? "你走进这一周" : index === 1 ? "这一周留下的痕迹" : "定性余波",
    paragraphs,
    settlement: index === 2 ? settlementForFacts(facts) : null
  };
}

function sceneForFacts(facts, index, mode) {
  const count = paragraphCount(mode);
  const generic = [
    `${facts.club}。这一周没有戏剧性开场，但训练与生活仍在向前。`,
    `你按计划完成每一次合练，也留意到身体和心态留下的细节。`,
    `当一天结束时，你把这些片段放进记忆：它们会在下一周回扣。`
  ];
  const opener = facts.important
    ? [
        `${facts.phaseLabel}迎来关键节点。${facts.summary || `${facts.title}写进了本周的事实。`}`,
        `球队与周围的人都看见了变化，但真正需要你决定的是接下来的方向。`,
        `你站在本周的岔路口，比分、伤病、转会或信任都已发生，剩下的选择属于你。`
      ]
    : generic.slice(0, Math.max(1, count));
  const after = facts.score
    ? [
        `记分牌最终是 ${facts.score.home}—${facts.score.away}。${facts.result ? `比赛以${facts.result === "win" ? "胜利" : facts.result === "draw" ? "平局" : "失利"}结束。` : ""}`,
        `比赛结束后，更衣室里的声音逐渐被理疗和复盘取代。你记住的不是唯一一次触球，而是整个过程如何连续地影响了你。`,
        `教练组把关键回合写进报告，关系与信任也会随这些事实变化。`
      ]
    : facts.injuries.length
      ? [
          `${facts.injuries[0].body || "伤病"}需要你重新安排本周与未来数周。`,
          `队医给出恢复周期，训练计划随之改变。你没有选择忽视它。`,
          `康复不是从回到球场才开始的，而是从你决定如何对待身体那一刻开始。`
        ]
      : facts.coach
        ? [
            `教练组在本周完成阵型、训练或更衣室动作。${facts.coach.formation ? `当前阵型为 ${facts.coach.formation}。` : ""}`,
            `球员对战术的反应会进入更衣室记忆，董事会也在观察球队走向。`,
            `复盘时，你需要把决定解释清楚，也要允许事实修正它。`
          ]
        : facts.playerMoved
          ? [
              `你离开熟悉的更衣室，前往新的俱乐部。`,
              `新环境有新的语言、训练节奏和人际关系；你还没有被写入任何人的固定印象。`,
              `融入不是一次亮相，而是连续几周被看见、被信任的过程。`
            ]
          : facts.retirement || facts.unemployment
            ? [
                `职业身份发生变化。${facts.retirement ? "退役决定已经生效。" : `当前状态：${facts.unemployment}。`}`,
                `生活不再只由赛程组成，但足球仍可以以另一种方式存在。`,
                `你会决定如何回应这段空白。`
              ]
            : [
                `本周没有改变比分或身份，却改变了你的连续性记忆。`,
                `训练、生活与关系中的微小选择会被保存，并在未来章节回扣。`,
                `平静不等于停滞，它只是没有用戏剧性提醒你。`
              ];
  const settlement = {
    verdict: facts.score
      ? `比分 ${facts.score.home}—${facts.score.away} 是本周最客观的结果。${facts.result === "win" ? "你带走了胜利，也带走比赛中的问题。" : facts.result === "draw" ? "平局让你看见控制与冒险之间的边界。" : "失败是事实，不是对你的定义。"}`
      : facts.injuries.length
        ? `伤病事实：${facts.injuries.map((item) => item.body || "身体部位").join("、")}。恢复周期已写入存档。`
        : facts.coach
          ? "教练周的事实已写入复盘：战术、阵容、训练、转会或更衣室选择需要连续验证。"
          : facts.playerMoved
            ? "转会已经发生。新的俱乐部、城市与角色会进入后续章节。"
            : facts.retirement || facts.unemployment
              ? "职业身份已经改变，下一步选择会影响人生报告的主题。"
              : "平静周没有编造冲突；连续性和细节本身已经构成阅读内容。",
    stats: [
      ["日期", facts.date],
      ["阶段", facts.phaseLabel],
      ["周次", `${facts.week}`],
      ...(facts.score ? [["比分", `${facts.score.home}—${facts.score.away}`]] : []),
      ...(facts.injuries.length ? [["伤病", facts.injuries.map((item) => item.body || "身体").join("、")]] : [])
    ]
  };
  const paragraphs = index === 0 ? opener : index === 1 ? after : settlement.verdict ? [settlement.verdict] : generic;
  if (mode === "long" && index < 2) paragraphs.push("这些细节会在未来的章节回扣；连续性记忆保存的是事实，而不是印象。");
  return {
    kicker: index === 0 ? "开始本周" : index === 1 ? "结果余韵" : "章节结算",
    title: index === 0 ? "你走进这一周" : index === 1 ? "这一周留下的痕迹" : "定性余波",
    paragraphs: paragraphs.slice(0, count + 1),
    settlement: index === 2 ? settlement : null
  };
}

function localChapter(state, facts, mode) {
  const fingerprint = hashString(`${facts.id}|${mode}|${state.settings?.lengthMode || "standard"}`);
  const choices = choicesForFacts(facts);
  const hasChoice = Boolean(facts.important || (facts.week % 3 === 0 && choices.length));
  const selectedChoice = hasChoice ? choices[Math.floor(deterministicRoll(`${fingerprint}|choice-order`) * choices.length)] : null;
  const scenes = [0, 1, 2].map((index) => {
    const scene = sceneForFactsV2(facts, index, mode);
    if (index === 1 && hasChoice && selectedChoice) {
      scene.choice = {
        prompt: `本周最重要的问题：${selectedChoice.title}？`,
        intro: "选择会写入连续性记忆，但不会改变已经发生的比分、伤病、转会或数值。",
        options: choices
      };
    }
    return scene;
  });
  return {
    id: `chapter-${fingerprint.toString(16)}`,
    key: fingerprint,
    date: facts.date,
    week: facts.week,
    season: facts.season,
    phase: facts.phase,
    phaseLabel: facts.phaseLabel,
    title: facts.title,
    summary: facts.summary,
    important: facts.important,
    lengthMode: mode,
    facts: structuredClone(facts),
    scenes,
    read: false,
    ai: null,
    choices: []
  };
}

export function buildChapter({ state, facts, lengthMode = "standard", aiParagraphs = null }) {
  const mode = NARRATIVE_LENGTHS.includes(lengthMode) ? lengthMode : "standard";
  const chapter = localChapter(state, facts, mode);
  if (aiParagraphs && validateChapter(chapter, facts)) chapter.ai = aiParagraphs;
  return chapter;
}

export function validateChapter(chapter, facts) {
  if (!chapter || !facts) return false;
  if (chapter.facts?.score && facts.score) {
    if (chapter.facts.score.home !== facts.score.home || chapter.facts.score.away !== facts.score.away) return false;
  }
  const joined = JSON.stringify(chapter);
  const scoreText = facts.score ? `${facts.score.home}—${facts.score.away}` : null;
  if (scoreText && joined.includes(scoreText) === false && chapter.facts.score) return false;
  return true;
}

export function continuityKey(state) {
  const last = state.narrative?.continuity?.slice(-1)[0] || null;
  return `${state.seed}|${last?.id || "start"}|${state.world?.date || ""}|${state.world?.week || 0}`;
}

export function rememberChapter(state, chapter) {
  const next = structuredClone(state);
  next.narrative = next.narrative || defaultNarrativeState();
  const existing = next.narrative.chapters.findIndex((item) => item.id === chapter.id);
  if (existing >= 0) next.narrative.chapters[existing] = chapter;
  else next.narrative.chapters.push(chapter);
  next.narrative.chapters = next.narrative.chapters.slice(-60);
  next.narrative.currentChapterId = chapter.id;
  next.narrative.continuity = next.narrative.continuity || [];
  next.narrative.continuity.push({
    id: chapter.id,
    date: chapter.date,
    week: chapter.week,
    phase: chapter.phase,
    title: chapter.title,
    important: chapter.important
  });
  next.narrative.continuity = next.narrative.continuity.slice(-40);
  return next;
}

export function markChapterRead(state, chapterId) {
  const next = structuredClone(state);
  next.narrative = next.narrative || defaultNarrativeState();
  next.narrative.read = next.narrative.read || {};
  next.narrative.read[chapterId] = true;
  return next;
}

export function cacheAiChapter(state, chapterId, ai) {
  const next = structuredClone(state);
  const chapter = next.narrative?.chapters?.find((item) => item.id === chapterId);
  if (!chapter) return next;
  chapter.ai = ai;
  chapter.aiCachedAt = Date.now();
  return next;
}

export function applyNarrativeChoice(state, chapterId, choiceId) {
  const next = structuredClone(state);
  const chapter = next.narrative?.chapters?.find((item) => item.id === chapterId);
  if (!chapter) return next;
  const choice = chapter.scenes?.[1]?.choice?.options?.find((item) => item.id === choiceId);
  if (!choice) return next;
  chapter.choices.push({ choiceId, date: chapter.date, title: choice.title });
  chapter.read = true;
  next.narrative.currentChapterId = chapterId;
  next.narrative.read = next.narrative.read || {};
  next.narrative.read[chapterId] = true;
  const deltas = {
    settle: { mind: 4, coach: 2 },
    push: { mind: -2, coach: 4, load: 6 },
    observe: { mind: 3, coach: 1 },
    formation: { coach: 4, mind: -1 },
    listen: { coach: 3, mind: 2 },
    rotate: { coach: 2, load: 4 },
    rehab: { mind: 4, load: -6 },
    support: { coach: 2, mind: 2 },
    coach: { coach: 3, mind: 2 },
    mentor: { mind: 4, family: 2 },
    life: { mind: 6, coach: -2 },
    trial: { mind: -2, coach: 3 },
    abroad: { mind: -4, coach: 4 },
    wait: { mind: 3, coach: 1 },
    commit: { coach: 3, mind: -2 },
    family: { family: 5, mind: 4 },
    career: { coach: 3, mind: -2 },
    share: { media: 3, mind: 1 },
    attack: { coach: 2, load: 5 },
    control: { coach: 1, mind: 1 },
    reflect: { mind: 3 },
    focus: { coach: 2, load: 2 },
    extra: { load: 7, mind: -1 },
    connect: { family: 3, mind: 3 }
  };
  const delta = deltas[choiceId] || { mind: 1 };
  next.resources.mind = clamp((next.resources.mind || 50) + (delta.mind || 0), 0, 100);
  next.resources.load = clamp((next.resources.load || 50) + (delta.load || 0), 0, 100);
  if (delta.coach && next.relations?.coach) next.relations.coach.trust = clamp(next.relations.coach.trust + delta.coach, 0, 100);
  if (delta.family && next.relations?.family) next.relations.family.closeness = clamp(next.relations.family.closeness + delta.family, 0, 100);
  if (delta.media && next.relations?.media) next.relations.media.trust = clamp(next.relations.media.trust + delta.media, 0, 100);
  return next;
}

export function chapterLibrary(state) {
  return (state?.narrative?.chapters || []).slice().reverse().map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    date: chapter.date,
    week: chapter.week,
    phase: chapter.phase,
    important: chapter.important,
    read: Boolean(state.narrative.read?.[chapter.id] || chapter.read)
  }));
}

export function seasonMontage(state, chapters) {
  const list = (chapters || state?.narrative?.chapters || []).filter((item) => item.season === state?.world?.season);
  return {
    season: state?.world?.season,
    headline: `${state?.player?.club || state?.coach?.club || "生涯"} · 第 ${state?.world?.week || 0} 周`,
    keyChapters: list.filter((item) => item.important).map((item) => ({ id: item.id, title: item.title, date: item.date, phase: item.phase })),
    count: list.length
  };
}

export function advanceWeekWithNarrative(state) {
  const before = structuredClone(state);
  const next = structuredClone(state);
  // Import is lazy to avoid circular dependency at module load.
  // career.advanceWeek is injected by career.js through setAdvanceWeekImplementation.
  if (typeof state._advanceWeek === "function") {
    return state._advanceWeek(state);
  }
  return next;
}
