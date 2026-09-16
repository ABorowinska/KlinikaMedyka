import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MaterialModule } from '../material/material-module';
import { AuthService } from '../auth.service';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-wizyty',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule,TranslateModule], 
  templateUrl: './wizyty.html',
  styleUrl: './wizyty.css'
})
export class WizytyComponent implements OnInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  snackBar = inject(MatSnackBar);

  pacjenci: any[] = [];
  lekarze: any[] = [];
  minDate = new Date();

  wszystkieGodziny = [
    '08:00', '08:15', '08:30', '08:45', '09:00', '09:15',
    '09:30', '09:45', '10:30', '10:45', '11:00', '11:15',
    '11:30', '11:45', '12:00', '12:15', '12:30', '13:00',
    '13:15', '13:30', '13:45', '14:30', '14:45', '15:00', 
    '15:15', '15:30', '15:45'
  ];
  
  dostepneGodziny: string[] = [...this.wszystkieGodziny];

  nowaWizyta = {
    pacjentId: null,
    lekarzId: null,
    gabinetId: null, 
    data: null,
    godzina: null,
    notatka: ''
  };

  ngOnInit() {
    if (this.auth.hasAnyRole(0, 2)) {
      this.pobierzPacjentow();
      this.pobierzLekarzy();
    }
  }

 mojFiltrDaty = (d: Date | null): boolean => {
    if (!d) return false;
    const day = d.getDay();
    const dzis = new Date();
    dzis.setHours(0, 0, 0, 0);
    return day !== 0 && day !== 6 && d >= dzis;
  };

  pobierzPacjentow() {
    this.http.get<any>('/api/pacjenci').subscribe(odpowiedz => {
      this.pacjenci = odpowiedz.data;
      this.cdr.detectChanges();
    });
  }

  pobierzLekarzy() {
    this.http.get<any>('/api/lekarze').subscribe(odpowiedz => {
      this.lekarze = odpowiedz.data;
      this.cdr.detectChanges();
    });
  }

  naZmianeLekarza() {
    const wybranoLekarza = this.lekarze.find(l => l.id === Number(this.nowaWizyta.lekarzId));
    if (wybranoLekarza) {
      this.nowaWizyta.gabinetId = wybranoLekarza.numer_gabinetu || wybranoLekarza.gabinet_id;
    }
    this.odswiezDostepneGodziny();
  }

  odswiezDostepneGodziny() {
    if (!this.nowaWizyta.data || !this.nowaWizyta.lekarzId) {
      this.dostepneGodziny = [...this.wszystkieGodziny];
      return;
    }

    const d = new Date(this.nowaWizyta.data);
    const dataStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    this.http.get<any>(`/api/wizyty?data=${dataStr}`).subscribe(res => {
      if (res.sukces) {
        const wizyty = res.data.filter((w: any) => {
          const aktualnyStatus = String(w.status || '').toLowerCase().trim();
          return w.lekarz_id === Number(this.nowaWizyta.lekarzId) && aktualnyStatus !== 'anulowana';
        });

        const zajete = wizyty.map((w: any) => {
          const czas = w.data.split(' ')[1]; 
          return czas ? czas.substring(0, 5) : ''; 
        });
        this.dostepneGodziny = this.wszystkieGodziny.filter(g => !zajete.includes(g));
        this.cdr.detectChanges();
      }
    });
  }
  
  zapiszWizyte() {
    if (!this.nowaWizyta.pacjentId || !this.nowaWizyta.lekarzId || !this.nowaWizyta.data || !this.nowaWizyta.godzina) {
      this.snackBar.open('Wypełnij wszystkie wymagane pola przed zapisem', 'Rozumiem', { duration: 3000 });
      return;
    }

    const d = new Date(this.nowaWizyta.data);
    const rok = d.getFullYear();
    const miesiac = String(d.getMonth() + 1).padStart(2, '0');
    const dzien = String(d.getDate()).padStart(2, '0');
    const sformatowanaData = `${rok}-${miesiac}-${dzien}`;
    const payload = {
      pacjentId: this.nowaWizyta.pacjentId,
      lekarzId: this.nowaWizyta.lekarzId,
      gabinetId: this.nowaWizyta.gabinetId || 1, 
      data: sformatowanaData,
      godzina: this.nowaWizyta.godzina,
      notatka: this.nowaWizyta.notatka
    };

    this.http.post('/api/wizyty', payload).subscribe({
      next: (odp: any) => {
        if (odp && odp.sukces === false) {
          this.snackBar.open(odp.wiadomosc || 'Nie udało się zapisać wizyty', 'Zamknij', { duration: 5000 });
          return;
        }
        this.snackBar.open('Wizyta została zaplanowana', 'Zamknij', { duration: 4000 });
        this.nowaWizyta = { pacjentId: null, lekarzId: null, gabinetId: null, data: null, godzina: null, notatka: '' };
        this.dostepneGodziny = [...this.wszystkieGodziny];
        this.cdr.detectChanges();
      },
      error: (blad) => {
        console.error('Błąd zapisu wizyty:', blad);
        const komunikat = blad.error?.wiadomosc || 'Wystąpił błąd serwera';
        this.snackBar.open(komunikat, 'Zamknij', { duration: 5000 });
      }
    });
  }
}