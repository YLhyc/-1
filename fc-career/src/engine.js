import { MATCH } from "./content.js";

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicRoll(key) {
  let value = hashString(key) || 1;
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function outcomeTier(margin) {
  if (margin >= 8) return "success";
  if (margin >= -7) return "mixed";
  return "fail";
}

function executionLabel(tier) {
  return tier === "success" ? "执行成功" : tier === "mixed" ? "制造了机会" : "执行失败";
}

function consequenceNarrative(state, moment, choice, tier, fact, roll) {
  const fragments = {
    through: {
      success: "你的脚腕没有多余摆动，球从中卫伸出的鞋尖前穿过。顾辰不用减速，第二脚触球就把球推过了出击的门将。",
      mixed: "传球穿过第一道防线，却比顾辰的步点慢了半拍。他抢在边线前把球救回，迫使对手仓促解围。",
      fail: "你看见了路线，但球离脚时对手已经收回重心。中卫把球截下，徐指导在场边做了一个‘再早一点’的手势。"
    },
    drive: {
      success: "你用右脚外侧把球拨过逼抢者，肩膀承受住第一次碰撞。防线被迫收缩，两名队友同时得到接球角度。",
      mixed: "第一步摆脱成功，第二名防守者却把你逼向边线。你保住球权，但原本的纵向窗口已经合上。",
      fail: "湿草让支撑脚滑了半寸。球被对手从身体外侧捅走，你只能立刻转身参与反抢。"
    },
    reset: {
      success: "你把球交回后腰后没有停在原地，而是从防守者视线外绕到另一侧。三脚传递之后，球队重新面向球门。",
      mixed: "回传让球队稳住了阵形，也让对手获得完整落位的时间。场边没有责备，但这次窗口确实消失了。",
      fail: "回传力量偏轻，队友不得不迎着逼抢接球。一次安全选择反而把压力留给了身后的队友。"
    },
    volley: {
      success: "你迎着下落的皮球侧身摆腿，触球声短促得像敲在木板上。球穿过人群，在门将反应之前贴进下角。",
      mixed: "击球很干净，但角度稍正。门将双拳把球挡回禁区，第二落点仍属于你们。",
      fail: "防守者的手肘让你没能完全展开身体，皮球擦着鞋面飞上看台。你落地后先看了一眼裁判。"
    },
    cushion: {
      success: "第一脚触球把球留在你和防守者之间最安全的位置。你没有抬头太久，弱侧的传球已经从两人之间送了出去。",
      mixed: "停球稍微弹起，却也骗得第一名对手提前出脚。你把球转移出去，进攻仍然活着。",
      fail: "皮球在湿草上加速，第一脚触球离身体太远。对方后腰抢先一步把球破坏。"
    },
    shield: {
      success: "你降低重心，让碰撞落在肩背而不是脚下。哨声响起时，球还稳稳停在你的控制范围里。",
      mixed: "你撑住了第一次冲撞，却无法顺势转身。球队得到界外球，但禁区前的直接威胁已经过去。",
      fail: "对手从你支撑腿一侧发力，球和身体在同一刻失去平衡。裁判示意比赛继续。"
    },
    burst: {
      success: "你没有理会髋部的紧绷，突然从中卫盲侧启动。防线整体向后退了六码，中场持球者因此获得了推进空间。",
      mixed: "启动迫使中卫跟随后撤，但你抵达接球点时已经无法完成下一次加速。你用身体把球护给了队友。",
      fail: "前三步还在你的控制里，第四步开始身体不再回应。传球从身前滑过，理疗师已经从替补席站了起来。"
    },
    drop: {
      success: "你回到两名中场之间，接球前已经确认了身后的压力。一次转身分球让球队重新越过第一道逼抢。",
      mixed: "回撤帮助球队把球留住，却没有真正改变进攻方向。教练仍然让你向前压。",
      fail: "你回得太深，和后腰站在同一条线上。前场因此少了一个能接应的人。"
    },
    signal: {
      success: "你向场边拍了拍髋部，又指向更靠后的区域。徐指导只点了一次头，随即让边锋承担下一轮冲刺。",
      mixed: "教练看见了你的手势，但比赛没有给他调整的停顿。你只能先完成这一轮防守。",
      fail: "场边的注意力正被另一侧犯规吸引。你的信号没有被看见，任务仍然没有改变。"
    },
    curl: {
      success: "你用身体挡住近角视线，右脚内侧把球从防守者膝边卷出去。球碰到远门柱内侧，场边的安静被突然撕开。",
      mixed: "弧线绕过第一条腿，却没能继续向外展开。门将侧身托出底线，你们得到最后一次角球。",
      fail: "你为了追求弧线牺牲了力量。门将向前一步，把球稳稳抱在胸前。"
    },
    square: {
      success: "你没有看向后点，只把脚踝锁住，将球贴着六码线送过去。队友从防守者背后出现，把球撞进空门。",
      mixed: "横传穿过门前，却被最后一只伸出的脚改变方向。皮球滚出底线，后点队友用力拍了一下手。",
      fail: "传球意图被提前读懂。对方边卫抢先半步封住线路，球反弹到边线外。"
    },
    recycle: {
      success: "你把球踩在脚下，等到第二层进攻全部抵达才回做。球队把对手压回禁区，最后几分钟仍由你们控制。",
      mixed: "你保住了球权，但支援到来得比预想更慢。一次回传后，机会变成了普通阵地进攻。",
      fail: "你等待得太久，第二名防守者封住回传方向。球被迫踢出边线。"
    }
  };
  let actionBase = fragments[choice.id]?.[tier] || "这次处理改变了回合的走向。";
  if (actionBase.length < 35) actionBase += " 这次处理没有停留在原地。";
  const action = roll > .82
    ? `${actionBase} 皮球最后一次触地的方向，让结果带上了一点没有人能够预先安排的偏差。`
    : actionBase;

  let reaction;
  if (fact.scoreDelta.home) {
    reaction = moment.minute >= 80
      ? "球越过门线后，替补席几乎在同一秒冲到边线。你被最先赶到的队友撞得向后退了两步，耳边全是彼此听不清的喊声。国安门将把球从网里捞出来，催促所有人回到中圈。"
      : "进球后的声音并不来自看台，而是来自十几名队友和替补席。顾辰先冲到你面前，用力拍了一下你的后脑；你们只庆祝了几秒，因为对手已经抱着球走向中圈。";
  } else if (tier === "success") {
    reaction = "回合没有以进球结束，却迫使国安整条防线向后移动。最近的队友向你举了一下手，确认自己读懂了这次意图；徐指导没有鼓掌，只把身体向场内探得更近。";
  } else if (tier === "mixed") {
    reaction = "机会没有完全长成，也没有立刻死亡。队友继续争夺第二点，对手则用最短的处理把危险推离禁区。场边的声音重新涌回来，你来不及判断这次选择究竟会被如何评价。";
  } else {
    reaction = "国安没有停下来观察你的失误。他们立刻把球送向你身后的区域，你只能转身追赶。顾辰从边路向内收，替你封住第一条传球路线，也让这次丢失没有继续扩大。";
  }

  const projectedFatigue = clamp(state.match.fatigue + fact.fatigueDelta, 0, 100);
  const body = projectedFatigue >= 74
    ? "回到位置时，你把两次呼吸压成一次。髋部和大腿前侧的紧绷已经无法忽略，身体开始要求你为下一次冲刺提前做出选择。"
    : projectedFatigue >= 52
      ? "你慢跑回到原来的区域，胸口仍在快速起伏。身体还能服从，但恢复到正常呼吸所需的时间比上一个回合更长。"
      : "你在回撤途中把呼吸调整回来，鞋钉重新找到湿草上的支撑。身体没有给出警报，下一次启动仍然属于你的可控范围。";

  let consequence;
  if (fact.coachDelta >= 4 && fact.mateDelta >= 4) {
    consequence = "徐指导在战术板上圈住右侧肋部，顾辰则在重新开球前再次向你比出训练中的暗号。一次处理同时改变了教练对你的信任，也改变了队友下一次是否愿意继续跑那条路线。";
  } else if (fact.coachDelta >= 4) {
    consequence = "徐指导没有用夸张动作回应，只在你转身时点了一次头。对一名正在争取首份合同的球员来说，这种克制的确认比喝彩更具体。";
  } else if (fact.coachDelta <= -2) {
    consequence = "徐指导的手掌向下压了两次，要求你先把比赛重新稳定下来。那不是否定整场表现，却意味着下一次冒险需要用更充分的观察来换取。";
  } else if (fact.mateDelta > 0) {
    consequence = "顾辰在经过你身边时说了句“我还会跑”。这次配合没有给出完整答案，却让你知道下一次抬头时，那条路线仍然存在。";
  } else {
    consequence = "记分牌或许没有因此改变，但场边完整看见了你的判断、执行以及执行后的反应。比赛继续向前，这个回合已经成为他们评价你的一部分。";
  }

  return { action, reaction, body, consequence };
}

export function resolveMoment({ state, moment, choice }) {
  const player = state.player;
  const primary = player.attributes[choice.primary] ?? 60;
  const secondary = player.attributes[choice.secondary] ?? 60;
  const planId = state.training?.planId || state.training?.selected || "balanced";
  const prepByPlan = { balanced: 2, intense: 3, recovery: 1, family: 1, business: 0, vision: 3 };
  const preparation = (prepByPlan[planId] || 0) + (["vision", "passing"].includes(choice.primary) ? 1 : 0);
  const recovery = planId === "recovery" ? 4 : 0;
  const mentalModifier = clamp((state.resources.mind - 50) / 12, -3, 4);
  const fatiguePenalty = clamp((state.match.fatigue - 35) / 5, 0, 11) - recovery;
  const trustModifier = clamp((state.relations.coach.trust - 50) / 12, -2, 3);
  const skill = primary * .62 + secondary * .28 + player.attributes.composure * .1;
  const key = `${state.match.seed || MATCH.seed}|${moment.id}|${choice.id}|${state.match.decisions.join(",")}|${state.settings.randomness}`;
  const roll = deterministicRoll(key);
  const randomness = (roll - .5) * 22 * state.settings.randomness;
  const margin = skill + preparation + mentalModifier + trustModifier - fatiguePenalty + randomness - choice.difficulty;
  const tier = outcomeTier(margin);
  const effect = choice.effects[tier];
  const fact = Object.freeze({
    id: `${moment.id}:${choice.id}`,
    momentId: moment.id,
    minute: moment.minute,
    choiceId: choice.id,
    choiceTitle: choice.title,
    intent: choice.intent,
    tier,
    label: executionLabel(tier),
    roll: Number(roll.toFixed(5)),
    margin: Number(margin.toFixed(2)),
    scoreDelta: { home: effect.home || 0, away: effect.away || 0 },
    ratingDelta: effect.rating || 0,
    coachDelta: effect.coach || 0,
    mateDelta: effect.mate || 0,
    fatigueDelta: effect.fatigue || 0
  });
  const narrative = consequenceNarrative(state, moment, choice, tier, fact, roll);
  return {
    fact,
    narrative,
    prose: Object.values(narrative).join("\n\n")
  };
}

export function buildMatchSummary(state) {
  const { home, away } = state.match.score;
  const result = home > away ? "胜利" : home === away ? "平局" : "失利";
  const decisive = state.match.resolutions.filter((item) => item.fact.scoreDelta.home > 0);
  const brave = state.match.resolutions.filter((item) => item.fact.intent === "冒险" || item.fact.intent === "决定比赛");
  const identity = decisive.length >= 2
    ? "你没有只参与比赛，而是直接改变了记分牌。"
    : brave.length
      ? "教练组记住了你在压力最大时仍愿意承担处理球责任。"
      : "你让比赛保持在球队能够控制的范围内，成熟度比华丽更早被看见。";
  return {
    result,
    headline: `${state.match.homeShort} ${home}—${away} ${state.match.awayShort}`,
    identity,
    rating: Number(clamp(state.match.rating, 3, 10).toFixed(1)),
    coachVerdict: state.relations.coach.trust >= 66 ? "正式合同评审：积极" : state.relations.coach.trust >= 56 ? "正式合同评审：继续讨论" : "正式合同评审：存在疑问"
  };
}
