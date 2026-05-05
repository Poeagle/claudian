import type {
  ProviderChatUIConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';
import { getClawCodeProviderSettings } from '../settings';

// A single dynamic model entry — the actual model name comes from settings.
const CLAWCODE_MODEL_ID = 'clawcode-model';

export const clawCodeChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(settings): ProviderUIOption[] {
    const clawSettings = getClawCodeProviderSettings(settings as Record<string, unknown>);
    const label = clawSettings.model
      ? `ClawCode (${clawSettings.model})`
      : 'ClawCode (from config)';
    return [{ value: CLAWCODE_MODEL_ID, label, group: 'ClawCode' }];
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
