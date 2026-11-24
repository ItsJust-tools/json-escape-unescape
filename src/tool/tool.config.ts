import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'json-escape-unescape',
  name: 'JSON Escape Unescape',
  description:
    'Escape and unescape JSON string literals with unicode handling, validation, and copy support.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'] as const,
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'JSON Escape Unescape',
    icon: '🔤',
  },
} satisfies ToolConfig;

export default toolConfig;
