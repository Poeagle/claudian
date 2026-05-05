import type {
  ProviderChatUIConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';

const CLAWCODE_MODEL_IDS = new Set([
  'claw-sonnet-4-6',
  'claw-opus-4-6',
  'claw-gpt-4o',
]);

const CLAWCODE_MODELS: ProviderUIOption[] = [
  { value: 'claw-sonnet-4-6', label: 'Sonnet 4.6', group: 'ClawCode' },
  { value: 'claw-opus-4-6', label: 'Opus 4.6', group: 'ClawCode' },
  { value: 'claw-gpt-4o', label: 'GPT-4o', group: 'ClawCode' },
];

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
    return model === 'claw-sonnet-4-6';
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
