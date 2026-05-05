import { getProviderConfig, setProviderConfig } from '../../core/providers/providerConfig';

export interface ClawCodeProviderSettings {
  enabled: boolean;
  cliPath: string;
  model: string;
}

const DEFAULT_CLAWCODE_SETTINGS: ClawCodeProviderSettings = {
  enabled: true,
  cliPath: '',
  model: '',
};

export function getClawCodeProviderSettings(
  settings: Record<string, unknown>,
): ClawCodeProviderSettings {
  return {
    ...DEFAULT_CLAWCODE_SETTINGS,
    ...getProviderConfig(settings, 'clawcode'),
  };
}

export function updateClawCodeProviderSettings(
  settings: Record<string, unknown>,
  update: Partial<ClawCodeProviderSettings>,
): void {
  setProviderConfig(settings, 'clawcode', update);
}
