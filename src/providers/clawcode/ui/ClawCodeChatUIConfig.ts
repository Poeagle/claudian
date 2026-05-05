import type {
  ProviderChatUIConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';

const CLAWCODE_MODELS: ProviderUIOption[] = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4 (claw)', group: 'ClawCode' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4 (claw)', group: 'ClawCode' },
  { value: 'gpt-4o', label: 'GPT-4o (claw)', group: 'ClawCode' },
];

export const clawCodeChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(): ProviderUIOption[] {
    return CLAWCODE_MODELS;
  },

  ownsModel(model: string): boolean {
    // ClawCode supports any model via ProviderClient — accept all as owned
    return true;
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
    return model === 'claude-opus-4-6';
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
