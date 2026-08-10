import { CLUBS } from "./data.js";
import { REAL_SQUADS } from "./real-squads.js";
import { SOURCE_MANIFEST } from "./source-manifest.js";

const POSITION_PLAN = [
  "GK", "GK", "RB", "CB", "CB", "CB", "LB", "CDM", "CDM",
  "CM", "CM", "CAM", "LW", "RW", "ST", "ST", "ST", "CAM"
];

const STYLE_BY_LEAGUE = {
  csl: "zh",
  cfl: "zh",
  csl2: "zh",
  epl: "en",
  laliga: "es",
  bundesliga: "de",
  seriea: "it",
  ligue1: "fr"
};

const NAMES = {
  zh: {
    first: ["俊杰", "浩宇", "子轩", "文博", "铭泽", "雨泽", "子涵", "明轩", "致远", "天翊", "嘉懿", "懿轩", "宇阳", "博文", "浩铭", "梓睿", "一帆", "思远"],
    last: ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "高", "罗"]
  },
  en: {
    first: ["James", "Harry", "Jack", "George", "Owen", "Lewis", "Mason", "Ethan", "Callum", "Reece", "Kieran", "Dylan", "Luke", "Nathan", "Sam", "Tom", "Joe", "Ben"],
    last: ["Smith", "Carter", "Bell", "Foster", "Reed", "Hall", "Walker", "Wright", "Turner", "Moore", "Clarke", "Cooper", "Ward", "Brooks", "Hayes", "Price", "Bennett", "Cole"]
  },
  es: {
    first: ["Álvaro", "Iker", "Sergio", "Dani", "Pablo", "Adrián", "Javier", "Carlos", "Diego", "Raúl", "Rubén", "Marc", "Pau", "Iván", "Álex", "Hugo", "Mario", "Santi"],
    last: ["Ruiz", "Navarro", "Marín", "Ferrer", "Costa", "García", "López", "Fernández", "Torres", "Romero", "Vázquez", "Moreno", "Jiménez", "Molina", "Ortega", "Serrano", "Gil", "Santos"]
  },
  de: {
    first: ["Leon", "Lukas", "Finn", "Jonas", "Felix", "Paul", "Max", "Tim", "Jan", "Nico", "Luca", "Erik", "David", "Fabian", "Marcel", "Timo", "Niklas", "Kevin"],
    last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger"]
  },
  it: {
    first: ["Marco", "Luca", "Alessandro", "Matteo", "Davide", "Andrea", "Stefano", "Simone", "Federico", "Lorenzo", "Nicolò", "Gabriele", "Riccardo", "Tommaso", "Edoardo", "Giacomo", "Pietro", "Samuele"],
    last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Costa", "Giordano", "Rizzo", "Lombardi"]
  },
  fr: {
    first: ["Lucas", "Hugo", "Enzo", "Théo", "Louis", "Nathan", "Jules", "Antoine", "Rayan", "Mathis", "Maxime", "Romain", "Pierre", "Baptiste", "Clément", "Quentin", "Alexis", "Thomas"],
    last: ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "Fournier", "Girard", "Bonnet"]
  }
};

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function pick(list, seed, offset) {
  return list[Math.floor(hashText(`${seed}|${offset}`) * list.length) % list.length];
}

function nationalityFor(club, style) {
  if (style === "zh") return club.id.includes("guangzhou") || club.id.includes("shenzhen") || club.id.includes("shanghai") || club.id.includes("beijing") ? "中国" : "中国";
  return {
    en: "英格兰",
    es: "西班牙",
    de: "德国",
    it: "意大利",
    fr: "法国"
  }[style];
}

function buildTemplatePlayer(club, style, index) {
  const seed = `${SOURCE_MANIFEST.version}|${club.id}|${index}`;
  const first = pick(NAMES[style].first, seed, 0);
  const last = pick(NAMES[style].last, seed, 1);
  const name = style === "zh" ? `${last}${first}` : `${first} ${last}`;
  const position = POSITION_PLAN[index % POSITION_PLAN.length];
  return {
    id: `${club.id}-${String(index + 1).padStart(2, "0")}`,
    name,
    position,
    nationality: nationalityFor(club, style),
    clubId: club.id,
    number: index + 1,
    birthYear: 1988 + Math.floor(hashText(`${seed}|birth`) * 18),
    template: true,
    identityVerified: false,
    source: SOURCE_MANIFEST.players.source,
    verifiedAt: SOURCE_MANIFEST.players.verifiedAt,
    note: "确定性模板阵容占位；属性为模板近似，不声称官方评分或实时合同。",
    status: "active"
  };
}

export const SQUADS = CLUBS.flatMap((club) => {
  const style = STYLE_BY_LEAGUE[club.league] || "en";
  const real = REAL_SQUADS
    .filter((player) => player.clubId === club.id)
    .slice(0, SOURCE_MANIFEST.players.minimumPerClub)
    .map((player) => ({ ...player, status: "active" }));
  const generated = Array.from(
    { length: SOURCE_MANIFEST.players.minimumPerClub - real.length },
    (_, index) => buildTemplatePlayer(club, style, real.length + index)
  );
  return [...real, ...generated];
});
