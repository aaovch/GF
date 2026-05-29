import Papa from 'papaparse';
import {
  getAvailableMonthKeys,
  runPipeline,
  type MonthKey,
  type PipelineOptions,
  type PipelineResult
} from '$lib/analytics/pipeline';

function parseCsv(csvText: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (parsed.errors.length) {
    console.warn('CSV parse warnings:', parsed.errors);
  }

  return parsed.data;
}

export function getMonthsFromCsv(csvText: string): MonthKey[] {
  return getAvailableMonthKeys(parseCsv(csvText));
}

export async function loadAndAnalyze(
  csvText: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  return runPipeline(parseCsv(csvText), {
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
