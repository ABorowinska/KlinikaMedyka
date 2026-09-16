import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AuthUser {
  id: number;
  username: string;
  roles: number[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthUser | null>(null);

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('loggedUser');
    if (savedUser) {
      this.user.set(JSON.parse(savedUser));
    } else {
      this.http.get<AuthUser | null>('/api/auth').subscribe(u => this.user.set(u));
    }
  }

hasAnyRole(...allowedRoles: number[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  const user = this.user();
  if (!user || !user.roles) return false;
  return user.roles.some(role => allowedRoles.includes(role));
}

  login(username: string, password: string) {
    return this.http.post<AuthUser>('/api/auth', { username, password });
  }

  logout() {
    return this.http.delete<void>('/api/auth');
  }
}