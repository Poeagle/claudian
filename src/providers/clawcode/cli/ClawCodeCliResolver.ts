import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';

import type { ProviderCliResolver } from '../../../core/providers/types';

/**
 * Resolves the path to the `claw` binary.
 *
 * Priority:
 * 1. User-configured path (from settings)
 * 2. `which claw` / `where.exe claw`
 * 3. Cargo install path (~/.cargo/bin/claw)
 * 4. Rustup path
 */
export class ClawCodeCliResolver implements ProviderCliResolver {
  private cachedPath: string | null = null;

  resolveFromSettings(settings: Record<string, unknown>): string | null {
    if (this.cachedPath) return this.cachedPath;

    // 1. Check user-configured path
    const configured = (settings as any).clawCodeCliPath as string | undefined;
    if (configured && existsSync(configured)) {
      this.cachedPath = configured;
      return configured;
    }

    // 2. Check Cargo install path first (our built binary with --structured support)
    const cargoPath = join(homedir(), '.cargo', 'bin', 'claw');
    if (existsSync(cargoPath)) {
      this.cachedPath = cargoPath;
      return cargoPath;
    }

    // 3. Try `which claw` (may find older system-wide install)
    try {
      const cmd = platform() === 'win32' ? 'where.exe' : 'which';
      const result = execSync(`${cmd} claw`, { encoding: 'utf-8' }).trim();
      if (result) {
        this.cachedPath = result;
        return result;
      }
    } catch {
      // not in PATH
    }

    // 4. Check other common install locations
    const candidates = [
      join(homedir(), '.rustup', 'toolchains', 'stable-*', 'bin', 'claw'),
    ];

    for (const candidate of candidates) {
      // Handle glob patterns for rustup toolchains
      if (candidate.includes('*')) {
        const base = candidate.substring(0, candidate.indexOf('*'));
        const { readdirSync } = require('fs') as typeof import('fs');
        try {
          const entries = readdirSync(join(base, '..'));
          for (const entry of entries) {
            const fullPath = join(base, '..', entry, 'bin', 'claw');
            if (existsSync(fullPath)) {
              this.cachedPath = fullPath;
              return fullPath;
            }
          }
        } catch { /* directory not found */ }
        continue;
      }

      if (existsSync(candidate)) {
        this.cachedPath = candidate;
        return candidate;
      }
    }

    return null;
  }

  reset(): void {
    this.cachedPath = null;
  }
}
