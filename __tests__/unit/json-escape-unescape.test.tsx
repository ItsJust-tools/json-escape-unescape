import { describe, it, expect } from 'vitest';
import { within } from '@testing-library/react';
import {
  escapeJson,
  unescapeJson,
  convert,
  byteLength,
  countsFor,
  DEFAULT_STATE,
  PRESETS,
  isState,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  roundTrips,
  jsonEscapeUnescapeTool,
} from '@/tool/tool-definition';
import { Canvas } from '@/tool/components/Canvas';
import { Toolbar } from '@/tool/components/Toolbar';
import { Sidebar } from '@/tool/components/Sidebar';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('escapeJson', () => {
  it('escapes quotes, backslashes, control characters, tabs and newlines', () => {
    expect(escapeJson('He said "hi"', { includeQuotes: true })).toBe('"He said \\"hi\\""');
    expect(escapeJson('back\\slash', { includeQuotes: false })).toBe('back\\\\slash');
    expect(escapeJson('a\nb', { includeQuotes: false })).toBe('a\\nb');
    expect(escapeJson('a\tb', { includeQuotes: false })).toBe('a\\tb');
    expect(escapeJson('a\rb', { includeQuotes: false })).toBe('a\\rb');
    expect(escapeJson('a\bb', { includeQuotes: false })).toBe('a\\bb');
    expect(escapeJson('a\f b', { includeQuotes: false })).toBe('a\\f b');
    expect(escapeJson('null\u0000char', { includeQuotes: false })).toBe('null\\u0000char');
  });

  it('produces literals that JSON.parse accepts', () => {
    const inputs = ['quote " back \\ new\nline tab\t char\x01', 'plain', '', 'ünicode 🎉'];
    for (const input of inputs) {
      const literal = escapeJson(input);
      expect(() => JSON.parse(literal)).not.toThrow();
      expect(JSON.parse(literal)).toBe(input);
    }
  });

  it('keeps non-ASCII characters by default but escapes them in ASCII-only mode', () => {
    expect(escapeJson('café', { includeQuotes: false })).toBe('café');
    expect(escapeJson('café', { asciiOnly: true, includeQuotes: false })).toBe('caf\\u00e9');
    expect(escapeJson('日本', { asciiOnly: true, includeQuotes: false })).toBe('\\u65e5\\u672c');
  });

  it('handles emoji surrogate pairs', () => {
    // Short style keeps natural pairs; long style escapes both halves.
    expect(escapeJson('🎉', { includeQuotes: false })).toBe('🎉');
    expect(escapeJson('🎉', { style: 'long', includeQuotes: false })).toBe('\\ud83c\\udf89');
    expect(escapeJson('🎉', { asciiOnly: true, includeQuotes: false })).toBe('\\ud83c\\udf89');
  });

  it('adds surrounding quotes only when requested', () => {
    expect(escapeJson('x')).toBe('"x"');
    expect(escapeJson('x', { includeQuotes: false })).toBe('x');
  });
});

describe('unescapeJson', () => {
  it('restores \n, \t, unicode and surrogate pair escapes', () => {
    expect(unescapeJson('"a\\nb"\u0000'.replace('\u0000', '')).value).toBe('a\nb');
    expect(unescapeJson('a\\tb').value).toBe('a\tb');
    expect(unescapeJson('"caf\\u00e9"').value).toBe('café');
    expect(unescapeJson('"\\ud83c\\udf89"').value).toBe('🎉');
    expect(unescapeJson('"\\\\d \\"q\\""').value).toBe('\\d "q"');
  });

  it('accepts literals with or without surrounding quotes', () => {
    expect(unescapeJson('"x"').value).toBe('x');
    expect(unescapeJson('x').value).toBe('x');
  });

  it('rejects invalid escapes with error reporting', () => {
    expect(unescapeJson('"bad \\x escape"').error).toContain('Invalid escape sequence');
    expect(unescapeJson('"short \\u12"').error).toContain('4 hex digits');
    expect(unescapeJson('"hex \\uZZZZ"').error).toContain('4 hex digits');
    expect(unescapeJson('trailing \\').error).toContain('Trailing backslash');
    expect(unescapeJson('"high \\ud83c alone"').error).toContain('Unpaired high surrogate');
    expect(unescapeJson('"low \\udf89 alone"').error).toContain('Unpaired low surrogate');
    expect(unescapeJson('"bad low \\ud800\\u0041"').error).toContain('Invalid low surrogate');
    expect(unescapeJson('"raw "quote""').error).toContain('Unexpected unescaped double quote');
    const badCtrl = unescapeJson('a\nb');
    expect(badCtrl.error).toContain('Raw control character');
    for (const bad of [
      unescapeJson('"bad \\x escape"'),
      unescapeJson('"short \\u12"'),
      unescapeJson('trailing \\'),
    ]) {
      expect(bad.value).toBeNull();
    }
  });

  it('is the inverse of escapeJson for unicode payloads', () => {
    const samples = [
      'party 🎉 family 👨‍👩‍👧 math 𝕏',
      'café — naïve résumé',
      '日本語 中文 한국어',
      'quote " back \\ new\nline\ttab',
    ];
    for (const sample of samples) {
      const literal = escapeJson(sample);
      expect(unescapeJson(literal).value).toBe(sample);
      const asciiLiteral = escapeJson(sample, { asciiOnly: true });
      expect(unescapeJson(asciiLiteral).value).toBe(sample);
      const longLiteral = escapeJson(sample, { style: 'long', asciiOnly: true });
      expect(unescapeJson(longLiteral).value).toBe(sample);
    }
  });
});

