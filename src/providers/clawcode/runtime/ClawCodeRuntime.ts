import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { createInterface, type Interface as ReadlineInterface } from 'readline';
import { join } from 'path';

import type { ChatRuntime } from '../../../core/runtime/ChatRuntime';
import type {
  ApprovalCallback,
  AskUserQuestionCallback,
  AutoTurnResult,
  ChatRewindResult,
  ChatRuntimeConversationState,
  ChatRuntimeEnsureReadyOptions,
  ChatTurnMetadata,
  ChatTurnRequest,
  ExitPlanModeCallback,
  PreparedChatTurn,
  SessionUpdateResult,
  SubagentRuntimeState,
} from '../../../core/runtime/types';
import type {
  ChatMessage,
  Conversation,
  SlashCommand,
  StreamChunk,
} from '../../../core/types';
import { parseEnvironmentVariables } from '../../../utils/env';
import type ClaudianPlugin from '../../../main';
import { CLAWCODE_PROVIDER_CAPABILITIES } from '../capabilities';

interface StdinMessage {
  type: 'message';
  role: string;
  content: string;
}

interface StructuredEvent {
  type: string;
  text?: string;
  tool_use_id?: string;
  tool_name?: string;
  tool_input?: string;
  tool_output?: string;
  is_error?: boolean;
  input_tokens?: number;
  output_tokens?: number;
  session_id?: string;
  model?: string;
  content?: string;
}

export class ClawCodeRuntime implements ChatRuntime {
  readonly providerId = 'clawcode' as const;

  private process: ChildProcess | null = null;
  private lineReader: ReadlineInterface | null = null;
  private _ready = false;
  private _sessionId: string | null = null;
  private pendingResolve: ((chunk: StreamChunk | null) => void) | null = null;
  private chunkBuffer: StreamChunk[] = [];
  private turnDone = false;
  private turnError: Error | null = null;
  private abortController: AbortController | null = null;
  private readyListeners = new Set<(ready: boolean) => void>();
  private plugin: ClaudianPlugin;

  constructor(plugin: ClaudianPlugin) {
    this.plugin = plugin;
  }

  getCapabilities() {
    return CLAWCODE_PROVIDER_CAPABILITIES;
  }

  prepareTurn(request: ChatTurnRequest): PreparedChatTurn {
    return {
      request,
      persistedContent: '',
      prompt: request.text ?? '',
      isCompact: false,
      mcpMentions: new Set(),
    };
  }

  onReadyStateChange(listener: (ready: boolean) => void): () => void {
    this.readyListeners.add(listener);
    return () => {
      this.readyListeners.delete(listener);
    };
  }

  async ensureReady(options?: ChatRuntimeEnsureReadyOptions): Promise<boolean> {
    if (this._ready) return true;

    const cliPath = this.resolveCliPath();
    if (!cliPath) return false;

    this.abortController = new AbortController();

    // Use the model from the current settings
    const settings = (this.plugin.settings as Record<string, unknown>);
    const model = (settings.model as string) || 'gpt-4o';
    // Map UI model ids to actual ClawCode model ids
    // Map UI model ids to actual ClawCode model ids (strip "claw-" prefix)
    const actualModel = model.startsWith('claw-') ? model.slice(5) : model;

    // Read environment variables from Claudian settings (shared + provider)
    const sharedEnvText = this.plugin.getEnvironmentVariablesForScope('shared');
    const providerEnvText = this.plugin.getActiveEnvironmentVariables(this.providerId);
    const customEnv = {
      ...parseEnvironmentVariables(sharedEnvText),
      ...parseEnvironmentVariables(providerEnvText),
    };
    const spawnEnv: Record<string, string | undefined> = {
      ...process.env,
      ...customEnv,
    };

    try {
      this.process = spawn(cliPath, ['--structured', '--model', actualModel], {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: this.abortController.signal,
        env: spawnEnv as NodeJS.ProcessEnv,
      });

      this.process.on('error', (err) => {
        console.error('[ClawCode] spawn error:', err.message);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.error('[ClawCode] stderr:', msg);
      });

      this.process.on('exit', (code, sig) => {
        if (code !== 0) {
          console.log(`[ClawCode] exited code=${code}`);
        }
      });

      this.lineReader = createInterface({ input: this.process.stdout! });

      return await new Promise<boolean>((resolve) => {
        const onLine = (line: string) => {
          try {
            const event: StructuredEvent = JSON.parse(line);
            if (event.type === 'ready') {
              this._sessionId = event.session_id ?? null;
              this._ready = true;
              resolve(true);
            }
          } catch { /* ignore non-JSON output */ }
        };

        this.lineReader!.on('line', onLine);

        setTimeout(() => {
          this.lineReader!.off('line', onLine);
          if (!this._ready) {
            resolve(false);
          }
        }, 15_000);
      });
    } catch (err) {
      console.error('[ClawCode] ensureReady error:', err);
      return false;
    }
  }

