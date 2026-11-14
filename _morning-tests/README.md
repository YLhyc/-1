# 晨听播放器 · 验证脚本

这些脚本用于验证 `../index.html` 中晨听（morning）播放器的状态机、`audio-cache.js` 缓存管理器与 `sw.js` 离线缓存规则。脚本只读应用文件，不会破坏应用数据。

## 运行命令

在项目根目录（`words-publish-202`）下执行：

```powershell
# 1) 静态连线审计：检查内联 onclick、晨听 DOM 元素 id、引擎关键函数与核心资源文件存在性
node _morning-tests\static-wiring-audit.js

# 2) 真实引擎函数抽取 + 假 Audio 驱动的状态机单元测试
node _morning-tests\extract-and-unit-test.js
node _morning-tests\_morning_extracted.js

# 3) 移动端 WebView 播放限制与异步竞争回归测试
node _morning-tests\mobile-playback-regressions.js

# 4) 发布边界与版本一致性检查（SW 缓存路由、hb/words.json 独立化、版本戳一致性）
node _morning-tests\release-regressions.js

# 5) 核心播放不变量审计（onpause 240ms 防抖、syncPlayback 暂停防复活、Promise 序列门禁）
node _morning-tests\invariant-audit.js

# 6) 浏览器端到端测试（Chrome + Playwright，真实音频播放与手势模拟）
$env:NODE_PATH="C:\Users\23756\AppData\Roaming\npm\node_modules"
node _morning-tests\browser-e2e.js
```

## 测试套件说明

- **`static-wiring-audit.js`**：
  验证 `index.html` 中晨听视图的内联事件（`startNewMorning`、`toggleMorningPause` 等）均能正确解析到已定义函数；验证 `#morningStartButton`、`#mpBtnPlay`、`#mpProgressNow` 等所有 DOM 节点均存在；验证 `audio-cache.js` 与 `sw.js` 存在且 `au.onpause` 不残留直接 `play()` 调用。

- **`extract-and-unit-test.js` & `_morning_extracted.js`**：
  从 `index.html` 中精准抽取真实播放器函数（包含 `playMorningCurrent`、`attemptMorningResume`、`toggleMorningPause`、`pauseMorningForAudioFailure` 等），配合假 `Audio` 元素全面覆盖：
  - 用户暂停最高优先级与多次切换幂等性；
  - `onpause` 240ms 受控恢复与用户暂停取消机制；
  - 播放失败（`pauseMorningForAudioFailure`）进入重试态及用户重试恢复；
  - `attemptMorningResume` 防并发合并与越界拒绝；
  - 快速切词 `_morningPlayToken` 与 `playPromiseId` 异步作废；
  - 结束晨听（`endMorningSession`）的全局定时器与音频释放。

- **`mobile-playback-regressions.js`**：
  针对移动端 iOS WebView 与移动浏览器常见限制进行确定性回归验证：
  - 意外暂停受控恢复 vs 用户主动暂停绝对防复活；
  - `NotAllowedError` 手势被拒进入重试态 vs `AbortError` 安全处理；
  - 上一词/下一词/重听的快速连击 Token 作废机制；
  - 视图切换挂起（`suspendMorningForAppNavigation`）在页面恢复时不被 `syncMorningPlayback` 意外复活；
  - 跨片段双槽交替与连续播放元素授权保全。

- **`release-regressions.js`**：
  验证版本与发布完整性：
  - `version.json` 的版本号与 `sw.js` 的 `CACHE = 'kv-X.X.X'` 保持一致；
  - `sw.js` 对 `/hb/words.json`（核心数据）采用 StaleWhileRevalidate，对 `/wordbank/audio/` `.mp3` 采用缓存优先；
  - `hb/words.json` 存在且包含 6549 条词目，且 `hb/index.html` 未内联庞大数组；
  - 晨听引擎异常重试态转换与结束释放。

- **`invariant-audit.js`**：
  通过源码 AST/括号平衡提取验证引擎代码的核心不变量：
  - `au.onpause` 绝不直调 `.play()`，严格走 240ms `unexpectedPauseTimer` -> `attemptMorningResume(false)`；
  - `au.onended` 与 `au.onerror` 均先解除绑定或委托错误处理；
  - `syncMorningPlayback` 在暂停或已结束态下绝不调用恢复；
  - 播放 Promise 序列与 PlayToken 双重门禁。

- **`browser-e2e.js`**：
  在真实 Chrome 进程中模拟移动端点击授权，驱动真实音频加载并检测 `currentTime` 增长，验证播放按钮 SVG 状态（`<rect>` 暂停图标 vs `<polygon>` 播放/重试图标）及文本状态切换。
