import { Component, OnInit, inject, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MaterialModule } from '../material/material-module';
import { AuthService } from '../auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-notatka-lekarza-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule, FormsModule,TranslateModule],
  template: `
    <h2 mat-dialog-title style="color: #2e8eff;">Zakończenie wizyty</h2>
    <mat-dialog-content class="visit-dialog-content" style="padding-top: 10px;">
      <p>Wprowadź zalecenia, diagnozę lub przepisane leki dla pacjenta.</p>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Notatka z wizyty (Diagnoza / Zalecenia)</mat-label>
        <textarea matInput [(ngModel)]="notatka" rows="5" placeholder="Np. Zalecono odpoczynek..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding-bottom: 20px; padding-right: 20px;">
      <button mat-button (click)="dialogRef.close()">Anuluj</button>
      <button mat-flat-button color="primary" (click)="dialogRef.close(notatka)" [disabled]="!notatka.trim()">
        <mat-icon>save</mat-icon> Zapisz i Zakończ
      </button>
    </mat-dialog-actions>
  `
})
export class NotatkaLekarzaDialog {
  notatka = '';
  constructor(public dialogRef: MatDialogRef<NotatkaLekarzaDialog>) {}
}

@Component({
  selector: 'app-edycja-wizyty-admin-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule, FormsModule,TranslateModule],
 template: `
    <h2 mat-dialog-title style="color: #f44336;"><mat-icon style="vertical-align: middle;">admin_panel_settings</mat-icon> {{ 'EDIT_APPOINTMENT_ADMIN.TITLE' | translate }}</h2>
    <mat-dialog-content class="visit-dialog-content" style="padding-top: 10px;">
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 15px;">
        <mat-label>{{ 'EDIT_APPOINTMENT_ADMIN.STATUS' | translate }}</mat-label>
        <mat-select [(ngModel)]="dane.status">
          
          <mat-option value="Zaplanowana">{{ 'STATUS.ZAPLANOWANA' | translate }}</mat-option>
          <mat-option value="Odbyta">{{ 'STATUS.ODBYTA' | translate }}</mat-option>
          <mat-option value="Anulowana">{{ 'STATUS.ANULOWANA' | translate }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>{{ 'EDIT_APPOINTMENT_ADMIN.NOTES' | translate }}</mat-label>
        <textarea matInput [(ngModel)]="dane.uwagi" rows="5"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding-bottom: 20px; padding-right: 20px;">
      <button mat-button mat-dialog-close>{{ 'EDIT_APPOINTMENT_ADMIN.BTN_BACK' | translate }}</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="dane">
        <mat-icon>edit</mat-icon> {{ 'EDIT_APPOINTMENT_ADMIN.BTN_SAVE' | translate }}
      </button>
    </mat-dialog-actions>
  `
})
export class EdycjaWizytyAdminDialog {
  dane: any;
  constructor(
    public dialogRef: MatDialogRef<EdycjaWizytyAdminDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.dane = {
      status: data.wizyta.status,
      uwagi: data.wizyta.uwagi_do_statusu || ''
    };
  }
}

@Component({
  selector: 'app-lista-wizyt',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, MatDialogModule,TranslateModule],
  templateUrl: './lista-wizyt.html', 
  styleUrl: './lista-wizyt.css'
})
export class ListaWizytComponent implements OnInit {
  http = inject(HttpClient);
  auth = inject(AuthService);
  cdr = inject(ChangeDetectorRef);
  snackBar = inject(MatSnackBar);
  dialog = inject(MatDialog);
  route = inject(ActivatedRoute); 

  wizyty: any[] = [];
  wywietlaneKolumny: string[] = ['data', 'pacjent', 'lekarz', 'gabinet', 'status', 'akcje'];
  
  wybranaData: Date = new Date();
  lekarzFilter: number | null = null; 

