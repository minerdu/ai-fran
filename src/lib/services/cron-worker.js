/**
 * Cron Worker — 进程内定时执行调度器
 *
 * 在 Next.js Server 进程中以 setInterval 方式轮询 `/api/cron/engine`，
 * 自动执行已审批+已排期的任务。
 *
 * 设计原则：
 * - 单例模式：避免多次 import 导致重复启动
 * - 优雅重入保护：上一次轮询未结束时跳过
 * - 失败静默：不因 cron 异常影响主进程
 */

let _started = false;
let _running = false;
let _intervalId = null;

const POLL_INTERVAL_MS = 60_000; // 60 秒轮询一次

/**
 * 获取本地服务 URL（在 Next.js 内部调用自身 API）
 */
function getBaseUrl() {
  // 在 Server-side Next.js 中，直接使用 localhost
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

/**
 * 执行一次轮询
 */
async function tick() {
  if (_running) {
    console.log('[CronWorker] Previous tick still running, skipping.');
    return;
  }
  _running = true;

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/cron/engine`, {
      method: 'GET',
      headers: { 'x-cron-secret': 'internal' },
      signal: AbortSignal.timeout(30_000), // 30 秒超时
    });

    if (!res.ok) {
      console.warn(`[CronWorker] Engine returned status ${res.status}`);
      return;
    }

    const data = await res.json();

    if (data.status === 'idle') {
      // 无任务，静默
      return;
    }

    console.log(
      `[CronWorker] Engine run: ${data.executed || 0} executed, ${data.failed || 0} failed, ${data.skipped || 0} skipped`
    );
  } catch (err) {
    // 启动初期服务可能尚未就绪，静默处理
    if (!err.message?.includes('ECONNREFUSED')) {
      console.warn('[CronWorker] Tick error:', err.message);
    }
  } finally {
    _running = false;
  }
}

/**
 * 执行一次自主招商引擎扫描（9 旅程 Agent 编排）
 */
let _lastAutonomousRun = 0;
let _autonomousIntervalId = null;

async function tickAutonomous() {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/cron/autonomous-engine`, {
      method: 'GET',
      headers: { 'x-cron-secret': 'internal' },
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      console.warn(`[CronWorker] Autonomous engine returned status ${res.status}`);
      return;
    }

    const data = await res.json();
    _lastAutonomousRun = Date.now();

    if (data.status === 'idle') return;

    console.log(
      `[CronWorker] Autonomous engine: ${data.tasksCreated || 0} tasks created, coverage ${data.coverageRate || '0/9'}`
    );
  } catch (err) {
    if (!err.message?.includes('ECONNREFUSED')) {
      console.warn('[CronWorker] Autonomous engine error:', err.message);
    }
  }
}

/**
 * 自主引擎智能调度：
 * - 工作时段 (08:00-22:00): 每 1 小时扫描一次
 * - 非工作时段 (22:00-08:00): 每 6 小时扫描一次
 *
 * 每分钟检查一次是否需要触发扫描。
 */
function scheduleAutonomousEngine() {
  const checkAndRun = () => {
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 8 && hour < 22;
    const intervalMs = isBusinessHours ? 3_600_000 : 21_600_000; // 1h or 6h
    const elapsed = Date.now() - _lastAutonomousRun;

    if (elapsed >= intervalMs) {
      const label = isBusinessHours ? '工作时段 1h' : '非工作时段 6h';
      console.log(`[CronWorker] Autonomous engine scheduled (${label}, ${hour}:00)`);
      tickAutonomous();
    }
  };

  // 首次立即执行
  tickAutonomous();

  // 每 60 秒检查一次是否该触发
  _autonomousIntervalId = setInterval(checkAndRun, 60_000);
}

/**
 * 启动 Cron Worker（单例）
 * 调用方式：在服务端入口处（如 Server Component 或 instrumentation.js）调用一次即可。
 */
export function startCronWorker() {
  if (_started) return;
  _started = true;

  console.log(`[CronWorker] Starting: task engine ${POLL_INTERVAL_MS / 1000}s + autonomous engine (8-22时每1h / 其余每6h)`);

  // 首次延迟 10 秒执行（等待服务完全启动）
  setTimeout(() => {
    tick();
    _intervalId = setInterval(tick, POLL_INTERVAL_MS);

    // 自主招商引擎：智能时段调度
    scheduleAutonomousEngine();
  }, 10_000);
}

/**
 * 停止 Cron Worker（用于测试或 graceful shutdown）
 */
export function stopCronWorker() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_autonomousIntervalId) {
    clearInterval(_autonomousIntervalId);
    _autonomousIntervalId = null;
  }
  _started = false;
  _running = false;
  console.log('[CronWorker] Stopped.');
}

/**
 * 获取 Worker 状态
 */
export function getCronWorkerStatus() {
  return {
    started: _started,
    running: _running,
    intervalMs: POLL_INTERVAL_MS,
  };
}

export default { startCronWorker, stopCronWorker, getCronWorkerStatus };
