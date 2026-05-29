<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    BarController,
    BarElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
    Title
  } from 'chart.js';
  import type { RetentionRow } from '$lib/analytics/pipeline';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    BarController,
    BarElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
    Title
  );

  interface Props {
    retention: RetentionRow[];
    mode: 'survival' | 'churn';
    title?: string;
  }

  let { retention, mode, title = '' }: Props = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function buildChart() {
    if (!canvas || !retention.length) return;
    chart?.destroy();

    const labels = retention.map((r) => `М${r.lifeMonth}`);

    if (mode === 'survival') {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Дожили до N-го месяца, %',
              data: retention.map((r) => r.survivedPct),
              borderColor: '#2ca02c',
              backgroundColor: '#2ca02c',
              tension: 0.2,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: !!title, text: title }, legend: { position: 'bottom' } },
          scales: { y: { min: 0, max: 105, title: { display: true, text: '%' } } }
        }
      });
    } else {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Ушли навсегда на N-м месяце, %',
              data: retention.map((r) => r.droppedPct),
              backgroundColor: 'rgba(214,39,40,0.75)',
              borderColor: '#d62728',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: !!title, text: title }, legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } }
        }
      });
    }
  }

  onMount(buildChart);
  onDestroy(() => chart?.destroy());
  $effect(() => {
    retention;
    mode;
    buildChart();
  });
</script>

<div class="chart-wrap">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-wrap {
    position: relative;
    height: 300px;
    width: 100%;
  }
</style>
