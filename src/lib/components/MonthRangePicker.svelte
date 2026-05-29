<script lang="ts">
  import type { MonthKey } from '$lib/analytics/pipeline';

  interface Props {
    months: MonthKey[];
    from: string;
    until: string;
    onchange?: (from: string, until: string) => void;
  }

  let { months, from = $bindable(''), until = $bindable(''), onchange }: Props = $props();

  let rangeStart = $state<string | null>(null);

  const MONTH_LABELS = [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
  ];

  function label(key: MonthKey): string {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
  }

  function inRange(key: MonthKey): boolean {
    if (!from || !until) return false;
    return key >= from && key <= until;
  }

  function emit() {
    onchange?.(from, until);
  }

  function setRange(nextFrom: string, nextUntil: string) {
    from = nextFrom;
    until = nextUntil;
    emit();
  }

  function selectAll() {
    if (!months.length) return;
    setRange(months[0], months[months.length - 1]);
  }

  function selectLast(count: number) {
    if (!months.length) return;
    const start = Math.max(0, months.length - count);
    setRange(months[start], months[months.length - 1]);
  }

  function onMonthClick(key: MonthKey) {
    if (!rangeStart) {
      rangeStart = key;
      from = key;
      until = key;
      emit();
      return;
    }

    if (key < rangeStart) {
      setRange(key, rangeStart);
    } else {
      setRange(rangeStart, key);
    }
    rangeStart = null;
  }

  function onMonthKeydown(event: KeyboardEvent, key: MonthKey) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onMonthClick(key);
    }
  }
</script>

<section class="picker">
  <div class="picker-head">
    <span class="picker-title">Период</span>
    <div class="presets">
      <button type="button" class="ghost" onclick={selectAll}>Весь период</button>
      <button type="button" class="ghost" onclick={() => selectLast(3)}>3 мес</button>
      <button type="button" class="ghost" onclick={() => selectLast(6)}>6 мес</button>
      <button type="button" class="ghost" onclick={() => selectLast(12)}>12 мес</button>
    </div>
  </div>

  <div class="inputs">
    <label>
      С
      <input
        type="month"
        bind:value={from}
        min={months[0]}
        max={until || months[months.length - 1]}
        onchange={emit}
      />
    </label>
    <label>
      По
      <input
        type="month"
        bind:value={until}
        min={from || months[0]}
        max={months[months.length - 1]}
        onchange={emit}
      />
    </label>
    <span class="hint">
      {#if from && until}
        {label(from as MonthKey)} — {label(until as MonthKey)}
      {:else}
        Выберите месяцы на ленте или в полях
      {/if}
    </span>
  </div>

  <div class="months" role="group" aria-label="Выбор месяцев">
    {#each months as key}
      <button
        type="button"
        class:selected={inRange(key)}
        class:edge={key === from || key === until}
        onclick={() => onMonthClick(key)}
        onkeydown={(e) => onMonthKeydown(e, key)}
        title={key}
      >
        {label(key)}
      </button>
    {/each}
  </div>
  <p class="tip">Клик — начало диапазона, второй клик — конец</p>
</section>

<style>
  .picker {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .picker-head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .picker-title {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .ghost {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.25rem 0.65rem;
    background: #fff;
    color: var(--text);
    font-size: 0.78rem;
    cursor: pointer;
  }

  .ghost:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
    margin-bottom: 0.75rem;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--muted);
  }

  input[type='month'] {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    background: #fff;
    min-width: 8rem;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--muted);
    padding-bottom: 0.45rem;
  }

  .months {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .months button {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.35rem 0.55rem;
    background: #fff;
    font-size: 0.78rem;
    cursor: pointer;
    color: var(--text);
    min-width: 3.6rem;
  }

  .months button:hover {
    border-color: var(--accent);
  }

  .months button.selected {
    background: rgba(47, 111, 78, 0.15);
    border-color: var(--accent);
  }

  .months button.edge {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .tip {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    color: var(--muted);
  }
</style>
