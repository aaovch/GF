<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
    Title
  } from 'chart.js';
  import type { FlowRow } from '$lib/analytics/pipeline';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Legend,
    Tooltip,
    Title
  );

  interface Props {
    flow: FlowRow[];
    title?: string;
    field: 'active' | 'incoming';
  }

  let { flow, title = '', field }: Props = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function buildChart() {
    if (!canvas || !flow.length) return;
    chart?.destroy();

    const labels = flow.map((f) => f.monthKey);

    if (field === 'active') {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Активные',
              data: flow.map((f) => f.active),
              borderColor: '#444',
              backgroundColor: '#444',
              tension: 0.2,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: !!title, text: title }, legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
      return;
    }

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Всего входящих',
            data: flow.map((f) =>
              f.newClients == null && f.returned == null ? null : (f.newClients ?? 0) + (f.returned ?? 0)
            ),
            borderColor: '#9467bd',
            tension: 0.2,
            pointRadius: 4
          },
          {
            label: 'Новые',
            data: flow.map((f) => f.newClients),
            borderColor: '#2ca02c',
            borderDash: [5, 3],
            tension: 0.2,
            pointRadius: 3
          },
          {
            label: 'Вернулись',
            data: flow.map((f) => f.returned),
            borderColor: '#1f77b4',
            borderDash: [2, 2],
            tension: 0.2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { title: { display: !!title, text: title }, legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  onMount(buildChart);
  onDestroy(() => chart?.destroy());
  $effect(() => {
    flow;
    field;
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
