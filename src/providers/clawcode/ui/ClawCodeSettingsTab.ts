import { Setting } from 'obsidian';

import type { ProviderSettingsTabRenderer } from '../../../core/providers/types';
import { renderEnvironmentSettingsSection } from '../../../features/settings/ui/EnvironmentSettingsSection';
import { getClawCodeWorkspaceServices } from '../app/ClawCodeWorkspaceServices';

export const clawCodeSettingsTabRenderer: ProviderSettingsTabRenderer = {
  render(container, context) {
    // --- Environment variables ---
    renderEnvironmentSettingsSection({
      container,
      plugin: context.plugin,
      scope: 'provider:clawcode',
      name: 'ClawCode Environment',
      desc: 'Environment variables passed to the claw --structured subprocess.',
      placeholder: 'OPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...',
    });
  },
};
