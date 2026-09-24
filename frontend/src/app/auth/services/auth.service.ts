import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { delay, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface UserRole {
  id: string;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || '/v1';
  
  // Simulated state for demo
  public currentUser = signal<UserRole | null>(null);
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  public loginDemo(role: UserRole) {
    this.isLoading.set(true);
    this.error.set(null);
    
    // Simulate connection by calling health endpoint
    return this.http.get<{data: any, meta: any}>(`${this.apiUrl}/health`).pipe(
      delay(800), // Simulate network delay
      tap((response) => {
        if (response?.data?.status === 'ok') {
          this.currentUser.set(role);
          this.isLoading.set(false);
        } else {
          throw new Error('Backend no disponible');
        }
      }),
      catchError(err => {
        // If the backend isn't running (it's AWS SAM, might not be running locally)
        // we'll still let them log in since it's a demo mode, or we can show an error
        // Let's show a simulated success for the sake of the mockup functionality if health fails
        console.warn('Backend /health falló. Continuando modo demo local.', err);
        this.currentUser.set(role);
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  public logout() {
    this.currentUser.set(null);
  }
}
