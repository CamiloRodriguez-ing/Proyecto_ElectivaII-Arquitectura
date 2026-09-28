import { Injectable, signal } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

export interface UserRole {
  id: string;
  name: string;
  description: string;
  username?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public currentUser = signal<UserRole | null>(null);
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  constructor(private oauthService: OAuthService) {
    this.configureOAuth();
  }

  private configureOAuth() {
    if (typeof window === 'undefined') return;

    const authConfig: AuthConfig = {
      issuer: (environment as any).keycloak?.issuer || 'https://keycloak-3a73e53a-a0c9-4484-ba06-7bfbeca55673.moonshard-wow.com/realms/academic-requests',
      redirectUri: window.location.origin + '/',
      clientId: 'academic-frontend',
      responseType: 'code',
      scope: 'openid profile email',
      showDebugInformation: true,
      requireHttps: false,
      postLogoutRedirectUri: window.location.origin + '/'
    };

    this.oauthService.configure(authConfig);
    this.oauthService.setupAutomaticSilentRefresh();

    this.oauthService.loadDiscoveryDocumentAndTryLogin().then(() => {
      if (this.oauthService.hasValidAccessToken()) {
        this.decodeAndSetUser(this.oauthService.getAccessToken());
        
        // Only redirect if we are on the login page or root, to avoid loop
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
          this.redirectBasedOnRole();
        }
      }
    }).catch(err => {
      // silent
    });
  }

  public loginRedirect() {
    this.oauthService.initCodeFlow();
  }

  private decodeAndSetUser(token: string) {
    try {
      const decoded: any = jwtDecode(token);
      let roleId = 'estudiante';
      let roleName = 'Estudiante';
      
      const username = decoded.preferred_username || '';
      if (username.startsWith('admin')) {
        roleId = 'admin'; roleName = 'Administrador';
      } else if (username.startsWith('analista')) {
        roleId = 'analista'; roleName = 'Analista';
      } else if (username.startsWith('revisor')) {
        roleId = 'revisor'; roleName = 'Revisor Docente';
      }

      this.currentUser.set({
        id: roleId,
        name: roleName,
        description: decoded.name || username,
        username: username,
        email: decoded.email || ''
      });
      
      localStorage.setItem('access_token', token);
    } catch (e) {
      // silent
    }
  }

  private redirectBasedOnRole() {
    const user = this.currentUser();
    let targetRoute = '/requests'; // Default for students

    if (user?.id === 'revisor') {
      targetRoute = '/validation';
    } else if (user?.id === 'analista') {
      targetRoute = '/validation'; // We can share the validation route for now
    } else if (user?.id === 'admin') {
      targetRoute = '/validation'; // Admin can go to validation as well
    }

    import('@angular/router').then(({ Router }) => {
      const router = (window as any).ng?.getComponent?.(document.body)?.router;
      if (router) router.navigate([targetRoute]);
      else window.location.href = targetRoute;
    });
  }

  public logout() {
    const idToken = this.oauthService.getIdToken();
    
    this.oauthService.logOut(true); 
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('access_token');
    }
    this.currentUser.set(null);
    
    if (typeof window !== 'undefined') {
      const postLogoutUri = encodeURIComponent(window.location.origin + '/');
      const issuer = (environment as any).keycloak?.issuer || 'https://keycloak-3a73e53a-a0c9-4484-ba06-7bfbeca55673.moonshard-wow.com/realms/academic-requests';
      
      let keycloakLogoutUrl = `${issuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${postLogoutUri}&client_id=academic-frontend`;
      if (idToken) {
          keycloakLogoutUrl += `&id_token_hint=${idToken}`;
      }
      
      window.location.href = keycloakLogoutUrl;
    }
  }
}