describe('convert', () => {
  it('escapes in escape direction', () => {
    const result = convert(state({ input: 'a\tb', direction: 'escape' }));
    expect(result.output).toBe('"a\\tb"');
    expect(result.error).toBeNull();
  });

  it('unescapes in unescape direction', () => {
    const result = convert(state({ input: '"a\\tb"', direction: 'unescape' }));
    expect(result.output).toBe('a\tb');
    expect(result.error).toBeNull();
  });

  it('reports errors in unescape direction', () => {
    const result = convert(state({ input: '"\\q"', direction: 'unescape' }));
    expect(result.output).toBeNull();
    expect(result.error).toContain('Invalid escape sequence');
  });
});

describe('counts', () => {
  it('computes char and byte counts', () => {
    expect(countsFor('')).toEqual({ chars: 0, bytes: 0 });
    expect(countsFor('abc')).toEqual({ chars: 3, bytes: 3 });
    expect(countsFor('é')).toEqual({ chars: 1, bytes: 2 });
    expect(countsFor('🎉')).toEqual({ chars: 1, bytes: 4 });
    expect(byteLength('€100')).toBe(6);
  });

  it('counts input and output sides', () => {
    const s = state({ input: 'a\tb' });
    const result = convert(s);
    expect(countsFor(s.input).chars).toBe(3);
    expect(countsFor(result.output ?? '').chars).toBe(6);
  });
});

describe('presets', () => {
  it('round-trips every preset in both directions', () => {
    for (const preset of PRESETS) {
      const escaped = escapeJson(preset.text);
      expect(unescapeJson(escaped).value).toBe(preset.text);
    }
    expect(PRESETS.length).toBeGreaterThan(3);
  });
});

describe('isState', () => {
  it('validates well-formed states', () => {
    expect(isState({ ...DEFAULT_STATE })).toBe(true);
    expect(isState({ ...DEFAULT_STATE, direction: 'unescape', escapeStyle: 'long' })).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isState(null)).toBe(false);
    expect(isState('nope')).toBe(false);
    expect(isState({})).toBe(false);
    expect(isState({ ...DEFAULT_STATE, direction: 'sideways' })).toBe(false);
    expect(isState({ ...DEFAULT_STATE, escapeStyle: 'medium' })).toBe(false);
    expect(isState({ ...DEFAULT_STATE, asciiOnly: 'yes' })).toBe(false);
  });
});

