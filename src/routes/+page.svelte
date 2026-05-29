<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { fetchDefaultData, getCsvRows, getMonthsFromCsv, loadAndAnalyze } from '$lib/data/loader';
  import type { MonthKey, PipelineResult } from '$lib/analytics/pipeline';
  import FlowChart from '$lib/components/FlowChart.svelte';
  import SimpleLineChart from '$lib/components/SimpleLineChart.svelte';
  import RetentionChart from '$lib/components/RetentionChart.svelte';
  import TopActiveHeatmap from '$lib/components/TopActiveHeatmap.svelte';
  import MonthRangePicker from '$lib/components/MonthRangePicker.svelte';
  import StudentsPanel from '$lib/components/StudentsPanel.svelte';

  type TabId = 'analytics' | 'students';

  let activeTab = $state<TabId>('analytics');
  let loading = $state(true);
  let error = $state<string | null>(null);
  let result = $state<PipelineResult | null>(null);
  let csvText = $state('');
  let csvRows = $state<Record<string, string>[]>([]);
  let availableMonths = $state<MonthKey[]>([]);
  let fromMonth = $state('');
  let untilMonth = $state('');
  let topActive = $state(20);
  let title = $state('Поток клиентов');

  function normalizeRange() {
    if (fromMonth && untilMonth && fromMonth > untilMonth) {
      const tmp = fromMonth;
      fromMonth = untilMonth;
      untilMonth = tmp;
    }
  }

  async function analyze(text?: string) {
    loading = true;
    error = null;
    try {
      if (text !== undefined) {
        csvText = text;
        csvRows = getCsvRows(csvText);
        availableMonths = getMonthsFromCsv(csvText);
        if (availableMonths.length) {
          fromMonth = availableMonths[0];
          untilMonth = availableMonths[availableMonths.length - 1];
        }
      }

      if (!csvText) {
        csvText = await fetchDefaultData();
        csvRows = getCsvRows(csvText);
        availableMonths = getMonthsFromCsv(csvText);
        if (availableMonths.length) {
          fromMonth = availableMonths[0];
          untilMonth = availableMonths[availableMonths.length - 1];
        }
      }

      normalizeRange();

      result = await loadAndAnalyze(csvText, {
        from: fromMonth || undefined,
        until: untilMonth || undefined,
        reportMonth: untilMonth || undefined,
        topActive,
        title
      });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Ошибка загрузки данных';
      result = null;
    } finally {
      loading = false;
    }
  }

  function onRangeChange(from: string, until: string) {
    fromMonth = from;
    untilMonth = until;
    normalizeRange();
    analyze();
  }

  async function onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await analyze(await file.text());
  }

  onMount(() => analyze());
</script>

<svelte:head>
  <title>GF — Аналитика клиентов</title>
</svelte:head>

