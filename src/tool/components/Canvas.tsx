'use client';

import React from 'react';
import { convert, countsFor, PRESETS, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
}

const textareaClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy output"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Counts({ text, testid }: { text: string; testid: string }) {
  const { chars, bytes } = countsFor(text);
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400" data-testid={testid}>
      {chars} chars · {bytes} bytes
    </span>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const { output, error } = convert(state);
  const outputText = output ?? '';

  const swapDirection = () =>
    update({ direction: state.direction === 'escape' ? 'unescape' : 'escape' });

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full" data-testid="json-escape-canvas">
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Conversion direction"
        data-testid="direction-tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={state.direction === 'escape'}
          data-testid="direction-escape"
          onClick={() => update({ direction: 'escape' })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            state.direction === 'escape'
              ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          Escape → JSON
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.direction === 'unescape'}
          data-testid="direction-unescape"
          onClick={() => update({ direction: 'unescape' })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            state.direction === 'unescape'
              ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          Unescape ← JSON
        </button>
        <button
          type="button"
          data-testid="btn-swap"
          onClick={swapDirection}
          title="Swap direction (feeds the output back as input)"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          ⇄ Swap
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="json-input"
              className="text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              {state.direction === 'escape' ? 'Raw text' : 'JSON string literal'}
            </label>
            <Counts text={state.input} testid="input-counts" />
          </div>
          <textarea
            id="json-input"
            rows={8}
            value={state.input}
            onChange={(e) => update({ input: e.target.value })}
            data-testid="json-input"
            className={textareaClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {state.direction === 'escape' ? 'JSON string literal' : 'Raw text'}
            </span>
            <div className="flex items-center gap-2">
              <Counts text={outputText} testid="output-counts" />
              {error === null ? <CopyButton value={outputText} testid="copy-output" /> : null}
            </div>
          </div>
          {error === null ? (
            <textarea
              id="json-output"
              rows={8}
              readOnly
              value={outputText}
              data-testid="json-output"
              className={textareaClass}
            />
          ) : (
            <div
              className="mt-1 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
              role="alert"
              data-testid="conversion-error"
            >
              {error}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Example presets
        </h3>
        <div className="flex flex-wrap gap-2" data-testid="preset-buttons">
          {PRESETS.map((preset) => {
            const isUnescapePreset = preset.id === 'literal';
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`preset-${preset.id}`}
                onClick={() =>
                  update({
                    input: preset.text,
                    direction: isUnescapePreset ? 'unescape' : state.direction,
                  })
                }
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All conversions run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
