import {
  detectMonthColumns,
  monthKey,
  parseMonthColumn,
  type MonthKey
} from '$lib/analytics/pipeline';

const VALUE_OK = new Set(['+', '1', '1.0']);

export interface StudentMonth {
  key: MonthKey;
  present: boolean;
  delayed: boolean;
}

export interface StudentProfile {
  fio: string;
  nickname: string;
  agreement: string;
  contact: string;
  comment: string;
  subscriptionCount: number | null;
  firstVisitLabel: string;
  activity: number;
  months: StudentMonth[];
  totalMonths: number;
  firstMonth: MonthKey | null;
  lastMonth: MonthKey | null;
  lifetimeMonths: number;
  gapMonths: number;
  status: 'active' | 'inactive' | 'new';
  statusLabel: string;
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

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val != null && String(val).trim() !== '') return String(val).trim();
  }
  return '';
}

function parseNum(value: string): number | null {
  if (!value) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function monthIndex(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number);
  return y * 12 + m;
}

function lifetimeBetween(first: MonthKey, last: MonthKey): number {
  return monthIndex(last) - monthIndex(first) + 1;
}

function countGaps(months: StudentMonth[]): number {
  const present = months.filter((m) => m.present);
  if (present.length < 2) return 0;
  const first = monthIndex(present[0].key);
  const last = monthIndex(present[present.length - 1].key);
  const span = last - first + 1;
  return Math.max(0, span - present.length);
}

export function buildStudentProfiles(rows: Record<string, string>[]): StudentProfile[] {
  if (!rows.length) return [];

  const monthCols = detectMonthColumns(Object.keys(rows[0]));
  const allMonthKeys = monthCols.map((c) => monthKey(parseMonthColumn(c)));
  const lastGlobalMonth = allMonthKeys[allMonthKeys.length - 1] ?? null;

  const profiles: StudentProfile[] = [];

  for (const row of rows) {
    const fio = pick(row, 'ФИО');
    if (!fio) continue;

    const months: StudentMonth[] = monthCols.map((col) => {
      const val = row[col];
      return {
        key: monthKey(parseMonthColumn(col)),
        present: isPresent(val),
        delayed: isDelayed(val)
      };
    });

    const presentMonths = months.filter((m) => m.present);
    const firstMonth = presentMonths[0]?.key ?? null;
    const lastMonth = presentMonths[presentMonths.length - 1]?.key ?? null;

    let status: StudentProfile['status'] = 'inactive';
    let statusLabel = 'Не ходит';

    if (lastMonth && lastGlobalMonth) {
      if (lastMonth === lastGlobalMonth) {
        const firstVisit = pick(row, 'Когда впервые пришел');
        const firstVisitKey = firstVisit && /^\d{2}\.\d{2}$/.test(firstVisit)
          ? monthKey(parseMonthColumn(firstVisit))
          : firstMonth;
        if (firstVisitKey === lastGlobalMonth) {
          status = 'new';
          statusLabel = 'Новый';
        } else {
          status = 'active';
          statusLabel = 'Активен';
        }
      }
    }

    profiles.push({
      fio,
      nickname: pick(row, 'Никнейм'),
      agreement: pick(row, 'Соглашение'),
      contact: pick(row, 'Контакт'),
      comment: pick(row, 'Комментарий'),
      subscriptionCount: parseNum(pick(row, 'Кол-во абон')),
      firstVisitLabel: pick(row, 'Когда впервые пришел'),
      activity: parseNum(pick(row, 'Активность')) ?? 0,
      months,
      totalMonths: presentMonths.length,
      firstMonth,
      lastMonth,
      lifetimeMonths: firstMonth && lastMonth ? lifetimeBetween(firstMonth, lastMonth) : 0,
      gapMonths: countGaps(months),
      status,
      statusLabel
    });
  }

  return profiles.sort((a, b) => b.activity - a.activity || a.fio.localeCompare(b.fio, 'ru'));
}

function deriveStatus(
  presentMonths: StudentMonth[],
  referenceMonth: MonthKey | null
): { status: StudentProfile['status']; statusLabel: string } {
  if (!referenceMonth || !presentMonths.length) {
    return { status: 'inactive', statusLabel: 'Не ходит' };
  }

  const presentAtEnd = presentMonths.some((m) => m.key === referenceMonth);
  if (!presentAtEnd) {
    return { status: 'inactive', statusLabel: 'Не ходит' };
  }

  const firstInPeriod = presentMonths[0].key;
  if (firstInPeriod === referenceMonth) {
    return { status: 'new', statusLabel: 'Новый' };
  }

  return { status: 'active', statusLabel: 'Активен' };
}

/** Оставляет только месяцы и метрики внутри выбранного периода. */
export function applyRangeToProfile(
  profile: StudentProfile,
  from?: string,
  until?: string
): StudentProfile {
  let months = profile.months;
  if (from) months = months.filter((m) => m.key >= from);
  if (until) months = months.filter((m) => m.key <= until);

  const presentMonths = months.filter((m) => m.present);
  const firstMonth = presentMonths[0]?.key ?? null;
  const lastMonth = presentMonths[presentMonths.length - 1]?.key ?? null;
  const referenceMonth = until ?? lastMonth;
  const { status, statusLabel } = deriveStatus(presentMonths, referenceMonth);

  return {
    ...profile,
    months,
    totalMonths: presentMonths.length,
    firstMonth,
    lastMonth,
    lifetimeMonths: firstMonth && lastMonth ? lifetimeBetween(firstMonth, lastMonth) : 0,
    gapMonths: countGaps(months),
    status,
    statusLabel
  };
}

export function filterStudentsInRange(
  list: StudentProfile[],
  from?: string,
  until?: string
): StudentProfile[] {
  if (!from && !until) return list;
  return list.filter((s) => s.totalMonths > 0);
}

export function sortStudents(list: StudentProfile[], sort: StudentSort): StudentProfile[] {
  const copy = [...list];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.fio.localeCompare(b.fio, 'ru'));
    case 'months':
      return copy.sort((a, b) => b.totalMonths - a.totalMonths || a.fio.localeCompare(b.fio, 'ru'));
    case 'last':
      return copy.sort((a, b) => {
        const ak = a.lastMonth ?? '';
        const bk = b.lastMonth ?? '';
        return bk.localeCompare(ak) || a.fio.localeCompare(b.fio, 'ru');
      });
    default:
      return copy.sort((a, b) => b.activity - a.activity || a.fio.localeCompare(b.fio, 'ru'));
  }
}

export function filterStudents(list: StudentProfile[], query: string): StudentProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (s) =>
      s.fio.toLowerCase().includes(q) ||
      s.nickname.toLowerCase().includes(q) ||
      s.contact.toLowerCase().includes(q) ||
      s.comment.toLowerCase().includes(q)
  );
}
