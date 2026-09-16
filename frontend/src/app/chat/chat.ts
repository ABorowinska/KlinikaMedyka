import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { WsService } from '../ws.service';
import { MaterialModule } from '../material/material-module';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TranslateModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  ws = inject(WsService);
  cdr = inject(ChangeDetectorRef);

  message = '';
  wybranyOdbiorca = 'Wszyscy'; 
  odbiorcy: string[] = []; 
  mobilnyCzatOtwarty = false;
  
  interwalOdswiezania: any;

  ngOnInit() {
    this.ws.czatOtwarty = true;
    this.ws.oznaczJakoPrzeczytane();

    const mojLogin = this.auth.user()?.username;
    const wszyscy = ['admin', 'lekarz', 'recepcja'];
    this.odbiorcy = wszyscy.filter(osoba => osoba !== mojLogin);

    this.interwalOdswiezania = setInterval(() => {
      this.cdr.detectChanges();
    }, 500);
  }

  ngOnDestroy() {
    this.ws.czatOtwarty = false;
    if (this.interwalOdswiezania) {
      clearInterval(this.interwalOdswiezania);
    }
  }

  wybierzKontakt(osoba: string) {
    this.wybranyOdbiorca = osoba;
    this.mobilnyCzatOtwarty = true;
  }

  wrocDoKontaktow() {
    this.mobilnyCzatOtwarty = false;
  }

  getIcon(osoba: string): string {
    if (osoba === 'Wszyscy') return 'groups';
    if (osoba === 'admin') return 'admin_panel_settings';
    if (osoba === 'lekarz') return 'medical_services';
    if (osoba === 'recepcja') return 'support_agent';
    return 'person'; 
  }

  getNazwa(osoba: string): string {
    if (!osoba) return '';
    const lower = osoba.toLowerCase();
    if (lower === 'admin') return 'ROLES.ADMIN';
    if (lower === 'lekarz') return 'ROLES.DOCTOR';
    if (lower === 'recepcja') return 'ROLES.RECEPTION';
    return osoba;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const text = this.message.trim();
    if (!text) return;
    
    this.ws.send({ text: text, to: this.wybranyOdbiorca });
    this.message = '';
    
    this.cdr.detectChanges(); 
  }

  get widoczneWiadomosci() {
    const mojLogin = this.auth.user()?.username;
    
    return this.ws.messages.filter(msg => {
      if (this.wybranyOdbiorca === 'Wszyscy') {
        return msg.to === 'Wszyscy';
      } else {
        const wyslaneDoNiego = msg.author === mojLogin && msg.to === this.wybranyOdbiorca;
        const otrzymaneOdNiego = msg.author === this.wybranyOdbiorca && msg.to === mojLogin;
        
        return wyslaneDoNiego || otrzymaneOdNiego;
      }
    });
  }
}
