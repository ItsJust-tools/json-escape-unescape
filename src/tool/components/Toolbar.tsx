'use client';

import React from 'react';
import type { EscapeStyle, ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tool controls">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.asciiOnly}
            onChange={(e) => onChange({ ...state, asciiOnly: e.target.checked })}
            data-testid="toggle-ascii-only"
            className="rounded border-gray-300 dark:border-gray-700"
          />
          ASCII-only (\uXXXX)
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.includeQuotes}
            onChange={(e) => onChange({ ...state, includeQuotes: e.target.checked })}
            data-testid="toggle-include-quotes"
            className="rounded border-gray-300 dark:border-gray-700"
          />
          Quotes
        </label>
        <label
          htmlFor="escape-style"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Escape style
          <select
            id="escape-style"
            value={state.escapeStyle}
            onChange={(e) => onChange({ ...state, escapeStyle: e.target.value as EscapeStyle })}
            data-testid="select-escape-style"
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="short">Short — keep native pairs</option>
            <option value="long">Long — escape astral as pair</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-output"
            className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
          >
            Copy output
          </button>
        ) : null}
      </div>
    </div>
  );
};
