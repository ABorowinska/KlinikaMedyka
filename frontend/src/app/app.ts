import { Component, computed, inject, Renderer2, ChangeDetectorRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from './material/material-module';
import { AuthService } from './auth.service';
import { routes, RouteData } from './app.routes';
import { WsService } from './ws.service';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { DOCUMENT } from '@angular/common'; 
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({  
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MaterialModule, FormsModule, CommonModule, MatMenuModule, MatBadgeModule, RouterLinkActive, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  loginUsername = '';
  loginPassword = '';
  _isDarkMode = true;

  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  protected auth = inject(AuthService);
  private router = inject(Router);
  ws = inject(WsService);
  private cdr = inject(ChangeDetectorRef); 
  
  translate = inject(TranslateService);

  get isDarkMode(): boolean {
    return this._isDarkMode;
  }

  set isDarkMode(value: boolean) {
    this._isDarkMode = value;
    localStorage.setItem('themePref', value ? 'dark' : 'light');
    if (value) {
      this.renderer.removeClass(this.document.body, 'light-theme');
    } else {
      this.renderer.addClass(this.document.body, 'light-theme');
    }
  }

  constructor() {
   const savedTheme = localStorage.getItem('themePref');
this.isDarkMode = savedTheme !== 'light';
    

    const savedUser = localStorage.getItem('loggedUser');
    if (savedUser) {
      this.auth.user.set(JSON.parse(savedUser));
      setTimeout(() => this.ws.podlacz(), 100); 
    }

    this.translate.addLangs(['pl', 'en']);
    this.translate.setDefaultLang('pl');

    const zapisanyJezyk = localStorage.getItem('wybranyJezyk');
    if (zapisanyJezyk) {
      this.translate.use(zapisanyJezyk);
    } else {
      this.translate.use('pl'); 
    }
    
    setInterval(() => {
      this.cdr.detectChanges();
    }, 1000);
  }

  navItems = computed(() =>
    routes
      .filter(r => r.data)
      .filter(r => this.auth.hasAnyRole(...(r.data as RouteData).roles))
      .map(r => r.data as RouteData)
  );

  zmienJezyk(jezyk: string) {
    this.translate.use(jezyk);
    localStorage.setItem('wybranyJezyk', jezyk);
  }

  login() {
    this.auth.login(this.loginUsername, this.loginPassword).subscribe({
      next: u => {
        this.auth.user.set(u);
        localStorage.setItem('loggedUser', JSON.stringify(u));
        this.ws.podlacz();
        this.loginPassword = '';
        this.router.navigate(['/']);
      },
      error: () => alert('Brak połączenia z backendem lub błędne dane!')
    });
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.auth.user.set(null);
      localStorage.removeItem('loggedUser');
      this.ws.rozlacz();
      this.loginUsername = '';
      this.router.navigate(['/']);
    });
  }
}