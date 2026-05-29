<script lang="ts">
  import type { TopActiveMatrix } from '$lib/analytics/pipeline';

  interface Props {
    data: TopActiveMatrix;
    title?: string;
  }

  let { data, title = 'ТОП активных' }: Props = $props();
</script>

<section class="heatmap">
  <h3>{title}</h3>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th class="sticky">Клиент</th>
          {#each data.months as month}
            <th>{month}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each data.clients as client, i}
          <tr>
            <td class="sticky name">{client}</td>
            {#each data.matrix[i] as present}
              <td class:present={present === 1}></td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .heatmap h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 600;
  }

  .scroll {
    overflow: auto;
    max-height: 520px;
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  table {
    border-collapse: collapse;
    font-size: 0.78rem;
    min-width: 100%;
  }

  th,
  td {
    border: 1px solid #e8e8e8;
    padding: 0.35rem 0.45rem;
    text-align: center;
    white-space: nowrap;
  }

  th {
    background: #f6f6f6;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .sticky {
    position: sticky;
    left: 0;
    background: #fff;
    z-index: 2;
    text-align: left;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  thead .sticky {
    z-index: 3;
    background: #f6f6f6;
  }

  .name {
    font-weight: 500;
  }

  td.present {
    background: #2ca02c;
  }
</style>
