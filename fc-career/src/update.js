import { APP_VERSION } from "./version.js";
export { APP_VERSION };

export const UPDATE_DRAFT_KEY = "fc-career-update-draft-v1";
export const UPDATE_DRAFT_PENDING_KEY = "fc-career-update-pending-v1";

let buildTime = "";
let cacheVersion = null;
let status = { kind: "idle", text: "点击检查更新" };
let busy = false;
let refreshing = false;
let guardTimer = null;
let beforeApplyHook = async () => true;
let initStarted = false;
const watchedRegistrations = [];
const watchedWorkers = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isValidAppVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value);
}

export function compareAppVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

export function fetchWithTimeout(url, options = {}, timeoutMs = 8000, fetchImpl = globalThis.fetch) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const opts = { ...options };
  if (controller) opts.signal = controller.signal;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (controller) controller.abort();
      const error = new Error("request_timeout");
      error.name = "TimeoutError";
      reject(error);
    }, Math.max(1000, Number(timeoutMs) || 8000));
    Promise.resolve(fetchImpl(url, opts)).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function cacheLabel() {
  if (cacheVersion === null) return "缓存未接管";
  if (cacheVersion === "unsupported") return "无缓存支持";
  if (cacheVersion === "unknown") return "缓存未知";
  if (cacheVersion === APP_VERSION) return `缓存${cacheVersion}`;
  return `缓存${cacheVersion}（旧版）`;
}

export function renderUpdateWidget() {
  return `
    <div class="app-update-widget" data-update-widget>
      <button type="button" class="version-badge" data-action="check-update" data-update-button aria-label="检查并应用更新，当前版本 ${escapeHtml(APP_VERSION)}" aria-busy="false">
        <span class="update-badge-version">版本 <b data-update-version>${escapeHtml(APP_VERSION)}</b></span>
        <span class="update-badge-cache" data-update-cache>${escapeHtml(cacheLabel())}</span>
      </button>
      <button type="button" class="update-refresh-button" data-action="check-update" data-update-button aria-label="检查并应用更新" title="检查并应用更新" aria-busy="false">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 0 0-15.62-6.15L3 8"></path>
          <path d="M3 3v5h5"></path>
          <path d="M3 12a9 9 0 0 0 15.62 6.15L21 16"></path>
          <path d="M16 16h5v5"></path>
        </svg>
      </button>
      <span class="update-status" data-update-status role="status" aria-live="polite">${escapeHtml(status.text)}</span>
    </div>`;
}

export function renderSettingsUpdateCard() {
  return `
    <section class="surface-card update-card" data-update-card>
      <h2>应用与更新</h2>
      <p>当前版本 <b data-update-version>${escapeHtml(APP_VERSION)}</b> · 缓存 <b data-update-cache>${escapeHtml(cacheLabel())}</b></p>
      <p>构建时间 <span data-update-build-time>${escapeHtml(buildTime || "读取中")}</span></p>
      ${renderUpdateWidget()}
      <p class="section-note">只有点击按钮才会接管新版；比赛与长叙事不会自动重载，接管前会先保存当前生涯与未提交草稿。</p>
    </section>`;
}

export function refreshUpdateStatus() {
  document.querySelectorAll("[data-update-version]").forEach((node) => {
    node.textContent = APP_VERSION;
  });
  document.querySelectorAll("[data-update-cache]").forEach((node) => {
    node.textContent = cacheLabel();
  });
  document.querySelectorAll("[data-update-build-time]").forEach((node) => {
    node.textContent = buildTime || "读取中";
  });
  document.querySelectorAll("[data-update-status]").forEach((node) => {
    node.textContent = status.text;
    node.dataset.kind = status.kind;
  });
  document.querySelectorAll('[data-action="check-update"]').forEach((button) => {
    button.disabled = busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
    button.classList.toggle("checking", busy);
    button.title = busy ? "正在检查并应用更新" : "检查并应用更新";
  });
}

function setStatus(kind, text) {
  status = { kind, text };
  refreshUpdateStatus();
}

function finishUpdateAttempt() {
  if (guardTimer) {
    clearTimeout(guardTimer);
    guardTimer = null;
  }
  busy = false;
}

async function loadBuildTime() {
  try {
    const response = await fetchWithTimeout(`version.json?t=${Date.now()}`, { cache: "no-store" }, 6000);
    const payload = await response.json();
    if (payload?.buildTime) buildTime = String(payload.buildTime);
  } catch {
    // The badge still works without build time; settings only shows a fallback.
  }
  refreshUpdateStatus();
}

