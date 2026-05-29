declare module 'papaparse' {
  export interface ParseResult<T> {
    data: T[];
    errors: unknown[];
    meta: unknown;
  }

  export interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    transformHeader?: (header: string) => string;
  }

  export function parse<T>(input: string, config?: ParseConfig): ParseResult<T>;
}
