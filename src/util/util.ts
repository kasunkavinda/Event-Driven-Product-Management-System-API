export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const err = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
