import { Component, inject, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { AuthService } from '../auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-zmiana-gabinetu-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule, FormsModule, TranslateModule],
  template: `
    <div style="background: var(--bg-main); color: var(--text-main); padding: 10px;">
      <h2 mat-dialog-title style="color: #00c3ff; margin-bottom: 0;">
        <mat-icon style="vertical-align: middle; margin-right: 5px;">edit_location</mat-icon> {{ 'DOCTORS_LIST.DIALOG_CHANGE_ROOM_TITLE' | translate }}
      </h2>
      <mat-dialog-content style="min-width: 350px; padding-top: 15px;">
        <p style="margin-bottom: 20px; color: var(--text-main); opacity: 0.8;">
          {{ 'DOCTORS_LIST.DIALOG_CHANGE_ROOM_DESC' | translate }}<br>
          <strong style="color: #2e8eff; font-size: 16px;">{{ 'DOCTORS_LIST.PREFIX' | translate }} {{ data.lekarz.imie }} {{ data.lekarz.nazwisko }}</strong>
        </p>
        
        <mat-form-field appearance="outline" style="width: 100%;" class="szukajka">
          <mat-label>{{ 'DOCTORS_LIST.DIALOG_ROOM_INPUT_LABEL' | translate }}</mat-label>
          <input matInput [(ngModel)]="nowyGabinet" [placeholder]="'DOCTORS_LIST.DIALOG_ROOM_INPUT_PLACEHOLDER' | translate" autocomplete="off">
          <mat-icon matSuffix style="color: #00c3ff;">meeting_room</mat-icon>
        </mat-form-field>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" style="padding-bottom: 10px; padding-right: 20px;">
        <button mat-button mat-dialog-close>{{ 'DOCTORS_LIST.DIALOG_BTN_CANCEL' | translate }}</button>
        
        <button mat-flat-button color="primary" [mat-dialog-close]="nowyGabinet" [disabled]="!nowyGabinet.trim()">
          <mat-icon style="font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-bottom: 2px;">save</mat-icon> {{ 'DOCTORS_LIST.DIALOG_BTN_SAVE' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class ZmianaGabinetuDialog {
  nowyGabinet: string;
  constructor(
    public dialogRef: MatDialogRef<ZmianaGabinetuDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.nowyGabinet = data.lekarz.gabinet;
  }
}

@Component({
  selector: 'app-lekarze',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule],
  templateUrl: './lekarze.html',
  styleUrl: './lekarze.css'
})
export class LekarzeComponent implements OnInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);
  snackBar = inject(MatSnackBar); 
  dialog = inject(MatDialog);

  lekarze: any[] = [];

  ngOnInit() {
    this.pobierzLekarzy();
  }

  pobierzLekarzy() {
    this.http.get<any>('/api/lekarze').subscribe({
      next: (odpowiedz) => {
        this.lekarze = odpowiedz.data.map((lek: any, index: number) => ({
          id: lek.id,
          imie: lek.imie,
          nazwisko: lek.nazwisko,
          specjalizacja: lek.specjalizacja || 'Lekarz Medycyny',
          gabinet: String(lek.numer_gabinetu || lek.gabinet || (101 + index))
            .replace(/Gabinet\s*/gi, '')
            .trim()
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Błąd pobierania lekarzy z bazy', err)
    });
  }

  umowWizyte(lekarz: any) {
    this.router.navigate(['/wizyty']);
  }

  zmienGabinet(lekarz: any) {
    const dialogRef = this.dialog.open(ZmianaGabinetuDialog, {
      width: '400px',
      data: { lekarz: lekarz }
    });

    dialogRef.afterClosed().subscribe(wynik => {
      if (wynik && wynik.trim() !== '' && wynik.trim() !== lekarz.gabinet) {
        
        const numer = wynik.trim(); 
        
        this.http.patch(`/api/lekarze/${lekarz.id}/gabinet`, { nowy_gabinet: numer }).subscribe({
          next: (res: any) => {
            this.snackBar.open('Gabinet został zaktualizowany!', 'OK', { duration: 3000 });
            lekarz.gabinet = numer;
            this.cdr.detectChanges(); 
          },
          error: (err) => {
            const wiadomosc = err.error?.wiadomosc || 'Błąd zapisu gabinetu.';
            this.snackBar.open(wiadomosc, 'Zamknij', { duration: 6000 });
          }
        });
      }
    });
  }
}
