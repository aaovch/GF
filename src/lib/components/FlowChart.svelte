<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    BarController,
    BarElement,
    Filler,
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
    BarController,
    BarElement,
    Filler,
    Legend,
    Tooltip,
    Title
  );

  interface Props {
    flow: FlowRow[];
    avgLifetime: number;
    title?: string;
  }

  let { flow, avgLifetime, title = 'Поток клиентов' }: Props = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function buildChart() {
    if (!canvas || !flow.length) return;
    chart?.destroy();

    const labels = flow.map((f) => f.monthKey);
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Активные',
            data: flow.map((f) => f.active),
            borderColor: '#888',
            backgroundColor: 'rgba(176,176,176,0.25)',
            fill: true,
            tension: 0.2,
            pointRadius: 3
          },
          {
            label: 'Новые',
            data: flow.map((f) => f.newClients),
            borderColor: '#2ca02c',
            backgroundColor: '#2ca02c',
            tension: 0.2,
            pointRadius: 4,
            pointStyle: 'triangle'
          },
          {
            label: 'Ушли',
            data: flow.map((f) => f.left),
            borderColor: '#d62728',
            backgroundColor: '#d62728',
            tension: 0.2,
            pointRadius: 4
          },
          {
            label: 'Вернулись',
            data: flow.map((f) => f.returned),
            borderColor: '#1f77b4',
            backgroundColor: '#1f77b4',
            borderDash: [6, 4],
            tension: 0.2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, font: { size: 16 } },
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Клиенты' } },
          x: { title: { display: true, text: 'Месяц' } }
        }
      },
      plugins: [
        {
          id: 'avgLifetime',
          afterDraw(c) {
            const yScale = c.scales.y;
            const y = yScale.getPixelForValue(avgLifetime);
            const ctx = c.ctx;
            ctx.save();
            ctx.strokeStyle = '#999';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(c.chartArea.left, y);
            ctx.lineTo(c.chartArea.right, y);
            ctx.stroke();
            ctx.fillStyle = '#666';
            ctx.font = '11px sans-serif';
            ctx.fillText(`Средняя жизнь ≈ ${avgLifetime.toFixed(1)} мес`, c.chartArea.left + 8, y - 6);
            ctx.restore();
          }
        }
      ]
    });
  }

  onMount(buildChart);
  onDestroy(() => chart?.destroy());

  $effect(() => {
    flow;
    avgLifetime;
    buildChart();
  });
</script>

<div class="chart-wrap">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-wrap {
    position: relative;
    height: 360px;
    width: 100%;
  }
</style>
