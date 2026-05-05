import type { ProviderCapabilities } from '../../core/providers/types';

export const CLAWCODE_PROVIDER_CAPABILITIES: Readonly<ProviderCapabilities> = Object.freeze({
  providerId: 'clawcode',
  supportsPersistentRuntime: false, // spawns per-query (no persistent CLI session)
  supportsNativeHistory: true,       // ClawCode stores JSONL sessions
  supportsPlanMode: false,
  supportsRewind: false,
  supportsFork: false,
  supportsProviderCommands: false,
  supportsImageAttachments: false,
  supportsInstructionMode: false,
  supportsMcpTools: false,
  reasoningControl: 'none',
});