  async *query(
    turnOrPrompt: PreparedChatTurn,
    _conversationHistory?: ChatMessage[],
  ): AsyncGenerator<StreamChunk> {
    if (!this._ready) {
      const ready = await this.ensureReady();
      if (!ready) {
        yield { type: 'error', content: 'ClawCode runtime is not ready' };
        return;
      }
    }
    if (!this.process?.stdin || !this.lineReader) {
      yield { type: 'error', content: 'ClawCode runtime process not available' };
      return;
    }

    const turn = turnOrPrompt;
    this.chunkBuffer = [];
    this.turnDone = false;
    this.turnError = null;

    const msg: StdinMessage = { type: 'message', role: 'user', content: turn.prompt };
    this.process.stdin.write(JSON.stringify(msg) + '\n');

    const onLine = (line: string) => {
      try {
        const event: StructuredEvent = JSON.parse(line);
        const chunk = this.eventToChunk(event);
        if (chunk) {
          if (this.pendingResolve) {
            this.pendingResolve(chunk);
            this.pendingResolve = null;
          } else {
            this.chunkBuffer.push(chunk);
          }
        }
        if (event.type === 'done') {
          this.turnDone = true;
          if (this.pendingResolve) {
            this.pendingResolve(null);
            this.pendingResolve = null;
          }
        }
      } catch { /* ignore */ }
    };

    const onError = (err: Error) => {
      this.turnError = err;
      this.turnDone = true;
      if (this.pendingResolve) {
        this.pendingResolve(null);
        this.pendingResolve = null;
      }
    };

    this.lineReader.on('line', onLine);
    this.process.on('error', onError);

    try {
      while (!this.turnDone) {
        if (this.chunkBuffer.length > 0) {
          yield this.chunkBuffer.shift()!;
        } else {
          const chunk = await new Promise<StreamChunk | null>((resolve) => {
            this.pendingResolve = resolve;
          });
          if (chunk) yield chunk;
        }
      }
      while (this.chunkBuffer.length > 0) {
        yield this.chunkBuffer.shift()!;
      }
      yield { type: 'done' };
    } finally {
      this.lineReader.off('line', onLine);
      this.process.off('error', onError);
    }
  }

  private eventToChunk(event: StructuredEvent): StreamChunk | null {
    switch (event.type) {
      case 'text':
        return { type: 'text', content: event.text ?? '' };
      case 'tool_use':
        return { type: 'tool_use', id: event.tool_use_id ?? '', name: event.tool_name ?? '', input: {} };
      case 'tool_result':
        return { type: 'tool_result', id: event.tool_use_id ?? '', content: event.tool_output ?? '', isError: event.is_error };
      case 'usage':
        return { type: 'usage', usage: { inputTokens: event.input_tokens ?? 0, contextWindow: 0, contextTokens: 0, percentage: 0 } };
      case 'error':
        return { type: 'error', content: event.content ?? 'Unknown error' };
      default:
        return null;
    }
  }

  cancel(): void { this.process?.kill(); this._ready = false; }
  resetSession(): void { this.cancel(); }
  cleanup(): void { this.cancel(); this.lineReader?.close(); }
  isReady(): boolean { return this._ready; }
  getSessionId(): string | null { return this._sessionId; }
  consumeSessionInvalidation(): boolean { return false; }
  setResumeCheckpoint(_id: string | undefined): void {}
  syncConversationState(_conv: ChatRuntimeConversationState | null, _paths?: string[]): void {}

  setApprovalCallback(_cb: ApprovalCallback | null): void {}
  setApprovalDismisser(_d: (() => void) | null): void {}
  setAskUserQuestionCallback(_cb: AskUserQuestionCallback | null): void {}
  setExitPlanModeCallback(_cb: ExitPlanModeCallback | null): void {}
  setPermissionModeSyncCallback(_cb: ((m: string) => void) | null): void {}
  setSubagentHookProvider(_fn: () => SubagentRuntimeState): void {}
  setAutoTurnCallback(_cb: ((r: AutoTurnResult) => void) | null): void {}

  buildSessionUpdates(_p: { conversation: Conversation | null; sessionInvalidated: boolean }): SessionUpdateResult {
    return { updates: {} };
  }
  resolveSessionIdForFork(_c: Conversation | null): string | null { return null; }
  async getSupportedCommands(): Promise<SlashCommand[]> { return []; }
  async reloadMcpServers(): Promise<void> {}
  consumeTurnMetadata(): ChatTurnMetadata { return {}; }
  async rewind(_u: string, _a: string): Promise<ChatRewindResult> { throw new Error('Not supported'); }

  private resolveCliPath(): string | null {
    const testPath = '/Users/ymchen/.cargo/bin/claw';
    if (existsSync(testPath)) return testPath;
    const envPath = process.env.PATH || '';
    for (const dir of envPath.split(':')) {
      const candidate = join(dir, 'claw');
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }
}
