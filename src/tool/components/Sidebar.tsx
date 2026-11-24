'use client';

import React from 'react';
import { PRESETS, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="json-escape-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Options</h3>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li className="flex items-center justify-between gap-2">
            <span>ASCII-only output</span>
            <input
              type="checkbox"
              checked={state.asciiOnly}
              onChange={(e) => onChange({ ...state, asciiOnly: e.target.checked })}
              data-testid="sidebar-toggle-ascii"
              aria-label="ASCII-only output"
              className="rounded border-gray-300 dark:border-gray-700"
            />
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Escape style</span>
            <select
              value={state.escapeStyle}
              onChange={(e) =>
                onChange({ ...state, escapeStyle: e.target.value as ToolState['escapeStyle'] })
              }
              data-testid="sidebar-escape-style"
              aria-label="Escape style"
              className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
            </select>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Include quotes</span>
            <input
              type="checkbox"
              checked={state.includeQuotes}
              onChange={(e) => onChange({ ...state, includeQuotes: e.target.checked })}
              data-testid="sidebar-toggle-quotes"
              aria-label="Include quotes"
              className="rounded border-gray-300 dark:border-gray-700"
            />
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Presets</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => onChange({ ...state, input: preset.text })}
                className="w-full rounded px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">About</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Escaping turns raw text into a valid JSON string literal: quotes, backslashes and control
          characters are prefixed with a backslash, and non-ASCII characters can be encoded as{' '}
          <code>\uXXXX</code> escapes. Unescaping reverses the process and reports malformed escapes
          instead of silently producing wrong text. Emoji and other astral characters are handled as
          surrogate pairs, so everything round-trips cleanly.
        </p>
      </div>
    </div>
  );
};