<div class="page">
  <header>
    <div>
      <p class="eyebrow">GF Analytics</p>
      <h1>Аналитика потока клиентов</h1>
      <p class="subtitle">Отчёты и графики по посещаемости из CSV</p>
    </div>
    <div class="controls">
      <label>
        ТОП активных
        <input type="number" min="0" max="50" bind:value={topActive} />
      </label>
      <button type="button" onclick={() => analyze()}>Обновить</button>
      <label class="file-btn">
        Загрузить CSV
        <input type="file" accept=".csv,text/csv" onchange={onFileSelect} hidden />
      </label>
    </div>
  </header>

  <nav class="tabs" aria-label="Разделы">
    <button type="button" class:active={activeTab === 'analytics'} onclick={() => (activeTab = 'analytics')}>
      Аналитика
    </button>
    <button type="button" class:active={activeTab === 'students'} onclick={() => (activeTab = 'students')}>
      Ученики
    </button>
  </nav>

  {#if availableMonths.length}
    <MonthRangePicker
      months={availableMonths}
      bind:from={fromMonth}
      bind:until={untilMonth}
      onchange={onRangeChange}
    />
  {/if}

  {#if loading}
    <div class="state">Загрузка данных…</div>
  {:else if error}
    <div class="state error">{error}</div>
  {:else if activeTab === 'students'}
    <StudentsPanel rows={csvRows} rangeFrom={fromMonth} rangeUntil={untilMonth} />
  {:else if result}
    <section class="metrics">
      <article>
        <span>Средняя жизнь клиента</span>
        <strong>{result.avgLifetime.toFixed(1)} мес</strong>
      </article>
      <article>
        <span>Месяцев в периоде</span>
        <strong>{result.flow.length}</strong>
      </article>
      <article>
        <span>Записей посещений</span>
        <strong>{result.longData.length}</strong>
      </article>
    </section>

    <section class="grid two">
      <div class="card">
        <FlowChart flow={result.flow} avgLifetime={result.avgLifetime} {title} />
      </div>
      <div class="card">
        <SimpleLineChart flow={result.flow} field="active" title="Активные по месяцам" />
      </div>
      <div class="card">
        <SimpleLineChart flow={result.flow} field="incoming" title="Входящий поток" />
      </div>
      {#if result.retention.length}
        <div class="card">
          <RetentionChart retention={result.retention} mode="survival" title="Удержание по месяцам" />
        </div>
        <div class="card">
          <RetentionChart retention={result.retention} mode="churn" title="Финальный отток" />
        </div>
      {/if}
    </section>

    {#if result.topActive}
      <section class="card">
        <TopActiveHeatmap data={result.topActive} title="ТОП-{topActive} активных по месяцам" />
      </section>
    {/if}

    <section class="card report">
      <div class="report-head">
        <h2>
          Текстовый отчёт
          {#if result.reportMonthKey}
            <span class="report-month">за {result.reportMonthKey}</span>
          {/if}
        </h2>
        <button
          type="button"
          onclick={() => navigator.clipboard?.writeText(result?.report ?? '')}
        >
          Копировать
        </button>
      </div>
      <pre>{result.report}</pre>
    </section>
  {/if}

  <footer>
    <span>Данные по умолчанию: <code>{base}/data/table.csv</code></span>
  </footer>
</div>

<style>
  :global(:root) {
    --bg: #f4f1ea;
    --card: #ffffff;
    --text: #1f1f1f;
    --muted: #666;
    --border: #ddd6c8;
    --accent: #2f6f4e;
    --accent-dark: #245a3f;
    --danger: #b42318;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: 'Segoe UI', system-ui, sans-serif;
    background:
      radial-gradient(circle at top right, rgba(47, 111, 78, 0.12), transparent 28rem),
      var(--bg);
    color: var(--text);
    line-height: 1.5;
  }

  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    justify-content: space-between;
    align-items: end;
    margin-bottom: 0.75rem;
  }

  .tabs {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1rem;
    padding: 0.25rem;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid var(--border);
    border-radius: 12px;
    width: fit-content;
  }

  .tabs button {
    border: 0;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    background: transparent;
    color: var(--muted);
    font-weight: 600;
    cursor: pointer;
  }

  .tabs button.active {
    background: var(--accent);
    color: #fff;
  }

  .tabs button:not(.active):hover {
    background: rgba(47, 111, 78, 0.1);
    color: var(--accent-dark);
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
    color: var(--accent);
    font-weight: 700;
  }

  h1 {
    margin: 0.2rem 0;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
  }

  .subtitle {
    margin: 0;
    color: var(--muted);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--muted);
  }

  input[type='number'] {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    background: #fff;
    min-width: 5rem;
  }

  button,
  .file-btn {
    border: 0;
    border-radius: 8px;
    padding: 0.55rem 0.9rem;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }

  button:hover,
  .file-btn:hover {
    background: var(--accent-dark);
  }

  .file-btn {
    display: inline-flex;
    align-items: center;
  }

  .state {
    padding: 2rem;
    text-align: center;
    color: var(--muted);
  }

  .state.error {
    color: var(--danger);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .metrics article {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
  }

  .metrics span {
    display: block;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .metrics strong {
    font-size: 1.5rem;
  }

  .grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .grid.two {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  }

  .report-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .report h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .report-month {
    font-weight: 500;
    color: var(--muted);
    font-size: 0.95rem;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: 0.92rem;
    background: #faf8f4;
    border-radius: 10px;
    padding: 1rem;
    max-height: 520px;
    overflow: auto;
  }

  footer {
    margin-top: 1.5rem;
    color: var(--muted);
    font-size: 0.85rem;
  }

  code {
    background: #ece7dc;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }
</style>
