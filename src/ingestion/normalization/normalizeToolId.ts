/**
 * normalizeToolId.ts
 *
 * Maps raw tool/provider strings from any CSV source to canonical ToolId values.
 * Called once at the ingestion boundary so all downstream code uses consistent IDs.
 *
 * Rules are evaluated in order — more specific patterns first.
 */

import { ToolId } from '../../data/types';

interface NormRule {
  test: (lower: string) => boolean;
  id:   ToolId;
}

const RULES: NormRule[] = [
  // GitHub Copilot before generic Copilot
  { test: s => s.includes('github') && s.includes('copilot'), id: 'github_copilot' },
  // Azure OpenAI before generic OpenAI
  { test: s => s.includes('azure') && (s.includes('openai') || s.includes('gpt')), id: 'azure_openai' },
  // OpenAI / GPT
  { test: s => s.includes('openai') || s.includes('gpt'),     id: 'openai'         },
  // Anthropic / Claude
  { test: s => s.includes('anthropic') || s.includes('claude'), id: 'anthropic'    },
  // Copilot (M365) — after GitHub Copilot
  { test: s => s.includes('copilot'),                          id: 'copilot_m365'  },
  // Google Gemini / Vertex
  { test: s => s.includes('gemini'),                           id: 'google_gemini' },
  { test: s => s.includes('vertex'),                           id: 'vertex_ai'     },
  // AWS Bedrock
  { test: s => s.includes('bedrock'),                          id: 'aws_bedrock'   },
  // Coding assistants
  { test: s => s.includes('cursor'),                           id: 'cursor'        },
  { test: s => s.includes('tabnine'),                          id: 'tabnine'       },
  { test: s => s.includes('codewhisperer'),                    id: 'codewhisperer' },
  // Other providers
  { test: s => s.includes('firefly') || (s.includes('adobe') && s.includes('ai')), id: 'adobe_firefly' },
  { test: s => s.includes('mistral'),                          id: 'mistral'       },
  { test: s => s.includes('cohere'),                           id: 'cohere'        },
  { test: s => s.includes('perplexity'),                       id: 'perplexity'    },
];

/** Map a raw tool name to a canonical ToolId. Unknown tools pass through as-is (lowercased). */
export function normalizeToolId(raw: string): ToolId {
  const lower = raw.toLowerCase().trim();
  for (const rule of RULES) {
    if (rule.test(lower)) return rule.id;
  }
  return lower;
}

/** Map an array of raw tool names, deduplicating by canonical ID. */
export function normalizeToolIds(raws: string[]): ToolId[] {
  const seen = new Set<ToolId>();
  const out: ToolId[] = [];
  for (const raw of raws) {
    if (!raw.trim() || raw === '—') continue;
    const id = normalizeToolId(raw);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Human-readable display names for known canonical tool IDs. */
export const TOOL_DISPLAY_NAME: Record<string, string> = {
  openai:          'OpenAI',
  anthropic:       'Anthropic',
  github_copilot:  'GitHub Copilot',
  copilot_m365:    'Copilot (M365)',
  cursor:          'Cursor',
  tabnine:         'Tabnine',
  codewhisperer:   'CodeWhisperer',
  google_gemini:   'Google Gemini',
  vertex_ai:       'Vertex AI',
  aws_bedrock:     'AWS Bedrock',
  azure_openai:    'Azure OpenAI',
  adobe_firefly:   'Adobe Firefly',
  mistral:         'Mistral',
  cohere:          'Cohere',
  perplexity:      'Perplexity',
};

/** Return a human-readable label for a ToolId, falling back to title-casing the ID. */
export function displayToolId(id: ToolId): string {
  return TOOL_DISPLAY_NAME[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
