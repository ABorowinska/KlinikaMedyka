import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; 
import { AuthService } from '../auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pusta-strona',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, RouterLink], 
  templateUrl: './pustastrona.html',
  styleUrl: './pustastrona.css'
})
export class PustaStrona implements OnInit, OnDestroy {
  auth = inject(AuthService); 
  
  translate = inject(TranslateService); 

  aktualnySlajd = 0;
  interwal: any;

  get slajdy() {
    if (this.translate.currentLang === 'en') {
      return [
        '/GłownaKlinika.png',
        '/2stronaeng.png',
        '/3stronaeng.png',
        '/4stronaeng.png',
        '/5stronaeng.png',
        '/6stronaeng.png'
      ];
    }
    return [
      '/GłownaKlinika.png',
      '/2stronapl.png',
      '/3stronapl.png',
      '/4stronapl.png',
      '/5stronapl.png',
      '/6stronapl.png'
    ];
  }

  ngOnInit() {
    this.startSlider(); 
  }

  ngOnDestroy() {
    this.zatrzymajSlider(); 
  }

  startSlider() {
    this.interwal = setInterval(() => { this.nastepnySlajd(); }, 5000); 
  }

  zatrzymajSlider() {
    if (this.interwal) clearInterval(this.interwal);
  }

  nastepnySlajd() {
    this.aktualnySlajd = (this.aktualnySlajd + 1) % this.slajdy.length;
  }

  poprzedniSlajd() {
    this.aktualnySlajd = (this.aktualnySlajd - 1 + this.slajdy.length) % this.slajdy.length;
  }

  wybierzSlajd(index: number) {
    this.aktualnySlajd = index;
    this.zatrzymajSlider(); 
    this.startSlider();
  }
}
