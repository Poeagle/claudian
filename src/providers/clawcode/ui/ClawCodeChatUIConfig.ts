import type {
  ProviderChatUIConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';

// All models that ClawCode can support via ProviderClient.
// ClawCode routes model names to the correct provider automatically.
const CLAWCODE_MODELS: ProviderUIOption[] = [
  // Anthropic
  { value: 'claw-claude-sonnet-4-6', label: 'Claude Sonnet 4.6', group: 'Anthropic (claw)' },
  { value: 'claw-claude-opus-4-6', label: 'Claude Opus 4.6', group: 'Anthropic (claw)' },
  { value: 'claw-claude-haiku-4-5', label: 'Claude Haiku 4.5', group: 'Anthropic (claw)' },
  // OpenAI
  { value: 'claw-gpt-4o', label: 'GPT-4o', group: 'OpenAI (claw)' },
  { value: 'claw-gpt-4o-mini', label: 'GPT-4o-mini', group: 'OpenAI (claw)' },
  { value: 'claw-o3', label: 'o3', group: 'OpenAI (claw)' },
  { value: 'claw-o4-mini', label: 'o4-mini', group: 'OpenAI (claw)' },
  // xAI
  { value: 'claw-grok-3', label: 'Grok 3', group: 'xAI (claw)' },
  // DeepSeek
  { value: 'claw-deepseek-chat', label: 'DeepSeek Chat', group: 'DeepSeek (claw)' },
];

const CLAWCODE_MODEL_IDS = new Set(CLAWCODE_MODELS.map((m) => m.value));

export const clawCodeChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(): ProviderUIOption[] {
    return CLAWCODE_MODELS;
  },

  ownsModel(model: string): boolean {
    return CLAWCODE_MODEL_IDS.has(model);
  },

  isAdaptiveReasoningModel(): boolean {
    return false;
  },

  getReasoningOptions(): ProviderReasoningOption[] {
    return [];
  },

  getDefaultReasoningValue(): string {
    return '';
  },

  getContextWindowSize(): number {
    return 200_000;
  },

  isDefaultModel(model: string): boolean {
    return model === 'claw-gpt-4o';
  },

  applyModelDefaults(): void {
    // no-op
  },

  normalizeModelVariant(model: string): string {
    return model;
  },

  getCustomModelIds(): Set<string> {
    return new Set();
  },
};
