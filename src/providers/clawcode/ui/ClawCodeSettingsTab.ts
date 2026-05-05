import { Setting } from 'obsidian';

import type { ProviderSettingsTabRenderer } from '../../../core/providers/types';
import { renderEnvironmentSettingsSection } from '../../../features/settings/ui/EnvironmentSettingsSection';

export const clawCodeSettingsTabRenderer: ProviderSettingsTabRenderer = {
  render(container, context) {
    // --- CLI Path ---
    new Setting(container).setName('ClawCode CLI').setHeading();

    new Setting(container)
      .setName('CLI path')
      .setDesc('Path to the claw binary. Leave empty for auto-detection (checks ~/.cargo/bin/claw first, then PATH).')
      .addText((text) =>
        text
          .setPlaceholder('/Users/ymchen/.cargo/bin/claw')
          .setValue(
            ((context.plugin.settings as Record<string, unknown>).clawCodeCliPath as string) ?? '',
          )
          .onChange(async (value) => {
            (context.plugin.settings as Record<string, unknown>).clawCodeCliPath = value || null;
            await context.plugin.saveSettings();
          }),
      );

    // --- Environment variables ---
    renderEnvironmentSettingsSection({
      container,
      plugin: context.plugin,
      scope: 'provider:clawcode',
      name: 'Environment variables',
      desc: 'Environment variables passed to the claw --structured subprocess. Required: set OPENAI_API_KEY or ANTHROPIC_API_KEY here.',
      placeholder: 'OPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...',
    });
  },
};
