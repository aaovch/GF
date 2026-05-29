export type MonthKey = string; // YYYY-MM

export interface AttendanceRow {
  fio: string;
  month: Date;
  delayed: boolean;
}

export interface FlowRow {
  month: Date;
  monthKey: MonthKey;
  newClients: number | null;
  left: number | null;
  returned: number | null;
  active: number;
}

export interface RetentionRow {
  lifeMonth: number;
  survived: number;
  survivedPct: number;
  dropped: number;
  droppedPct: number;
  cumulativeDropped: number;
  cumulativeDroppedPct: number;
}

export interface PipelineResult {
  flow: FlowRow[];
  avgLifetime: number;
  retention: RetentionRow[];
  report: string;
  longData: AttendanceRow[];
  topActive: TopActiveMatrix | null;
}

export interface TopActiveMatrix {
  clients: string[];
  months: MonthKey[];
  matrix: number[][];
}

export interface PipelineOptions {
  from?: string;
  until?: string;
  maxMonth?: number;
  topActive?: number;
  title?: string;
}

const MONTH_RE = /^\d{2}\.\d{2}$/;
const VALUE_OK = new Set(['+', '1', '1.0']);

export function detectMonthColumns(columns: string[]): string[] {
  return columns.filter((c) => MONTH_RE.test(String(c).trim()));
}

export function parseMonthColumn(col: string): Date {
  const [mm, yy] = col.trim().split('.');
  const year = 2000 + Number(yy);
  return new Date(year, Number(mm) - 1, 1);
}

