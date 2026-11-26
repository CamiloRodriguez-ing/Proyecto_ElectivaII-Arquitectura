import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface RuntimeConfig {
  apiUrl: string;
  tenantId: string;
  tenantName: string;
  logo: string;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private values: RuntimeConfig = {
    apiUrl: environment.apiUrl,
    tenantId: environment.tenantId,
    tenantName: environment.tenantName,
    logo: environment.logo
  };

  async load(): Promise<void> {
    try {
      const response = await fetch('/runtime-config.json', { cache: 'no-store' });
      if (response.ok) {
        this.values = { ...this.values, ...(await response.json()) };
      }
    } catch {
      // Build-time defaults keep local development usable when the file is absent.
    }
  }

  get config(): RuntimeConfig {
    return this.values;
  }
}
