import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import { DEFAULT_STATE, isState, type ToolState } from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    input: state.input,
    direction: state.direction,
    asciiOnly: state.asciiOnly,
    escapeStyle: state.escapeStyle,
    includeQuotes: state.includeQuotes,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected JSON Escape Unescape state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState =
    isState(v) === true
      ? { ...v }
      : {
          input: typeof v.input === 'string' ? v.input : DEFAULT_STATE.input,
          direction: v.direction === 'unescape' ? 'unescape' : 'escape',
          asciiOnly: typeof v.asciiOnly === 'boolean' ? v.asciiOnly : DEFAULT_STATE.asciiOnly,
          escapeStyle: v.escapeStyle === 'long' ? 'long' : 'short',
          includeQuotes:
            typeof v.includeQuotes === 'boolean' ? v.includeQuotes : DEFAULT_STATE.includeQuotes,
        };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const jsonEscapeUnescapeTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