  szukanyNumer: string = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['data']) {
        this.wybranaData = new Date(params['data']);
      }
      if (params['lekarz_id']) {
        this.lekarzFilter = Number(params['lekarz_id']);
      }
      this.pobierzWizyty();
    });
  }

  onDataChange() {
    this.pobierzWizyty();
  }

  zmienDzien(kierunek: number) {
    const nowaData = new Date(this.wybranaData);
    nowaData.setDate(nowaData.getDate() + kierunek);
    this.wybranaData = nowaData;
    this.pobierzWizyty();
  }

  tylkoGodzina(dataString: string): string {
    if (!dataString) return '';
    const czesci = dataString.split(/[T ]/); 
    return czesci.length > 1 ? czesci[1].substring(0, 5) : dataString;
  }

  pobierzDaneDoAudytu(): string {
    const u = this.auth.user();
    if (!u) return 'Nieznany System';
    
    let nazwaRoli = 'Nieznana rola';
    if (u.roles.includes(0)) nazwaRoli = 'Administrator';
    else if (u.roles.includes(1)) nazwaRoli = 'Lekarz';
    else if (u.roles.includes(2)) nazwaRoli = 'Recepcja';

    return `${u.username} (${nazwaRoli})`;
  }

  pobierzWizyty() {
    const user = this.auth.user();
    if (!user) return;
    const rola = user.roles[0];
    
    const rok = this.wybranaData.getFullYear();
    const miesiac = String(this.wybranaData.getMonth() + 1).padStart(2, '0');
    const dzien = String(this.wybranaData.getDate()).padStart(2, '0');
    const sformatowanaData = `${rok}-${miesiac}-${dzien}`;

    let url = `/api/wizyty?rola=${rola}&data=${sformatowanaData}`;
    
    if (rola === 1) {
      url += `&lekarz_id=${user.id}`;
    } else if (this.lekarzFilter) {
      url += `&lekarz_id=${this.lekarzFilter}`;
    }

    this.http.get<any>(url).subscribe({
      next: (odpowiedz) => {
        this.wizyty = odpowiedz.data;
        this.cdr.detectChanges();
      },
      error: (blad) => console.error('Błąd pobierania wizyt:', blad)
    });
  }

  zmienStatus(id: number, nowyStatus: string) {
    const uzytkownik = this.pobierzDaneDoAudytu();
    this.http.patch(`/api/wizyty/${id}/status`, { nowyStatus, uzytkownik }).subscribe({
      next: () => {
        this.snackBar.open(`Zmieniono status wizyty na: ${nowyStatus}`, 'OK', { duration: 3000 });
        this.pobierzWizyty();
      }
    });
  }

  zakonczWizyte(idWizyty: number) {
    const dialogRef = this.dialog.open(NotatkaLekarzaDialog, {
  width: '500px',
  maxWidth: 'calc(100vw - 24px)',
  disableClose: true,
  panelClass: 'visit-dialog-panel'
});
    dialogRef.afterClosed().subscribe(notatka => {
      if (notatka !== undefined) {
        const uzytkownik = this.pobierzDaneDoAudytu();
        this.http.patch(`/api/wizyty/${idWizyty}/status`, { nowyStatus: 'Odbyta', uwagi_do_statusu: notatka, uzytkownik }).subscribe({
          next: () => {
            this.snackBar.open('Wizyta zakończona, notatka zapisana!', 'OK', { duration: 3000 });
            this.pobierzWizyty();
          }
        });
      }
    });
  }

  edytujWizyteJakoAdmin(wizyta: any) {
   const dialogRef = this.dialog.open(EdycjaWizytyAdminDialog, {
  width: '500px',
  maxWidth: 'calc(100vw - 24px)',
  panelClass: 'visit-dialog-panel',
  data: { wizyta }
});
    dialogRef.afterClosed().subscribe(wynik => {
      if (wynik) {
        const uzytkownik = this.pobierzDaneDoAudytu();
        this.http.patch(`/api/wizyty/${wizyta.id}/status`, { nowyStatus: wynik.status, uwagi_do_statusu: wynik.uwagi, uzytkownik }).subscribe({
          next: () => {
            this.snackBar.open('Wizyta zaktualizowana przez Administratora!', 'OK', { duration: 3000 });
            this.pobierzWizyty();
          }
        });
      }
    });
  }

  czyWizytaWPrzyszlosci(dataWizyty: string): boolean {
    return new Date(dataWizyty) > new Date();
  }
  szukajWizytyPoId() {
    if (!this.szukanyNumer.trim()) return;

    const idDoZnalezienia = this.szukanyNumer.replace('#', '').trim();

    const user = this.auth.user();
    if (!user) return;
    const rola = user.roles[0];

    let url = `/api/wizyty?rola=${rola}`;
    if (rola === 1) {
      url += `&lekarz_id=${user.id}`;
    }

    this.http.get<any>(url).subscribe({
      next: (odpowiedz) => {
        if (odpowiedz.sukces && odpowiedz.data) {
          
          const znalezionaWizyta = odpowiedz.data.find((w: any) => w.id.toString() === idDoZnalezienia);
          
          if (znalezionaWizyta) {
             this.wybranaData = new Date(znalezionaWizyta.data);
             
             this.pobierzWizyty();
             
             this.snackBar.open(`Znaleziono wizytę #${idDoZnalezienia}! Przeniesiono na odpowiedni dzień.`, 'OK', { duration: 4000 });
             this.szukanyNumer = '';
          } else {
             this.snackBar.open(`Nie znaleziono wizyty #${idDoZnalezienia} lub nie masz do niej dostępu.`, 'Zamknij', { duration: 4000 });
          }

        }
      },
      error: (blad) => {
        console.error('Błąd wyszukiwania:', blad);
        this.snackBar.open('Błąd podczas wyszukiwania wizyty.', 'Zamknij', { duration: 3000 });
      }
    });
  }
}
