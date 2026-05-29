<script lang="ts">
  import {
    applyRangeToProfile,
    buildStudentProfiles,
    filterStudents,
    filterStudentsInRange,
    sortStudents,
    type StudentProfile,
    type StudentSort
  } from '$lib/analytics/students';
  import StudentAttendanceBar from '$lib/components/StudentAttendanceBar.svelte';

  interface Props {
    rows: Record<string, string>[];
    rangeFrom?: string;
    rangeUntil?: string;
  }

  let { rows, rangeFrom = '', rangeUntil = '' }: Props = $props();

  let query = $state('');
  let sort = $state<StudentSort>('activity');
  let selectedFio = $state<string | null>(null);

  const allStudents = $derived(
    filterStudentsInRange(
      buildStudentProfiles(rows).map((p) => applyRangeToProfile(p, rangeFrom, rangeUntil)),
      rangeFrom,
      rangeUntil
    )
  );
  const visibleStudents = $derived(sortStudents(filterStudents(allStudents, query), sort));
  const selected = $derived(
    visibleStudents.find((s) => s.fio === selectedFio) ??
      visibleStudents[0] ??
      null
  );

  $effect(() => {
    if (visibleStudents.length && !visibleStudents.some((s) => s.fio === selectedFio)) {
      selectedFio = visibleStudents[0]?.fio ?? null;
    }
  });

  function statusClass(status: StudentProfile['status']): string {
    if (status === 'active') return 'ok';
    if (status === 'new') return 'new';
    return 'off';
  }
</script>

<section class="students">
  <aside class="list-panel card">
    <div class="list-head">
      <input type="search" placeholder="Поиск по имени, нику, контакту…" bind:value={query} />
      <label>
        Сортировка
        <select bind:value={sort}>
          <option value="activity">По активности</option>
          <option value="name">По имени</option>
          <option value="months">По месяцам посещений</option>
          <option value="last">По последнему визиту</option>
        </select>
      </label>
    </div>
    <p class="count">
      {visibleStudents.length} учеников
      {#if rangeFrom || rangeUntil}
        <span class="range-note">· период {rangeFrom || '…'} — {rangeUntil || '…'}</span>
      {/if}
    </p>
    <ul class="student-list">
      {#each visibleStudents as student}
        <li>
          <button
            type="button"
            class:selected={student.fio === selected?.fio}
            onclick={() => (selectedFio = student.fio)}
          >
            <span class="name">{student.fio}</span>
            <span class="meta">
              <span class="badge {statusClass(student.status)}">{student.statusLabel}</span>
              <span>{student.totalMonths} мес · {student.activity}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </aside>

  {#if selected}
    <article class="detail card">
      <header class="detail-head">
        <div>
          <h2>{selected.fio}</h2>
          {#if selected.nickname}
            <p class="nick">{selected.nickname}</p>
          {/if}
        </div>
        <span class="badge large {statusClass(selected.status)}">{selected.statusLabel}</span>
      </header>

      <div class="stats">
        <div><span>Активность</span><strong>{selected.activity}</strong></div>
        <div><span>Месяцев посещений</span><strong>{selected.totalMonths}</strong></div>
        <div><span>Срок в клубе</span><strong>{selected.lifetimeMonths} мес</strong></div>
        <div><span>Пропуски в периоде</span><strong>{selected.gapMonths}</strong></div>
        <div><span>Первый визит (таблица)</span><strong>{selected.firstVisitLabel || '—'}</strong></div>
        <div><span>Первый / последний месяц</span><strong>{selected.firstMonth ?? '—'} → {selected.lastMonth ?? '—'}</strong></div>
      </div>

      <section class="block">
        <h3>Контакты и договор</h3>
        <dl class="fields">
          <div><dt>Соглашение</dt><dd>{selected.agreement || '—'}</dd></div>
          <div><dt>Контакт</dt><dd>{selected.contact || '—'}</dd></div>
          <div><dt>Кол-во абонементов</dt><dd>{selected.subscriptionCount ?? '—'}</dd></div>
          <div class="wide"><dt>Комментарий</dt><dd>{selected.comment || '—'}</dd></div>
        </dl>
      </section>

      <section class="block">
        <h3>Посещения по месяцам</h3>
        <p class="legend">
          <span class="dot present"></span> был
          <span class="dot delayed"></span> отложенный платёж
        </p>
        <StudentAttendanceBar months={selected.months} />
      </section>
    </article>
  {:else}
    <div class="detail card empty">Нет учеников по текущему фильтру</div>
  {/if}
</section>

<style>
  .students {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 860px) {
    .students {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  }

  .list-head {
    display: grid;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
  }

  input[type='search'],
  select {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    background: #fff;
    width: 100%;
    font: inherit;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .count {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .range-note {
    color: var(--accent-dark);
  }

  .student-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 70vh;
    overflow: auto;
    display: grid;
    gap: 0.35rem;
  }

  .student-list button {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    padding: 0.55rem 0.65rem;
    text-align: left;
    cursor: pointer;
    display: grid;
    gap: 0.2rem;
  }

  .student-list button:hover,
  .student-list button.selected {
    border-color: var(--accent);
    background: rgba(47, 111, 78, 0.08);
  }

  .name {
    font-weight: 600;
    font-size: 0.92rem;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--muted);
    align-items: center;
  }

  .badge {
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .badge.large {
    font-size: 0.8rem;
    padding: 0.25rem 0.65rem;
  }

  .badge.ok {
    background: rgba(47, 111, 78, 0.15);
    color: var(--accent-dark);
  }

  .badge.new {
    background: rgba(31, 119, 180, 0.15);
    color: #1f77b4;
  }

  .badge.off {
    background: #eee;
    color: #666;
  }

  .detail-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
    margin-bottom: 1rem;
  }

  .detail h2 {
    margin: 0;
    font-size: 1.35rem;
  }

  .nick {
    margin: 0.2rem 0 0;
    color: var(--muted);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .stats div {
    background: #faf8f4;
    border-radius: 10px;
    padding: 0.65rem 0.75rem;
  }

  .stats span {
    display: block;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .stats strong {
    font-size: 1rem;
  }

  .block h3 {
    margin: 0 0 0.6rem;
    font-size: 0.95rem;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem 1rem;
    margin: 0;
  }

  .fields div {
    display: grid;
    gap: 0.15rem;
  }

  .fields .wide {
    grid-column: 1 / -1;
  }

  dt {
    font-size: 0.75rem;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 0.92rem;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.78rem;
    color: var(--muted);
    margin: 0 0 0.6rem;
    align-items: center;
  }

  .dot {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 3px;
    margin-right: 0.25rem;
    vertical-align: middle;
  }

  .dot.present {
    background: rgba(47, 111, 78, 0.5);
  }

  .dot.delayed {
    background: rgba(214, 160, 40, 0.6);
  }

  .empty {
    color: var(--muted);
    text-align: center;
    padding: 3rem 1rem;
  }
</style>
