import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { createInterface, type Interface as ReadlineInterface } from 'readline';
import { homedir } from 'os';
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

  constructor() {
    console.log('[ClawCode] ClawCodeRuntime constructor called');
  }

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

  async ensureReady(_options?: ChatRuntimeEnsureReadyOptions): Promise<boolean> {
    if (this._ready) return true;

    const cliPath = this.resolveCliPath();
    console.log('[ClawCode] resolved CLI path:', cliPath);
    if (!cliPath) return false;

    this.abortController = new AbortController();

    try {
      this.process = spawn(cliPath, ['--structured'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: this.abortController.signal,
      });

      this.process.on('error', (err) => {
        console.error('[ClawCode] spawn error:', err.message);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('[ClawCode] stderr:', data.toString().trim());
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[ClawCode] exited code=${code} signal=${signal}`);
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
          } catch {
            // ignore non-JSON startup output
          }
        };

        this.lineReader!.on('line', onLine);

        setTimeout(() => {
          this.lineReader!.off('line', onLine);
          if (!this._ready) {
            console.error('[ClawCode] timeout waiting for ready');
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
    console.log('[ClawCode] query() called, _ready=', this._ready, 'process=', !!this.process);
    if (!this._ready || !this.process?.stdin || !this.lineReader) {
      console.log('[ClawCode] runtime not ready, ensureReady was not called or failed');
      yield { type: 'error', content: 'ClawCode runtime is not ready' };
      return;
    }

    const turn = turnOrPrompt;
    this.chunkBuffer = [];
    this.turnDone = false;
    this.turnError = null;

    const msg: StdinMessage = {
      type: 'message',
      role: 'user',
      content: turn.prompt,
    };
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
      } catch {
        // ignore
      }
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

  cancel(): void {
    this.process?.kill();
    this._ready = false;
  }

  resetSession(): void { this.cancel(); }
  cleanup(): void { this.cancel(); this.lineReader?.close(); }
  isReady(): boolean { return this._ready; }
  getSessionId(): string | null { return this._sessionId; }
  consumeSessionInvalidation(): boolean { return false; }
  setResumeCheckpoint(_checkpointId: string | undefined): void { /* not supported */ }
  syncConversationState(_conv: ChatRuntimeConversationState | null, _paths?: string[]): void { /* not supported */ }

  setApprovalCallback(_cb: ApprovalCallback | null): void {}
  setApprovalDismisser(_d: (() => void) | null): void {}
  setAskUserQuestionCallback(_cb: AskUserQuestionCallback | null): void {}
  setExitPlanModeCallback(_cb: ExitPlanModeCallback | null): void {}
  setPermissionModeSyncCallback(_cb: ((mode: string) => void) | null): void {}
  setSubagentHookProvider(_fn: () => SubagentRuntimeState): void {}
  setAutoTurnCallback(_cb: ((result: AutoTurnResult) => void) | null): void {}

  buildSessionUpdates(_params: { conversation: Conversation | null; sessionInvalidated: boolean }): SessionUpdateResult {
    return { updates: {} };
  }

  resolveSessionIdForFork(_conv: Conversation | null): string | null { return null; }
  async getSupportedCommands(): Promise<SlashCommand[]> { return []; }
  async reloadMcpServers(): Promise<void> {}
  consumeTurnMetadata(): ChatTurnMetadata { return {}; }
  async rewind(_uid: string, _aid: string): Promise<ChatRewindResult> { throw new Error('Not supported'); }

  private resolveCliPath(): string | null {
    // Hardcoded path for testing — replace with proper resolution later
    const testPath = '/Users/ymchen/.cargo/bin/claw';
    if (existsSync(testPath)) return testPath;

    // 2. Try via PATH
    const envPath = process.env.PATH || '';
    for (const dir of envPath.split(':')) {
      const candidate = join(dir, 'claw');
      if (existsSync(candidate)) return candidate;
    }

    return null;
  }
}
