export type Direction = 'escape' | 'unescape';

export type EscapeStyle = 'short' | 'long';

export interface ToolState {
  /** Raw input text (source side of the conversion). */
  input: string;
  /** Escape → unescape or unescape → escape. */
  direction: Direction;
  /** Convert non-ASCII characters to \uXXXX escapes. */
  asciiOnly: boolean;
  /** Prefer short \uXXXX escapes or long-form escapes for astral characters. */
  escapeStyle: EscapeStyle;
  /** Include the surrounding double quotes in the escaped output. */
  includeQuotes: boolean;
}

export const DEFAULT_STATE: ToolState = {
  input: 'Hello, "world"!\nLine 2\tTabbed — émoji 🎉',
  direction: 'escape',
  asciiOnly: false,
  escapeStyle: 'short',
  includeQuotes: true,
};

/** Example presets covering common edge cases. */
export const PRESETS: { id: string; label: string; text: string }[] = [
  { id: 'basic', label: 'Quotes & backslashes', text: 'He said "hi"\nPath: C:\\Users\\test' },
  { id: 'controls', label: 'Control characters', text: 'line1\nline2\ttabbed\r\ncarriage' },
  { id: 'unicode', label: 'Accented text', text: 'café — naïve résumé' },
  { id: 'emoji', label: 'Emoji & surrogate pairs', text: 'party 🎉 family 👨‍👩‍👧 math 𝕏' },
  { id: 'cjk', label: 'CJK characters', text: '日本語 中文 한국어' },
  {
    id: 'literal',
    label: 'JSON literal (unescape example)',
    text: 'A \\"quoted\\" word, tab:\\t, newline:\\n, snowman: \\u2603, emoji: \\ud83c\\udf89',
  },
];

const SHORT_ESCAPES: Record<string, string> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

/** Four-hex-digit \uXXXX for a code unit. */
function uEscape(codeUnit: number): string {
  return `\\u${codeUnit.toString(16).padStart(4, '0').toLowerCase()}`;
}

/** True when a code point needs escaping in JSON strings. */
function isControlPoint(cp: number): boolean {
  return cp < 0x20 || cp === 0x7f;
}

/** Long-form escape: one surrogate pair rendered as both \uXXXX halves. */
function escapeCodePointLong(cp: number): string {
  if (cp >= 0x10000) {
    const offset = cp - 0x10000;
    const high = 0xd800 + (offset >> 10);
    const low = 0xdc00 + (offset & 0x3ff);
    return `${uEscape(high)}${uEscape(low)}`;
  }
  return cp >= 0x80 || isControlPoint(cp) ? uEscape(cp) : String.fromCharCode(cp);
}

/**
 * Escape raw text into a JSON string body (optionally with surrounding quotes).
 * asciiOnly escapes every non-ASCII character; otherwise only JSON-required
 * characters, control characters, and (for style 'long' or lone surrogates)
 * astral characters are escaped, and unescaped UTF-8 is kept otherwise.
 */
export function escapeJson(
  text: string,
  options: { asciiOnly?: boolean; style?: EscapeStyle; includeQuotes?: boolean } = {}
): string {
  const asciiOnly = options.asciiOnly ?? false;
  const style = options.style ?? 'short';
  const includeQuotes = options.includeQuotes ?? true;

  let out = '';
  // Iterate by code points to keep surrogate pairs together.
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x10000) {
      // Astral plane code point.
      if (style === 'long' || asciiOnly) {
        out += escapeCodePointLong(cp);
      } else {
        out += ch; // keep the natural surrogate pair, valid in JSON
      }
      continue;
    }
    if (SHORT_ESCAPES[ch]) {
      out += SHORT_ESCAPES[ch];
      continue;
    }
    if (isControlPoint(cp)) {
      out += uEscape(cp);
      continue;
    }
    if (asciiOnly && cp >= 0x80) {
      out += uEscape(cp);
      continue;
    }
    out += ch;
  }
  return includeQuotes ? `"${out}"` : out;
}

export interface UnescapeResult {
  /** Decoded raw text, or null when the literal is invalid. */
  value: string | null;
  /** Human-readable reason when value is null. */
  error: string | null;
}

