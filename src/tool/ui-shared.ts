import { DEFAULT_STATE, PRESETS, convert, type ToolState } from './types';

export { PRESETS };

/** UI-facing mode list for the direction toggle. */
export const DIRECTIONS: { value: ToolState['direction']; label: string; hint: string }[] = [
  { value: 'escape', label: 'Escape', hint: 'raw text → JSON string literal' },
  { value: 'unescape', label: 'Unescape', hint: 'JSON string literal → raw text' },
];

export const UI_DEFAULT_STATE: ToolState = DEFAULT_STATE;

export function isUiState(value: unknown): value is ToolState {
  return typeof value === 'object' && value !== null && 'input' in value && 'direction' in value;
}

export { convert };