export async function refreshCacheStatus() {
  if (!("serviceWorker" in navigator)) {
    cacheVersion = "unsupported";
    refreshUpdateStatus();
    return "unsupported";
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) {
      cacheVersion = null;
      refreshUpdateStatus();
      return "not-ready";
    }
    if (typeof MessageChannel === "undefined") {
      cacheVersion = "unknown";
      refreshUpdateStatus();
      return "unknown";
    }
    const version = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error("cache_status_timeout")), 3000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        resolve(event.data?.version || "unknown");
      };
      worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
    });
    cacheVersion = version || "unknown";
  } catch {
    cacheVersion = null;
  }
  refreshUpdateStatus();
  return cacheVersion;
}

function watchWorker(worker) {
  if (!worker || watchedWorkers.includes(worker)) return;
  watchedWorkers.push(worker);
  worker.addEventListener("statechange", () => {
    if (worker.state === "redundant") refreshUpdateStatus();
  });
}

function watchRegistration(registration) {
  if (!registration || watchedRegistrations.includes(registration)) return;
  watchedRegistrations.push(registration);
  watchWorker(registration.waiting);
  watchWorker(registration.installing);
  registration.addEventListener("updatefound", () => watchWorker(registration.installing));
}

function waitForInstalled(worker) {
  return new Promise((resolve, reject) => {
    if (["installed", "activating", "activated"].includes(worker.state)) {
      resolve(worker);
      return;
    }
    const timer = setTimeout(() => reject(new Error("worker-install-timeout")), 30000);
    const onChange = () => {
      if (["installed", "activating", "activated"].includes(worker.state)) {
        clearTimeout(timer);
        worker.removeEventListener("statechange", onChange);
        resolve(worker);
      } else if (worker.state === "redundant") {
        clearTimeout(timer);
        worker.removeEventListener("statechange", onChange);
        reject(new Error("worker-redundant"));
      }
    };
    worker.addEventListener("statechange", onChange);
  });
}

export async function performUpdateCheck({
  localVersion = APP_VERSION,
  fetchImpl = globalThis.fetch,
  serviceWorker = globalThis.navigator?.serviceWorker,
  onStatus = () => {},
  beforeApply = async () => true,
  isOnline = () => globalThis.navigator?.onLine !== false,
  versionTimeoutMs = 8000,
  guardTimeoutMs = 30000,
  now = () => Date.now()
} = {}) {
  if (busy) return { result: "busy" };
  busy = true;
  onStatus({ kind: "checking", text: "正在检查更新…" });
  guardTimer = setTimeout(() => {
    if (!busy) return;
    finishUpdateAttempt();
    onStatus({ kind: "timeout", text: "更新等待超时，请检查网络后重试" });
  }, guardTimeoutMs);

  try {
    if (!serviceWorker) {
      finishUpdateAttempt();
      onStatus({ kind: "unsupported", text: "当前浏览器不支持应用更新" });
      return { result: "unsupported" };
    }

    let response;
    try {
      response = await fetchWithTimeout(`version.json?t=${now()}`, { cache: "no-store" }, versionTimeoutMs, fetchImpl);
    } catch (error) {
      finishUpdateAttempt();
      if (error?.name === "TimeoutError") {
        onStatus({ kind: "timeout", text: "更新等待超时，请检查网络后重试" });
        return { result: "timeout" };
      }
      onStatus({ kind: isOnline() ? "error" : "offline", text: isOnline() ? "无法获取更新信息，请稍后重试" : "当前离线，联网后再试" });
      return { result: isOnline() ? "error" : "offline" };
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let payload;
    try {
      payload = await response.json();
    } catch {
      finishUpdateAttempt();
      onStatus({ kind: "invalid", text: "更新元数据非法" });
      return { result: "invalid" };
    }
    const remoteVersion = payload?.version;
    if (!isValidAppVersion(remoteVersion)) {
      finishUpdateAttempt();
      onStatus({ kind: "invalid", text: "更新元数据非法" });
      return { result: "invalid" };
    }
    if (remoteVersion === localVersion) {
      finishUpdateAttempt();
      onStatus({ kind: "latest", text: "已是最新版本" });
      return { result: "latest" };
    }
    if (compareAppVersions(remoteVersion, localVersion) < 0) {
      finishUpdateAttempt();
      onStatus({ kind: "older", text: "服务器版本尚未同步，请稍后重试" });
      return { result: "older" };
    }

    onStatus({ kind: "found", text: `发现新版 ${remoteVersion}，正在下载…` });
    const registration = await serviceWorker.register(
      `sw.js?v=${encodeURIComponent(remoteVersion)}`,
      { updateViaCache: "none" }
    );
    watchRegistration(registration);
    let worker = registration.waiting || registration.installing;
    if (!worker) {
      onStatus({ kind: "downloading", text: "正在下载新版…" });
      await registration.update();
      watchRegistration(registration);
      worker = registration.waiting || registration.installing;
    }
    if (!worker) {
      finishUpdateAttempt();
      onStatus({ kind: "error", text: "更新资源尚未就绪，请稍后重试" });
      return { result: "not-ready" };
    }
    if (worker.state === "installing") {
      onStatus({ kind: "downloading", text: "正在下载新版…" });
      await waitForInstalled(worker);
    }

    const saved = await beforeApply();
    if (saved === false) {
      finishUpdateAttempt();
      onStatus({ kind: "save-failed", text: "更新前保存失败，已取消更新" });
      return { result: "save-failed" };
    }

    onStatus({ kind: "applying", text: "正在应用新版…" });
    const visualDelay = Number(globalThis.sessionStorage?.getItem("fc-career-update-visual-delay") || 0);
    if (visualDelay > 0) await new Promise((resolve) => setTimeout(resolve, visualDelay));
    refreshing = true;
    try {
      worker.postMessage("skipWaiting");
    } catch {
      // Some browsers reject postMessage after activation; controllerchange still handles reload.
      refreshing = false;
    }
    finishUpdateAttempt();
    return { result: "updated", remoteVersion };
  } catch (error) {
    finishUpdateAttempt();
    onStatus({ kind: "error", text: "无法获取更新信息，请稍后重试" });
    return { result: "error", error: error?.message || "unknown" };
  }
}

export function requestAppUpdate() {
  return performUpdateCheck({
    localVersion: APP_VERSION,
    onStatus: (next) => setStatus(next.kind, next.text),
    beforeApply: beforeApplyHook
  }).then((result) => {
    refreshUpdateStatus();
    return result;
  });
}

export function handleControllerChange() {
  if (!refreshing) return false;
  refreshing = false;
  location.reload();
  return true;
}

export function initAppUpdate({ beforeApply = async () => true } = {}) {
  beforeApplyHook = beforeApply;
  if (initStarted) return;
  initStarted = true;
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`sw.js?v=${encodeURIComponent(APP_VERSION)}`, { updateViaCache: "none" })
        .then((registration) => {
          watchRegistration(registration);
        })
        .catch(() => refreshUpdateStatus());
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    });
  }
  loadBuildTime();
  refreshCacheStatus();
  refreshUpdateStatus();
}

