import { ProviderWorkspaceRegistry } from '../../../core/providers/ProviderWorkspaceRegistry';
import type {
  ProviderCliResolver,
  ProviderWorkspaceRegistration,
  ProviderWorkspaceServices,
} from '../../../core/providers/types';

import { ClawCodeCliResolver } from '../cli/ClawCodeCliResolver';

export interface ClawCodeWorkspaceServices extends ProviderWorkspaceServices {
  cliResolver: ProviderCliResolver;
}

let workspaceServices: ClawCodeWorkspaceServices | null = null;

export function getClawCodeWorkspaceServices(): ClawCodeWorkspaceServices | null {
  return workspaceServices;
}

export const clawCodeWorkspaceRegistration: ProviderWorkspaceRegistration<ClawCodeWorkspaceServices> = {
  async initialize(): Promise<ClawCodeWorkspaceServices> {
    const services: ClawCodeWorkspaceServices = {
      cliResolver: new ClawCodeCliResolver(),
    };
    workspaceServices = services;
    return services;
  },
};
