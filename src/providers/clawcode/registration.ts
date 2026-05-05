import type { ProviderRegistration } from '../../core/providers/types';
import { getClawCodeWorkspaceServices } from './app/ClawCodeWorkspaceServices';
import { CLAWCODE_PROVIDER_CAPABILITIES } from './capabilities';
import { ClawCodeRuntime } from './runtime/ClawCodeRuntime';
import { clawCodeChatUIConfig } from './ui/ClawCodeChatUIConfig';

export const clawCodeProviderRegistration: ProviderRegistration = {
  displayName: 'ClawCode',
  blankTabOrder: 10,
  isEnabled: () => true,
  capabilities: CLAWCODE_PROVIDER_CAPABILITIES,
  environmentKeyPatterns: [],
  chatUIConfig: clawCodeChatUIConfig,
  settingsReconciler: {
    reconcileModelWithEnvironment(settings, _conversations) {
      return { changed: false, invalidatedConversations: [] };
    },
    normalizeModelVariantSettings() {
      return false;
    },
  },
  createRuntime: ({ plugin }) => {
    return new ClawCodeRuntime(plugin);
  },
  createTitleGenerationService: () => ({
    async generateTitle(_conversationId, _userMessage, _callback) {
      // no-op
    },
    cancel() {
      // no-op
    },
  }),
  createInstructionRefineService: () => ({
    resetConversation() {
      // no-op
    },
    async refineInstruction(rawInstruction, _existingInstructions, _onProgress) {
      return { success: true, instruction: rawInstruction, messages: [] };
    },
    async continueConversation(message, _onProgress) {
      return { success: true, instruction: message, messages: [] };
    },
    cancel() {
      // no-op
    },
    setModelOverride() {
      // no-op
    },
  }),
  createInlineEditService: () => ({
    resetConversation() {
      // no-op
    },
    async editText(request) {
      return { success: false, error: 'Inline edit not supported by ClawCode' };
    },
    async continueConversation(_message, _contextFiles) {
      return { success: false, error: 'Inline edit not supported by ClawCode' };
    },
    cancel() {
      // no-op
    },
  }),
  historyService: {
    async hydrateConversationHistory(_conversation) {
      // not supported yet (Phase 2)
    },
    async deleteConversationSession(_conversation) {
      // not supported yet
    },
    resolveSessionIdForConversation(_conversation) {
      return null;
    },
    isPendingForkConversation(_conversation) {
      return false;
    },
    buildForkProviderState() {
      return {};
    },
  },
  taskResultInterpreter: {
    hasAsyncLaunchMarker() {
      return false;
    },
    extractAgentId() {
      return null;
    },
    extractStructuredResult() {
      return null;
    },
    resolveTerminalStatus(_result, fallbackStatus) {
      return fallbackStatus;
    },
    extractTagValue() {
      return null;
    },
  },
};