/** Decode one \uXXXX hex sequence; null when the digits are not valid hex. */
function hexToCodeUnit(digits: string): number | null {
  if (!/^[0-9a-fA-F]{4}$/.test(digits)) return null;
  return Number.parseInt(digits, 16);
}

/**
 * Unescape a JSON string literal back to raw text. Accepts input with or
 * without surrounding quotes. Reports malformed escapes (bad hex digits,
 * short \u sequences, unpaired surrogates) instead of throwing.
 */
export function unescapeJson(input: string): UnescapeResult {
  let text = input;
  // Strip one pair of surrounding quotes when present.
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === undefined) break;
    if (ch !== '\\') {
      // A raw double quote inside an unquoted body would be ambiguous JSON;
      // treat literal control characters as errors too.
      if (ch === '"') {
        return { value: null, error: 'Unexpected unescaped double quote at position ' + i };
      }
      const cp = ch.codePointAt(0) ?? 0;
      if (cp < 0x20) {
        return { value: null, error: `Raw control character at position ${i}` };
      }
      out += ch;
      i += 1;
      continue;
    }
    const next = text[i + 1];
    if (next === undefined) {
      return { value: null, error: 'Trailing backslash at end of input' };
    }
    const simple = Object.entries(SHORT_ESCAPES).find(([, esc]) => esc === `\\${next}`);
    if (simple) {
      out += simple[0];
      i += 2;
      continue;
    }
    if (next === 'u') {
      const digits = text.slice(i + 2, i + 6);
      const unit = hexToCodeUnit(digits);
      if (unit === null) {
        return {
          value: null,
          error: `Invalid \\u escape at position ${i}: expected 4 hex digits`,
        };
      }
      if (unit >= 0xd800 && unit <= 0xdbff) {
        // High surrogate: expect a following \uDC00-\uDFFF pair.
        if (text.slice(i + 6, i + 8) !== '\\u') {
          return {
            value: null,
            error: `Unpaired high surrogate \\u${digits.toLowerCase()} at position ${i}`,
          };
        }
        const lowDigits = text.slice(i + 8, i + 12);
        const low = hexToCodeUnit(lowDigits);
        if (low === null || low < 0xdc00 || low > 0xdfff) {
          return {
            value: null,
            error: `Invalid low surrogate after \\u${digits.toLowerCase()} at position ${i}`,
          };
        }
        const cp = 0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00);
        out += String.fromCodePoint(cp);
        i += 12;
        continue;
      }
      if (unit >= 0xdc00 && unit <= 0xdfff) {
        return {
          value: null,
          error: `Unpaired low surrogate \\u${digits.toLowerCase()} at position ${i}`,
        };
      }
      out += String.fromCharCode(unit);
      i += 6;
      continue;
    }
    return { value: null, error: `Invalid escape sequence \\${next} at position ${i}` };
  }
  return { value: out, error: null };
}

export interface ConversionResult {
  /** Converted output text, or null on failure. */
  output: string | null;
  /** Error message when output is null. */
  error: string | null;
}

/** Convert the raw input according to the current direction. */
export function convert(state: ToolState): ConversionResult {
  if (state.direction === 'escape') {
    return {
      output: escapeJson(state.input, {
        asciiOnly: state.asciiOnly,
        style: state.escapeStyle,
        includeQuotes: state.includeQuotes,
      }),
      error: null,
    };
  }
  const result = unescapeJson(state.input);
  return { output: result.value, error: result.error };
}

/** UTF-8 byte length of a string. */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export interface Counts {
  chars: number;
  bytes: number;
}

/** Character and UTF-8 byte counts for one side of the conversion. */
export function countsFor(text: string): Counts {
  // [...text] counts unicode code points (surrogate pairs as one).
  return { chars: [...text].length, bytes: byteLength(text) };
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.input === 'string' &&
    (v.direction === 'escape' || v.direction === 'unescape') &&
    typeof v.asciiOnly === 'boolean' &&
    (v.escapeStyle === 'short' || v.escapeStyle === 'long') &&
    typeof v.includeQuotes === 'boolean'
  );
}
