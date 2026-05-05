import { Setting } from 'obsidian';

import type { ProviderSettingsTabRenderer } from '../../../core/providers/types';
import { renderEnvironmentSettingsSection } from '../../../features/settings/ui/EnvironmentSettingsSection';
import { getClawCodeProviderSettings, updateClawCodeProviderSettings } from '../settings';

export const clawCodeSettingsTabRenderer: ProviderSettingsTabRenderer = {
  render(container, context) {
    const settingsBag = context.plugin.settings as unknown as Record<string, unknown>;
    const clawSettings = getClawCodeProviderSettings(settingsBag);

    // --- Setup ---
    new Setting(container).setName('Setup').setHeading();

    new Setting(container)
      .setName('Enable ClawCode provider')
      .setDesc('When enabled, ClawCode appears in the model selector.')
      .addToggle((toggle) =>
        toggle
          .setValue(clawSettings.enabled)
          .onChange(async (value) => {
            updateClawCodeProviderSettings(settingsBag, { enabled: value });
            await context.plugin.saveSettings();
            context.refreshModelSelectors();
          }),
      );

    // --- CLI ---
    new Setting(container).setName('CLI').setHeading();

    new Setting(container)
      .setName('CLI path')
      .setDesc('Path to the claw binary. Leave empty for auto-detection (checks ~/.cargo/bin/claw, then PATH).')
      .addText((text) =>
        text
          .setPlaceholder('/Users/ymchen/.cargo/bin/claw')
          .setValue(clawSettings.cliPath)
          .onChange(async (value) => {
            updateClawCodeProviderSettings(settingsBag, { cliPath: value });
            await context.plugin.saveSettings();
          }),
      );

    // --- Model ---
    new Setting(container).setName('Model').setHeading();

    new Setting(container)
      .setName('Default model')
      .setDesc('Model name passed to ClawCode via --model. Leave empty to use the model from your ClawCode config file (~/.claw/settings.json).')
      .addText((text) =>
        text
          .setPlaceholder('gpt-4o, mimo-v2.5, claude-sonnet-4-6...')
          .setValue(clawSettings.model)
          .onChange(async (value) => {
            updateClawCodeProviderSettings(settingsBag, { model: value });
            await context.plugin.saveSettings();
            context.refreshModelSelectors();
          }),
      );

    // --- Environment ---
    renderEnvironmentSettingsSection({
      container,
      plugin: context.plugin,
      scope: 'provider:clawcode',
      name: 'Environment variables',
      desc: 'Environment variables passed to the claw --structured subprocess.',
      placeholder: 'OPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...',
    });
  },
};
