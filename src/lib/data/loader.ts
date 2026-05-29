import Papa from 'papaparse';
import { runPipeline, type PipelineOptions, type PipelineResult } from '$lib/analytics/pipeline';

export async function loadAndAnalyze(
  csvText: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (parsed.errors.length) {
    console.warn('CSV parse warnings:', parsed.errors);
  }

  return runPipeline(parsed.data, {
    topActive: 20,
    ...options
  });
}

export async function fetchDefaultData(): Promise<string> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/table.csv`);
  if (!res.ok) throw new Error('Не удалось загрузить table.csv');
  return res.text();
}
