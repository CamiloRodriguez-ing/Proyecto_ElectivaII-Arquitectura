import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { OAuthService, OAuthStorage } from 'angular-oauth2-oidc';

class MockOAuthService {
  configure() {}
  setupAutomaticSilentRefresh() {}
  loadDiscoveryDocumentAndTryLogin() { return Promise.resolve(false); }
  hasValidAccessToken() { return false; }
  logOut() {}
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: OAuthService, useClass: MockOAuthService },
    { provide: OAuthStorage, useValue: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