export function monthKey(date: Date): MonthKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthNameRu(date: Date): string {
  const months = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function isPresent(value: unknown): boolean {
  if (value == null || value === '') return false;
  const s = String(value).trim();
  if (VALUE_OK.has(s)) return true;
  const n = Number(String(value).replace(',', '.'));
  return !Number.isNaN(n) && n > 0;
}

function isDelayed(value: unknown): boolean {
  if (value == null || value === '') return false;
  const s = String(value).trim();
  if (s === '2') return true;
  const n = Number(String(value).replace(',', '.'));
  return n === 2;
}

export function meltAttendance(
  rows: Record<string, string>[],
  fioCol = 'ФИО'
): AttendanceRow[] {
  if (!rows.length) return [];
  const monthCols = detectMonthColumns(Object.keys(rows[0]));
  if (!monthCols.length) {
    throw new Error('Не найдены месячные колонки формата MM.YY (например, 08.24, 01.25).');
  }

  const result: AttendanceRow[] = [];
  for (const row of rows) {
    const fio = String(row[fioCol] ?? '').trim();
    if (!fio) continue;
    for (const col of monthCols) {
      const status = row[col];
      if (!isPresent(status)) continue;
      result.push({
        fio,
        month: parseMonthColumn(col),
        delayed: isDelayed(status)
      });
    }
  }

  return result.sort((a, b) => a.month.getTime() - b.month.getTime() || a.fio.localeCompare(b.fio, 'ru'));
}

export function parseMonthInput(value: string): Date {
  const s = value.trim().replace('.', '-');
  const [year, month] = s.split('-').map(Number);
  if (!year || !month) throw new Error('Месяц должен быть в формате YYYY-MM');
  return new Date(year, month - 1, 1);
}

/** @deprecated use parseMonthInput */
export function parseUntilMonth(until: string): Date {
  return parseMonthInput(until);
}

export function getAvailableMonthKeys(rows: Record<string, string>[]): MonthKey[] {
  if (!rows.length) return [];
  return detectMonthColumns(Object.keys(rows[0]))
    .map((col) => monthKey(parseMonthColumn(col)))
    .sort();
}

export function filterAttendance(
  data: AttendanceRow[],
  options: Pick<PipelineOptions, 'from' | 'until' | 'maxMonth'>
): AttendanceRow[] {
  let filtered = data;

  if (options.from) {
    const from = parseMonthInput(options.from);
    filtered = filtered.filter((r) => r.month >= from);
  }
  if (options.until) {
    const until = parseMonthInput(options.until);
    filtered = filtered.filter((r) => r.month <= until);
  }
  if (!options.from && !options.until && options.maxMonth != null) {
    const m = options.maxMonth;
    if (m < 1 || m > 12) throw new Error('--max-month должен быть в диапазоне 1..12');
    filtered = filtered.filter((r) => r.month.getMonth() + 1 <= m);
  }

  return filtered;
}

export function computeFlow(data: AttendanceRow[]): { flow: FlowRow[]; avgLifetime: number } {
  if (!data.length) return { flow: [], avgLifetime: 0 };

  const months = [...new Set(data.map((r) => r.month.getTime()))]
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  const stats: { month: Date; newClients: number; left: number; returned: number; clients: Set<string> }[] = [];
  let prevClients = new Set<string>();

  for (const month of months) {
    const current = new Set(data.filter((r) => r.month.getTime() === month.getTime()).map((r) => r.fio));
    const allPast = stats.length ? new Set(stats.flatMap((s) => [...s.clients])) : new Set<string>();
    const newClients = stats.length ? new Set([...current].filter((c) => !allPast.has(c))) : current;
    const left = new Set([...prevClients].filter((c) => !current.has(c)));
    let returned = new Set([...current].filter((c) => !prevClients.has(c)));
    if (stats.length) {
      returned = new Set([...returned].filter((c) => allPast.has(c)));
    }
    stats.push({
      month,
      newClients: newClients.size,
      left: left.size,
      returned: returned.size,
      clients: current
    });
    prevClients = current;
  }

  const activeByMonth = new Map<number, number>();
  for (const month of months) {
    const t = month.getTime();
    activeByMonth.set(
      t,
      new Set(data.filter((r) => r.month.getTime() === t).map((r) => r.fio)).size
    );
  }

  const flow: FlowRow[] = stats.map((s, i) => ({
    month: s.month,
    monthKey: monthKey(s.month),
    newClients: i === 0 ? null : s.newClients,
    left: i === 0 ? null : s.left,
    returned: i === 0 ? null : s.returned,
    active: activeByMonth.get(s.month.getTime()) ?? 0
  }));

  const lifetimes = new Map<string, { min: Date; max: Date }>();
  for (const row of data) {
    const cur = lifetimes.get(row.fio);
    if (!cur) {
      lifetimes.set(row.fio, { min: row.month, max: row.month });
    } else {
      if (row.month < cur.min) cur.min = row.month;
      if (row.month > cur.max) cur.max = row.month;
    }
  }

  let avgLifetime = 0;
  if (lifetimes.size) {
    const values = [...lifetimes.values()].map(
      ({ min, max }) =>
        (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1
    );
    avgLifetime = values.reduce((a, b) => a + b, 0) / values.length;
  }

  return { flow, avgLifetime };
}

export function computeRetentionFunnel(data: AttendanceRow[]): RetentionRow[] {
  if (!data.length) return [];

  const bounds = new Map<string, { first: Date; last: Date }>();
  for (const row of data) {
    const cur = bounds.get(row.fio);
    if (!cur) bounds.set(row.fio, { first: row.month, last: row.month });
    else {
      if (row.month < cur.first) cur.first = row.month;
      if (row.month > cur.last) cur.last = row.month;
    }
  }

  const lastObserved = new Date(Math.max(...data.map((r) => r.month.getTime())));
  const closed: number[] = [];

  for (const { first, last } of bounds.values()) {
    if (last < lastObserved) {
      const months =
        (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1;
      closed.push(months);
    }
  }

  if (!closed.length) return [];

  const total = closed.length;
  const distribution = new Map<number, number>();
  for (const m of closed) distribution.set(m, (distribution.get(m) ?? 0) + 1);
  const maxMonth = Math.max(...distribution.keys());

  const rows: RetentionRow[] = [];
  let cumulative = 0;
  for (let lifeMonth = 1; lifeMonth <= maxMonth; lifeMonth++) {
    const dropped = distribution.get(lifeMonth) ?? 0;
    cumulative += dropped;
    const survived = closed.filter((m) => m >= lifeMonth).length;
    rows.push({
      lifeMonth,
      survived,
      survivedPct: Math.round((survived / total) * 100),
      dropped,
      droppedPct: Math.round((dropped / total) * 100),
      cumulativeDropped: cumulative,
      cumulativeDroppedPct: Math.round((cumulative / total) * 100)
    });
  }
  return rows;
}

export function computeTopActiveMatrix(
  data: AttendanceRow[],
  topN: number,
  activityMap?: Map<string, number>
): TopActiveMatrix | null {
  if (!data.length || topN <= 0) return null;

  const months = [...new Set(data.map((r) => monthKey(r.month)))].sort();
  const presentClients = [...new Set(data.map((r) => r.fio))];

  let topClients: string[];
  if (activityMap && activityMap.size) {
    topClients = presentClients
      .map((fio) => ({ fio, activity: activityMap.get(fio) ?? 0 }))
      .sort((a, b) => b.activity - a.activity || a.fio.localeCompare(b.fio, 'ru'))
      .slice(0, topN)
      .map((x) => x.fio);
  } else {
    const monthSets = new Map<string, Set<MonthKey>>();
    for (const row of data) {
      const key = monthKey(row.month);
      if (!monthSets.has(row.fio)) monthSets.set(row.fio, new Set());
      monthSets.get(row.fio)!.add(key);
    }
    topClients = [...monthSets.entries()]
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], 'ru'))
      .slice(0, topN)
      .map(([fio]) => fio);
  }

  const presence = new Map<string, Set<MonthKey>>();
  for (const row of data) {
    if (!topClients.includes(row.fio)) continue;
    if (!presence.has(row.fio)) presence.set(row.fio, new Set());
    presence.get(row.fio)!.add(monthKey(row.month));
  }

  const matrix = topClients.map((fio) =>
    months.map((m) => (presence.get(fio)?.has(m) ? 1 : 0))
  );

  return { clients: topClients, months, matrix };
}

