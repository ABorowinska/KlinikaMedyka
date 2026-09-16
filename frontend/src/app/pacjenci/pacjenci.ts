import { Component, inject, OnInit, ChangeDetectorRef, ViewChild, AfterViewInit, Inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MaterialModule } from '../material/material-module';
import { AuthService } from '../auth.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-historia-pacjenta-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule, FormsModule, TranslateModule,MatCheckboxModule ],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 24px);
      background: #ffffff;
      color: #111827;
    }

    .dialog-scroll {
      min-height: 0;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: #ffffff;
    }

    .dokument-karta {
      padding: 28px;
      background: #ffffff;
      color: #111827;
      font-family: Arial, sans-serif;
    }

    .dokument-karta p,
    .dokument-karta strong,
    .dokument-karta span,
    .dokument-karta td,
    .dokument-karta th {
      color: #111827;
    }

    .dok-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      padding: 20px;
      margin-bottom: 24px;
      background: #f5f9ff;
      border: 1px solid #d7e5f5;
      border-radius: 14px;
    }

    .dok-title {
      margin: 0 0 12px;
      color: #176fd1 !important;
      font-size: 24px;
      font-weight: 700;
    }

    .patient-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
    }

    .patient-meta p {
      margin: 0;
      font-size: 14px;
    }

    .dok-icon {
      width: 64px;
      height: 64px;
      flex: 0 0 64px;
      color: #2e8eff !important;
      font-size: 64px;
    }

    .history-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 15px;
    }

    .history-title {
      margin: 0;
      color: #176fd1 !important;
      font-size: 20px;
      font-weight: 700;
    }

    .dok-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
    }

    .dok-table th {
      padding: 11px;
      background: #eff6ff;
      border: 1px solid #d1d5db;
      font-weight: 700;
    }

    .dok-table td {
      padding: 11px;
      border: 1px solid #d1d5db;
    }

    .mobile-history {
      display: none;
    }

    .btn-neon-download,
    .btn-neon-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border-radius: 9px;
      cursor: pointer;
      font-weight: 600;
      transition: background 180ms ease, box-shadow 180ms ease;
    }

    .btn-neon-download {
      min-height: 42px;
      padding: 0 20px;
      color: #ffffff;
      background: #2e8eff;
      border: 0;
      box-shadow: 0 6px 16px rgba(46, 142, 255, 0.28);
      font-size: 14px;
    }

    .btn-neon-download:hover {
      background: #1c75db;
      box-shadow: 0 8px 20px rgba(46, 142, 255, 0.4);
    }

    .btn-neon-download:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .btn-neon-secondary {
      min-height: 38px;
      padding: 0 15px;
      color: #176fd1;
      background: #f3f8ff;
      border: 1px solid #2e8eff;
    }

    .btn-neon-secondary:hover {
      background: #e3f0ff;
      box-shadow: 0 5px 14px rgba(46, 142, 255, 0.2);
    }

    .loading-state,
    .empty-state {
      padding: 24px 0;
    }

    .loading-state {
      color: #176fd1 !important;
      font-style: italic;
    }

    .dialog-actions {
      gap: 10px;
      padding: 14px 20px;
      margin: 0;
      background: #f5f7fa;
      border-top: 1px solid #d1d5db;
    }

    .close-button {
      color: #111827;
      font-weight: 700;
    }

    @media (max-width: 700px) {
      :host {
        max-height: calc(100vh - 16px);
      }

      .dokument-karta {
        padding: 14px;
      }

      .dok-header {
        align-items: flex-start;
        padding: 16px;
        margin-bottom: 18px;
      }

      .dok-title {
        font-size: 19px;
        line-height: 1.25;
      }

      .patient-meta {
        flex-direction: column;
        gap: 6px;
      }

      .dok-icon {
        width: 42px;
        height: 42px;
        flex-basis: 42px;
        font-size: 42px;
      }

      .history-toolbar {
        align-items: stretch;
        flex-direction: column;
      }

      .history-title {
        font-size: 18px;
      }

      .btn-neon-secondary {
        width: 100%;
      }

      .desktop-history {
        display: none;
      }

      .mobile-history {
        display: grid;
        gap: 10px;
      }

      .mobile-visit-card {
        padding: 13px;
        background: #ffffff;
        border: 1px solid #d7e5f5;
        border-radius: 12px;
      }

      .visit-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e5e7eb;
      }

      .visit-date {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .visit-date strong {
        font-size: 15px;
      }

      .visit-date span {
        color: #64748b !important;
        font-size: 12px;
      }

      .visit-status {
        flex: 0 0 auto;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .visit-details {
        display: grid;
        gap: 10px;
        padding-top: 11px;
      }

      .visit-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .visit-field > span {
        color: #64748b !important;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .visit-field strong {
        overflow-wrap: anywhere;
        font-size: 13px;
      }

      .dialog-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: 12px;
      }

      .dialog-actions button {
        width: 100%;
        min-width: 0;
        margin: 0 !important;
      }
    }

    @media (max-width: 390px) {
      .dok-icon {
        display: none;
      }

      .dialog-actions {
        grid-template-columns: 1fr;
      }
        
    }
  `],
  template: `
    
    <div class="dialog-scroll">
      <div class="dokument-karta">
        
        <div class="dok-header">
          <div>
            <h2 class="dok-title">{{ 'PATIENTS_RECORD.DIALOG_TITLE' | translate }} {{ data.pacjent.imie }} {{ data.pacjent.nazwisko }}</h2>
            <div class="patient-meta">
              <p><strong>{{ 'PATIENTS_RECORD.COL_PESEL' | translate }}:</strong> {{ data.pacjent.pesel }}</p>
              <p><strong>{{ 'PATIENTS_RECORD.DIALOG_DOB' | translate }}</strong> {{ data.pacjent.data_urodzenia }}</p>
            </div>
          </div>
          <mat-icon class="dok-icon">account_box</mat-icon>
        </div>

        <div class="history-toolbar">
          <h3 class="history-title">{{ 'PATIENTS_RECORD.DIALOG_HISTORY_TITLE' | translate }}</h3>
          
          <button class="btn-neon-secondary" (click)="wymusOdswiezenie()">
            <mat-icon>visibility</mat-icon>
            {{ 'PATIENTS_RECORD.DIALOG_BTN_SHOW_VISITS' | translate }}
          </button>
        </div>
        
        <div *ngIf="trwaLadowanie" class="loading-state">{{ 'PATIENTS_RECORD.DIALOG_LOADING' | translate }}</div>
        <div *ngIf="!trwaLadowanie && wizyty.length === 0" class="empty-state">{{ 'PATIENTS_RECORD.DIALOG_EMPTY' | translate }}</div>
        
        <table *ngIf="!trwaLadowanie && wizyty.length > 0" class="dok-table desktop-history">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">
                <mat-icon style="color: #2e8eff !important; font-size: 20px; vertical-align: middle;">print</mat-icon>
              </th>
              <th>{{ 'PATIENTS_RECORD.DIALOG_COL_DATE' | translate }}</th>
              <th>{{ 'PATIENTS_RECORD.DIALOG_COL_TIME' | translate }}</th>
              <th>{{ 'PATIENTS_RECORD.DIALOG_COL_DOCTOR' | translate }}</th>
              <th>{{ 'PATIENTS_RECORD.DIALOG_COL_STATUS' | translate }}</th>
              <th>{{ 'PATIENTS_RECORD.DIALOG_COL_NOTES' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let wizyta of wizyty">
              <td style="text-align: center;">
               <mat-checkbox
  [checked]="wizyta.wybrana"
  (change)="wizyta.wybrana = $event.checked">
</mat-checkbox>
              </td>
              <td>{{ wizyta.data | date:'yyyy-MM-dd' }}</td>
              <td>{{ wizyta.data | date:'HH:mm' }}</td>
              <td>{{ 'PATIENTS_RECORD.PREFIX_DR' | translate }} {{ wizyta.lekarz_nazwa }}</td>
              <td style="font-weight: bold;" [ngStyle]="{'color': pobierzKolor(wizyta.status)}">
                {{ 'STATUS.' + wizyta.status.toUpperCase() | translate }}
              </td>
              <td>{{ wizyta.uwagi_do_statusu || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!trwaLadowanie && wizyty.length > 0" class="mobile-history">
          <article *ngFor="let wizyta of wizyty" class="mobile-visit-card">
            <div class="visit-card-header">
              <mat-checkbox
  [checked]="wizyta.wybrana"
  (change)="wizyta.wybrana = $event.checked">
</mat-checkbox>
              <div class="visit-date">
                <strong>{{ wizyta.data | date:'yyyy-MM-dd' }}</strong>
                <span>{{ wizyta.data | date:'HH:mm' }}</span>
              </div>
              <span class="visit-status" [style.color]="pobierzKolor(wizyta.status)">
                {{ 'STATUS.' + wizyta.status.toUpperCase() | translate }}
              </span>
            </div>

            <div class="visit-details">
              <div class="visit-field">
                <span>{{ 'PATIENTS_RECORD.DIALOG_COL_DOCTOR' | translate }}</span>
                <strong>{{ 'PATIENTS_RECORD.PREFIX_DR' | translate }} {{ wizyta.lekarz_nazwa }}</strong>
              </div>
              <div class="visit-field">
                <span>{{ 'PATIENTS_RECORD.DIALOG_COL_NOTES' | translate }}</span>
                <strong>{{ wizyta.uwagi_do_statusu || '-' }}</strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <div style="position: absolute; left: -9999px; top: 0;">
      <div id="pdf-content" style="width: 800px; padding: 40px; background-color: #ffffff; color: #000000; font-family: sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; border: 2px solid #000; padding: 20px; margin-bottom: 30px;">
          <div>
            <h2 style="margin: 0 0 10px 0; color: #2e8eff; font-size: 26px;">{{ 'PATIENTS_RECORD.DIALOG_TITLE' | translate }} {{ data.pacjent.imie }} {{ data.pacjent.nazwisko }}</h2>
            <p style="margin: 5px 0; font-size: 16px; color: #000;"><strong>{{ 'PATIENTS_RECORD.COL_PESEL' | translate }}:</strong> {{ data.pacjent.pesel }}</p>
            <p style="margin: 5px 0; font-size: 16px; color: #000;"><strong>{{ 'PATIENTS_RECORD.DIALOG_DOB' | translate }}</strong> {{ data.pacjent.data_urodzenia }}</p>
          </div>
          <mat-icon style="font-size: 80px; height: 80px; width: 80px; color: #2e8eff;">account_box</mat-icon>
        </div>
        <h3 style="margin-bottom: 15px; font-size: 20px; color: #000;">{{ 'PATIENTS_RECORD.DIALOG_HISTORY_TITLE' | translate }}</h3>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; text-align: left;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 12px; font-weight: bold; color: #000;">{{ 'PATIENTS_RECORD.DIALOG_COL_DATE' | translate }}</th>
              <th style="border: 1px solid #000; padding: 12px; font-weight: bold; color: #000;">{{ 'PATIENTS_RECORD.DIALOG_COL_TIME' | translate }}</th>
              <th style="border: 1px solid #000; padding: 12px; font-weight: bold; color: #000;">{{ 'PATIENTS_RECORD.DIALOG_COL_DOCTOR' | translate }}</th>
              <th style="border: 1px solid #000; padding: 12px; font-weight: bold; color: #000;">{{ 'PATIENTS_RECORD.DIALOG_COL_STATUS' | translate }}</th>
              <th style="border: 1px solid #000; padding: 12px; font-weight: bold; color: #000;">{{ 'PATIENTS_RECORD.DIALOG_COL_NOTES' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let wizyta of wizyty">
              <tr *ngIf="wizyta.wybrana">
                <td style="border: 1px solid #000; padding: 12px; color: #000;">{{ wizyta.data | date:'yyyy-MM-dd' }}</td>
                <td style="border: 1px solid #000; padding: 12px; color: #000;">{{ wizyta.data | date:'HH:mm' }}</td>
                <td style="border: 1px solid #000; padding: 12px; color: #000;">{{ 'PATIENTS_RECORD.PREFIX_DR' | translate }} {{ wizyta.lekarz_nazwa }}</td>
                <td style="border: 1px solid #000; padding: 12px; font-weight: bold;" [ngStyle]="{'color': pobierzKolor(wizyta.status)}">{{ 'STATUS.' + wizyta.status.toUpperCase() | translate }}</td>
                <td style="border: 1px solid #000; padding: 12px; color: #000;">{{ wizyta.uwagi_do_statusu || '-' }}</td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>
    
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="zamknij()" class="close-button">{{ 'PATIENTS_RECORD.DIALOG_BTN_CLOSE' | translate }}</button>
      
      <button class="btn-neon-download" (click)="generujPDF()" [disabled]="trwaLadowanie || brakWybranych() || isPrinting">
        <mat-icon style="color: white; margin-right: 5px;">print</mat-icon>
        <span style="color: white;">{{ isPrinting ? ('PATIENTS_RECORD.DIALOG_BTN_PRINTING' | translate) : ('PATIENTS_RECORD.DIALOG_BTN_PRINT' | translate) }}</span>
      </button>
    </mat-dialog-actions>
  `
})
export class HistoriaPacjentaDialog implements OnInit {
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef); 
  zone = inject(NgZone);
  wizyty: any[] = [];
  trwaLadowanie = true; 
  isPrinting = false;

  constructor(
    public dialogRef: MatDialogRef<HistoriaPacjentaDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.trwaLadowanie = true;
    
    this.http.get<any>('/api/wizyty').subscribe({
      next: (res) => {
        this.zone.run(() => {
          if (res.sukces) {
            const imieNazwisko = `${this.data.pacjent.imie} ${this.data.pacjent.nazwisko}`;
            this.wizyty = res.data
              .filter((w: any) => w.pacjent_nazwa === imieNazwisko)
              .map((w: any) => ({ ...w, wybrana: true }));
          }
          this.trwaLadowanie = false;
          this.cdr.detectChanges(); 
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('Błąd pobierania wizyt:', err);
          this.trwaLadowanie = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  wymusOdswiezenie() {
    this.cdr.detectChanges();
  }

  pobierzKolor(status: string): string {
    const s = status.toLowerCase();
    if (s === 'odbyta') return '#28a745'; 
    if (s === 'anulowana') return '#dc3545'; 
    return '#2e8eff'; 
  }

  aktualizujWybor() {
    this.cdr.detectChanges();
  }

  brakWybranych(): boolean {
    return this.wizyty.length === 0 || this.wizyty.every(w => !w.wybrana);
  }

  zamknij() {
    this.dialogRef.close();
  }

  async generujPDF() {
  if (this.isPrinting || this.brakWybranych()) return;

  this.isPrinting = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 150));

    const element = document.getElementById('pdf-content');

    if (!element) {
      throw new Error('Nie znaleziono elementu PDF');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: 900,
      scrollX: 0,
      scrollY: 0
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);

    pdf.save(
      `Karta_${this.data.pacjent.imie}_${this.data.pacjent.nazwisko}.pdf`
    );
  } catch (error) {
    console.error('Błąd podczas generowania pliku PDF:', error);
  } finally {
    this.isPrinting = false;
    this.cdr.detectChanges();
  }
}
}
@Component({
  selector: 'app-pacjenci',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TranslateModule],
  templateUrl: './pacjenci.html',
  styleUrl: './pacjenci.css'
})
export class PacjenciComponent implements OnInit, AfterViewInit {
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  auth = inject(AuthService);
  dialog = inject(MatDialog); 
  
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['id', 'imie', 'nazwisko', 'pesel', 'data_urodzenia'];
  mobilePageIndex = 0;
  mobilePageSize = 10;
  mobileSortColumn: 'id' | 'imie' | 'nazwisko' | 'pesel' | 'data_urodzenia' = 'id';
  mobileSortDirection: 'asc' | 'desc' = 'asc';

  get pacjenciNaStronie(): any[] {
    const poczatek = this.mobilePageIndex * this.mobilePageSize;
    const kierunek = this.mobileSortDirection === 'asc' ? 1 : -1;
    const kolumna = this.mobileSortColumn;

    const posortowani = [...this.dataSource.filteredData].sort((pierwszy, drugi) => {
      if (kolumna === 'id') {
        return (Number(pierwszy.id) - Number(drugi.id)) * kierunek;
      }

      return String(pierwszy[kolumna] ?? '').localeCompare(
        String(drugi[kolumna] ?? ''),
        'pl',
        { sensitivity: 'base', numeric: true }
      ) * kierunek;
    });

    return posortowani.slice(poczatek, poczatek + this.mobilePageSize);
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    if (this.auth.hasAnyRole(0,1,2)) {
      this.pobierzPacjentow();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  pobierzPacjentow() {
    this.http.get<any>('/api/pacjenci').subscribe({
      next: (odpowiedz) => {
        const aktywniPacjenci = odpowiedz.data.filter((p: any) => p.czy_aktywny !== 0);
        this.dataSource.data = aktywniPacjenci; 
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Błąd pobierania pacjentów', err)
    });
  }

  zastosujFiltr(event: Event) {
    const wartoscFiltru = (event.target as HTMLInputElement).value;
    this.dataSource.filter = wartoscFiltru.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    this.mobilePageIndex = 0;
  }

  zmienStroneMobile(event: PageEvent) {
    this.mobilePageIndex = event.pageIndex;
    this.mobilePageSize = event.pageSize;
  }

  sortujMobile() {
    this.mobilePageIndex = 0;
    this.paginator?.firstPage();
  }

  zmienKierunekSortowania() {
    this.mobileSortDirection = this.mobileSortDirection === 'asc' ? 'desc' : 'asc';
    this.sortujMobile();
  }

  otworzHistorie(wybranyPacjent: any) {
    this.dialog.open(HistoriaPacjentaDialog, {
      width: '900px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100vh - 24px)',
      data: { pacjent: wybranyPacjent } 
    });
  }
}