export function captureCreateDraft() {
  if (!document.querySelector("#createForm")) return;
  const value = (selector) => document.querySelector(selector)?.value ?? "";
  const draft = {
    name: value("#newName"),
    position: value("#newPosition"),
    talent: value("#newTalent"),
    family: value("#newFamily"),
    nationality: value("#newNationality"),
    secondNationality: value("#newSecondNationality"),
    club: value("#newClub"),
    birthYear: value("#newBirthYear"),
    foot: value("#newFoot"),
    height: value("#newHeight"),
    weight: value("#newWeight"),
    number: value("#newNumber"),
    techBias: value("#newTechBias"),
    physicalBias: value("#newPhysicalBias"),
    mentalBias: value("#newMentalBias"),
    potential: value("#newPotential"),
    injuryProneness: value("#newInjuryProneness"),
    customized: Boolean(document.querySelector("#newCustomized")?.checked),
    traits: [...document.querySelectorAll('input[name="trait"]:checked')].map((input) => input.value)
  };
  try {
    sessionStorage.setItem(UPDATE_DRAFT_KEY, JSON.stringify(draft));
    sessionStorage.setItem(UPDATE_DRAFT_PENDING_KEY, "1");
  } catch {
    // Draft protection is best effort; the career save itself is still protected.
  }
}

export function restoreCreateDraft() {
  try {
    if (!sessionStorage.getItem(UPDATE_DRAFT_PENDING_KEY)) return;
    sessionStorage.removeItem(UPDATE_DRAFT_PENDING_KEY);
    const raw = sessionStorage.getItem(UPDATE_DRAFT_KEY);
    sessionStorage.removeItem(UPDATE_DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    const setValue = (selector, name) => {
      const node = document.querySelector(selector);
      if (node && draft[name] !== undefined) node.value = draft[name];
    };
    setValue("#newName", "name");
    setValue("#newPosition", "position");
    setValue("#newTalent", "talent");
    setValue("#newFamily", "family");
    setValue("#newNationality", "nationality");
    setValue("#newSecondNationality", "secondNationality");
    setValue("#newClub", "club");
    setValue("#newBirthYear", "birthYear");
    setValue("#newFoot", "foot");
    setValue("#newHeight", "height");
    setValue("#newWeight", "weight");
    setValue("#newNumber", "number");
    setValue("#newTechBias", "techBias");
    setValue("#newPhysicalBias", "physicalBias");
    setValue("#newMentalBias", "mentalBias");
    setValue("#newPotential", "potential");
    setValue("#newInjuryProneness", "injuryProneness");
    const customized = document.querySelector("#newCustomized");
    if (customized) customized.checked = Boolean(draft.customized);
    if (Array.isArray(draft.traits)) {
      document.querySelectorAll('input[name="trait"]').forEach((input) => {
        input.checked = draft.traits.includes(input.value);
      });
    }
  } catch {
    // A malformed draft should not block the create page.
  }
}