export function buildActivityMap(rows: Record<string, string>[], fioCol = 'ФИО'): Map<string, number> {
  const map = new Map<string, number>();
  if (!rows.length || !('Активность' in rows[0])) return map;
  for (const row of rows) {
    const fio = String(row[fioCol] ?? '').trim();
    if (!fio) continue;
    const val = Number(String(row['Активность']).replace(',', '.'));
    const prev = map.get(fio) ?? 0;
    map.set(fio, Math.max(prev, Number.isNaN(val) ? 0 : val));
  }
  return map;
}

export function telegramReport(
  data: AttendanceRow[],
  flow: FlowRow[],
  retention: RetentionRow[]
): string {
  if (!data.length) return 'Данных нет.';

  const months = [...new Set(data.map((r) => r.month.getTime()))]
    .sort((a, b) => a - b)
    .map((t) => new Date(t));
  const lastMonth = months[months.length - 1];
  const prevMonths = months.filter((m) => m < lastMonth);
  const prevMonth = prevMonths.length ? prevMonths[prevMonths.length - 1] : null;

  const byMonth = (month: Date) => new Set(data.filter((r) => r.month.getTime() === month.getTime()).map((r) => r.fio));
  const lastSet = byMonth(lastMonth);
  const prevSet = prevMonth ? byMonth(prevMonth) : new Set<string>();
  const beforeLast = new Set(data.filter((r) => r.month < lastMonth).map((r) => r.fio));

  const newClients = [...lastSet].filter((c) => !beforeLast.has(c)).sort((a, b) => a.localeCompare(b, 'ru'));
  const leftClients = prevMonth
    ? [...prevSet].filter((c) => !lastSet.has(c)).sort((a, b) => a.localeCompare(b, 'ru'))
    : [];
  const returnedClients = prevMonth
    ? [...lastSet].filter((c) => !prevSet.has(c) && beforeLast.has(c)).sort((a, b) => a.localeCompare(b, 'ru'))
    : [];
  const stableClients = prevMonth
    ? [...lastSet].filter((c) => prevSet.has(c)).sort((a, b) => a.localeCompare(b, 'ru'))
    : [];

  const countsByClient = new Map<string, number>();
  for (const row of data) countsByClient.set(row.fio, (countsByClient.get(row.fio) ?? 0) + 1);

  const leftActive3 = leftClients
    .filter((c) => (countsByClient.get(c) ?? 0) >= 3)
    .sort((a, b) => a.localeCompare(b, 'ru'));

  const delayedClients = data
    .filter((r) => r.month.getTime() === lastMonth.getTime() && r.delayed)
    .map((r) => r.fio)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a.localeCompare(b, 'ru'));

  const activeNow = lastSet.size;
  const activePrev = prevMonth ? prevSet.size : null;
  const activeLine =
    activePrev != null
      ? `Активные: ${activeNow} (пред. месяц: ${activePrev}, Δ${activeNow - activePrev >= 0 ? '+' : ''}${activeNow - activePrev})`
      : `Активные: ${activeNow} (пред. месяц: —)`;

  const block = (title: string, items: string[]) =>
    items.length === 0
      ? `${title} (0) — нет`
      : `${title} (${items.length}):\n` + items.map((x) => `• ${x}`).join('\n');

  const blockWithCounts = (title: string, items: string[]) => {
    if (!items.length) return `${title} (0) — нет`;
    return (
      `${title} (${items.length}):\n` +
      items.map((c) => `• ${c} — ${countsByClient.get(c) ?? 0} мес`).join('\n')
    );
  };

  const flowByMonth = new Map(flow.map((f) => [f.month.getTime(), f]));

  const buildComparison = (label: string, refMonth: Date): string | null => {
    const lastStats = flowByMonth.get(lastMonth.getTime());
    const refStats = flowByMonth.get(refMonth.getTime());
    if (!lastStats || !refStats) return null;
    const metrics: [keyof FlowRow, string][] = [
      ['newClients', '🟢 Новые'],
      ['left', '🔴 Ушли'],
      ['returned', '🔵 Вернулись'],
      ['active', '⚪ Активные']
    ];
    const lines = [label + ':'];
    let hasValues = false;
    for (const [key, labelRu] of metrics) {
      const curr = lastStats[key];
      const ref = refStats[key];
      if (curr == null && ref == null) continue;
      const currStr = curr == null ? '—' : String(curr);
      const refStr = ref == null ? '—' : String(ref);
      let deltaStr = 'Δ—';
      if (curr != null && ref != null) deltaStr = `Δ${Number(curr) - Number(ref) >= 0 ? '+' : ''}${Number(curr) - Number(ref)}`;
      lines.push(`  • ${labelRu}: ${refStr} → ${currStr} (${deltaStr})`);
      hasValues = true;
    }
    return hasValues ? lines.join('\n') : null;
  };

  const textBlocks = [
    `📊 Отчёт по клиентам за ${monthNameRu(lastMonth)}`,
    `Итого: пришли ${newClients.length}, ушли ${leftClients.length}, вернулись ${returnedClients.length}`,
    activeLine,
    block('🟢 Новые', newClients),
    block('🔴 Ушли', leftClients),
    block('🔵 Вернулись', returnedClients),
    block('⚪ Стабильные', stableClients),
    blockWithCounts('⚠️ Ушедшие (активные ≥3 мес)', leftActive3)
  ];

  const comparisonLines: string[] = [];
  if (prevMonth) {
    const comp = buildComparison('Предыдущий месяц', prevMonth);
    if (comp) comparisonLines.push(comp);
  }
  const yearAgo = new Date(lastMonth);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoMatch = flow.find((f) => f.month.getTime() === yearAgo.getTime());
  if (yearAgoMatch) {
    const comp = buildComparison(`${monthNameRu(yearAgo)} прошлого года`.replace(/^\w/, (c) => c.toUpperCase()), yearAgo);
    if (comp) comparisonLines.push(comp);
  }
  if (comparisonLines.length) textBlocks.push('📈 Сравнение:\n' + comparisonLines.join('\n\n'));

  const recordLines: string[] = [];
  const recordMetrics: [keyof FlowRow, string][] = [
    ['newClients', '🟢 Новые'],
    ['left', '🔴 Ушли'],
    ['returned', '🔵 Вернулись'],
    ['active', '⚪ Активные']
  ];
  for (const [key, label] of recordMetrics) {
    const series = flow.filter((f) => f[key] != null);
    const last = flowByMonth.get(lastMonth.getTime());
    if (!last || last[key] == null || series.length < 2) continue;
    const currentVal = Number(last[key]);
    const previous = series.filter((f) => f.month < lastMonth && f[key] != null);
    if (!previous.length) continue;
    const previousMax = Math.max(...previous.map((f) => Number(f[key])));
    if (currentVal > previousMax) {
      const peak = previous.filter((f) => Number(f[key]) === previousMax).pop()!;
      recordLines.push(
        `• ${label}: ${currentVal} (предыдущий максимум: ${previousMax} в периоде ${peak.monthKey}, Δ+${currentVal - previousMax})`
      );
    }
  }
  const incomingSeries = flow
    .filter((f) => f.newClients != null || f.returned != null)
    .map((f) => ({
      month: f.month,
      monthKey: f.monthKey,
      incoming: (f.newClients ?? 0) + (f.returned ?? 0)
    }));
  if (incomingSeries.length >= 2) {
    const lastIncoming = incomingSeries.find((x) => x.month.getTime() === lastMonth.getTime());
    if (lastIncoming) {
      const prevIncoming = incomingSeries.filter((x) => x.month < lastMonth);
      const prevMax = Math.max(...prevIncoming.map((x) => x.incoming));
      if (lastIncoming.incoming > prevMax) {
        const peak = prevIncoming.filter((x) => x.incoming === prevMax).pop()!;
        recordLines.push(
          `• 🟣 Всего входящих: ${lastIncoming.incoming} (предыдущий максимум: ${prevMax} в периоде ${peak.monthKey}, Δ+${lastIncoming.incoming - prevMax})`
        );
      }
    }
  }
  if (recordLines.length) textBlocks.push('🏆 Новые рекорды:\n' + recordLines.join('\n'));

  if (delayedClients.length) {
    textBlocks.push(
      `💳 Отложенный платеж по абонементу (${delayedClients.length}):\n` +
        delayedClients.map((c) => `• ${c}`).join('\n')
    );
  }

  if (retention.length) {
    const peak = retention.reduce((a, b) => (b.dropped > a.dropped ? b : a));
    const medIdx = retention.findIndex((r) => r.cumulativeDroppedPct >= 50);
    const medianMonth = medIdx >= 0 ? retention[medIdx].lifeMonth : null;
    const preview = retention.slice(0, 6).map(
      (r) =>
        `• М${r.lifeMonth}: дожили ${r.survived} (${r.survivedPct}%), отвалились ${r.dropped}`
    );
    const retentionLines = [
      '🧭 Воронка удержания (финальный отток):',
      `• Пик финального оттока: М${peak.lifeMonth} (отвалились ${peak.dropped} чел.)`
    ];
    if (medianMonth != null) retentionLines.push(`• 50% финально отваливаются к месяцу: М${medianMonth}`);
    retentionLines.push(...preview);
    retentionLines.push(
      '• Как читать:',
      '  - Удержание: какой % клиентов доживает минимум до N-го месяца.',
      '  - Финальный отток: какой % клиентов уходит навсегда именно на N-м месяце.'
    );
    textBlocks.push(retentionLines.join('\n'));
  }

  return textBlocks.join('\n\n');
}

export function runPipeline(
  rows: Record<string, string>[],
  options: PipelineOptions = {}
): PipelineResult {
  if (!rows.length || !('ФИО' in rows[0])) {
    throw new Error("В таблице нет колонки 'ФИО'.");
  }

  let longData = meltAttendance(rows);
  longData = filterAttendance(longData, options);
  const { flow, avgLifetime } = computeFlow(longData);
  const retention = computeRetentionFunnel(longData);
  const report = telegramReport(longData, flow, retention);

  let topActive: TopActiveMatrix | null = null;
  if (options.topActive && options.topActive > 0) {
    const activityMap = buildActivityMap(rows);
    topActive = computeTopActiveMatrix(longData, options.topActive, activityMap);
  }

  return { flow, avgLifetime, retention, report, longData, topActive };
}
