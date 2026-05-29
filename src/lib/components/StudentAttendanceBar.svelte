<script lang="ts">
  import type { StudentMonth } from '$lib/analytics/students';
  import type { MonthKey } from '$lib/analytics/pipeline';

  interface Props {
    months: StudentMonth[];
  }

  let { months }: Props = $props();

  const MONTH_LABELS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function shortLabel(key: MonthKey): string {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
  }
</script>

<div class="bar" role="list" aria-label="Посещения по месяцам">
  {#each months as m}
    <div
      class="cell"
      class:present={m.present}
      class:delayed={m.delayed}
      title="{shortLabel(m.key)}{m.present ? (m.delayed ? ' — отложенный платёж' : ' — был') : ''}"
      role="listitem"
    >
      <span class="label">{shortLabel(m.key)}</span>
    </div>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .cell {
    min-width: 3.1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.25rem 0.2rem;
    text-align: center;
    background: #f5f5f5;
    font-size: 0.68rem;
    color: var(--muted);
  }

  .cell.present {
    background: rgba(47, 111, 78, 0.2);
    border-color: #9bc4a8;
    color: var(--text);
    font-weight: 600;
  }

  .cell.delayed {
    background: rgba(214, 160, 40, 0.35);
    border-color: #d6a028;
  }

  .label {
    display: block;
    white-space: nowrap;
  }
</style>
