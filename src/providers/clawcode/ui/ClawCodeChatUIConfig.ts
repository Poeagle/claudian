import type {
  ProviderChatUIConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';

// ClawCode reads model from its own config files (~/.claw/settings.json).
// The model selector shows a single entry; the actual model is configured
// in ClawCode's own configuration, not in Claudian.
const CLAWCODE_MODEL_ID = 'claw-default';

const CLAWCODE_MODELS: ProviderUIOption[] = [
  { value: CLAWCODE_MODEL_ID, label: 'ClawCode (config)', group: 'ClawCode' },
];

export const clawCodeChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(): ProviderUIOption[] {
    return CLAWCODE_MODELS;
  },

  ownsModel(model: string): boolean {
    return model === CLAWCODE_MODEL_ID;
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
    return false;
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