describe('state serialization', () => {
  it('round-trips state through serialize/deserialize', () => {
    for (const s of [
      state(),
      state({ input: 'emoji 🎉\nwith\ttabs', direction: 'unescape' }),
      state({ asciiOnly: true, escapeStyle: 'long', includeQuotes: false }),
    ]) {
      expect(roundTrips(s)).toBe(true);
      const restored = deserializeState(JSON.parse(serializeState(s)));
      expect(restored.success).toBe(true);
      if (restored.success) expect(restored.data).toEqual(s);
    }
  });

  it('repairs malformed payloads with defaults', () => {
    const repaired = deserializeState({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data!.direction).toBe('escape');
      expect(repaired.data!.asciiOnly).toBe(false);
    }
    const partial = deserializeState({ input: 'kept', direction: 'unescape' });
    expect(partial.success).toBe(true);
    if (partial.success) {
      expect(partial.data!.input).toBe('kept');
      expect(partial.data!.direction).toBe('unescape');
      expect(partial.data!.escapeStyle).toBe('short');
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    const badResult = deserializeState('string');
    expect(badResult.success).toBe(false);
    if (!badResult.success) expect(badResult.error).toContain('Invalid data format');
  });

  it('exposes a valid tool definition', () => {
    expect(jsonEscapeUnescapeTool.id).toBe('json-escape-unescape');
    expect(jsonEscapeUnescapeTool.name).toBe('JSON Escape Unescape');
    expect(jsonEscapeUnescapeTool.exporters).toHaveLength(4);
    expect(jsonEscapeUnescapeTool.initialState).toEqual(DEFAULT_STATE);
  });
});

describe('tool components', () => {
  it('renders Canvas with presets, counts, and error output', async () => {
    const { render, screen } = await import('@testing-library/react');
    const badState = state({ input: '"\\q"', direction: 'unescape' });
    const { unmount } = render(<Canvas state={badState} onChange={() => {}} />);
    expect(screen.getByTestId('conversion-error')).toBeInTheDocument();
    expect(screen.queryByTestId('json-output')).not.toBeInTheDocument();
    unmount();

    render(<Canvas state={state({ input: 'a\tb' })} onChange={() => {}} />);
    expect(screen.getByTestId('json-escape-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('json-output')).toHaveValue('"a\\tb"');
    expect(screen.getByTestId('input-counts')).toHaveTextContent('3 chars');
    expect(screen.getByTestId('output-counts')).toHaveTextContent('6 chars');
    expect(screen.getByTestId('preset-buttons').children.length).toBe(PRESETS.length);
  });

  it('wires Canvas toggles and swap buttons', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react');
    let current = state({ input: 'x' });
    const onChange = (next: ToolState) => {
      current = next;
    };
    const { rerender } = render(<Canvas state={current} onChange={onChange} />);
    const view: HTMLElement = screen.getByTestId('json-escape-canvas');
    const viewEl: HTMLElement = view;
    const swapButtons = () => within(viewEl).getAllByTestId('btn-swap');
    fireEvent.click(swapButtons()[0] as HTMLElement);
    expect(current.direction).toBe('unescape');
    rerender(<Canvas state={current} onChange={onChange} />);
    fireEvent.click(swapButtons()[0] as HTMLElement);
    expect(current.direction).toBe('escape');
    fireEvent.click(screen.getByTestId('preset-emoji'));
    expect(current.input).toContain('🎉');
    expect(current.input).toBe(PRESETS.find((p) => p.id === 'emoji')?.text);
    fireEvent.change(screen.getByTestId('json-input'), { target: { value: 'typed' } });
    expect(current.input).toBe('typed');
  });

  it('renders Toolbar with options wired to state', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react');
    let current = state({ input: 'x' });
    render(
      <Toolbar
        state={current}
        onChange={(next) => {
          current = next;
        }}
        onClear={() => {}}
        onCopy={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('toggle-ascii-only'));
    expect(current.asciiOnly).toBe(true);
    fireEvent.click(screen.getByTestId('toggle-include-quotes'));
    expect(current.includeQuotes).toBe(false);
    fireEvent.change(screen.getByTestId('select-escape-style'), {
      target: { value: 'long' },
    });
    expect(current.escapeStyle).toBe('long');
    expect(screen.getByTestId('btn-clear')).toBeInTheDocument();
    expect(screen.getByTestId('btn-copy-output')).toBeInTheDocument();
  });

  it('renders Sidebar with option controls and preset list', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react');
    let current = state({ input: 'x' });
    render(
      <Sidebar
        state={current}
        onChange={(next) => {
          current = next;
        }}
      />
    );
    expect(screen.getByTestId('json-escape-sidebar')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Emoji/ }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('sidebar-toggle-ascii'));
    expect(current.asciiOnly).toBe(true);
    fireEvent.change(screen.getByTestId('sidebar-escape-style'), {
      target: { value: 'long' },
    });
    expect(current.escapeStyle).toBe('long');
    fireEvent.click(screen.getByTestId('sidebar-toggle-quotes'));
    expect(current.includeQuotes).toBe(false);
  });
});
