import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MaterialModule } from '../material/material-module';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { EdycjaPacjentaDialog } from './edycja-pacjenta';
import { EdycjaLekarzaDialog } from './edycja-lekarza';

import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-panel-admina',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, MatTabsModule, TranslateModule],
  templateUrl: './panel-admina.html',
  styleUrl: './panel-admina.css'
})
export class PanelAdminaComponent implements OnInit, AfterViewInit {
  http = inject(HttpClient);
  snackBar = inject(MatSnackBar);
  auth = inject(AuthService);
  dialog = inject(MatDialog); 
  translate = inject(TranslateService);

  nowyPacjent = { imie: '', nazwisko: '', pesel: '', data_urodzenia: '', email: '' };
  nowyLekarz = { imie: '', nazwisko: '', specjalizacja: '', email: '' };
  nowyGabinet = { numer: '' }; 

  @ViewChild('wykresCanvas') wykresCanvas!: ElementRef;
  wykresInstancja: any;
  wybranyWykres: string = 'lekarze';
  trwaGenerowaniePDF: boolean = false; 
  
  tabelaLekarze: any[] = [];
  tabelaWizyty: any[] = [];
  tabelaPacjenci: any[] = []; 

  wszyscyPacjenci: any[] = [];
  wszyscyLekarze: any[] = [];
  szukajPacjenta = '';
  szukajLekarza = '';
  daneAudytu: any[] = [];
  displayedColumnsAudyt: string[] = ['data', 'uzytkownik', 'operacja', 'szczegoly'];

  ngOnInit() {
    if (this.auth.hasAnyRole(0)) {
      this.pobierzDaneDoArchiwum(); 
      this.pobierzAudyt(); 
      this.translate.onLangChange.subscribe(() => {
        if (this.wykresInstancja) this.generujWykres();
      });
    }
  }

  ngAfterViewInit() {
    if (this.auth.hasAnyRole(0)) {
      this.generujWykres();
    }
  }

  generujWykres() {
    if (this.wybranyWykres === 'lekarze') {
      this.http.get<any>('/api/lekarze').subscribe((resLekarze: any) => {
        if (resLekarze && resLekarze.sukces) {
          const statystyki: any = {};
          resLekarze.data.forEach((lek: any) => {
            if (lek.czy_aktywny !== 0) statystyki[`dr ${lek.imie} ${lek.nazwisko}`] = 0;
          });

          this.http.get<any>('/api/wizyty').subscribe((resWizyty: any) => {
            if (resWizyty && resWizyty.sukces) {
              resWizyty.data.forEach((wizyta: any) => {
                const nazwa = `dr ${wizyta.lekarz_nazwa}`;
                if (statystyki[nazwa] !== undefined && String(wizyta.status).toLowerCase() !== 'anulowana') {
                  statystyki[nazwa] += 1;
                }
              });

              this.tabelaLekarze = Object.keys(statystyki).map(klucz => ({
                nazwa: klucz,
                liczba: statystyki[klucz]
              }));

              if (this.wykresInstancja) this.wykresInstancja.destroy();

              this.wykresInstancja = new Chart(this.wykresCanvas.nativeElement, {
                type: 'bar',
                data: {
                  labels: Object.keys(statystyki),
                  datasets: [{
                    label: this.translate.instant('ADMIN_PANEL.TH_VISITS_COUNT'),
                    data: Object.values(statystyki),
                    backgroundColor: 'rgba(46, 142, 255, 0.7)',
                    borderColor: 'rgba(46, 142, 255, 1)',
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
              });
            }
          });
        }
      });
    }
    else if (this.wybranyWykres === 'wizyty') {
      this.http.get<any>('/api/wizyty').subscribe((resWizyty: any) => {
        if (resWizyty && resWizyty.sukces) {
          const zaplanowane = resWizyty.data.filter((w: any) => w.status === 'zaplanowana').length;
          const odbyte = resWizyty.data.filter((w: any) => w.status === 'odbyta').length;
          const anulowane = resWizyty.data.filter((w: any) => w.status === 'anulowana').length;

          const lblZaplanowane = this.translate.instant('ADMIN_PANEL.LBL_PLANNED');
          const lblOdbyte = this.translate.instant('ADMIN_PANEL.LBL_COMPLETED');
          const lblAnulowane = this.translate.instant('ADMIN_PANEL.LBL_CANCELLED');

          this.tabelaWizyty = [
            { status: lblZaplanowane, liczba: zaplanowane },
            { status: lblOdbyte, liczba: odbyte },
            { status: lblAnulowane, liczba: anulowane }
          ];

          if (this.wykresInstancja) this.wykresInstancja.destroy();

          this.wykresInstancja = new Chart(this.wykresCanvas.nativeElement, {
            type: 'doughnut',
            data: {
              labels: [lblZaplanowane, lblOdbyte, lblAnulowane],
              datasets: [{
                data: [zaplanowane, odbyte, anulowane],
                backgroundColor: ['#2e8eff', '#a7d0f7', '#030da3'],
                borderWidth: 0,
                hoverOffset: 10
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: 'gray', padding: 20, font: { size: 14 } } } }
            }
          });
        }
      });
    }
    else if (this.wybranyWykres === 'pacjenci') {
      this.http.get<any>('/api/pacjenci').subscribe((resPacjenci: any) => {
        if (resPacjenci && resPacjenci.sukces) {
          const aktywni = resPacjenci.data.filter((p: any) => p.czy_aktywny !== 0).length;
          const zarchiwizowani = resPacjenci.data.filter((p: any) => p.czy_aktywny === 0).length;

          const lblAktywni = this.translate.instant('ADMIN_PANEL.LBL_ACTIVE_USERS');
          const lblZarchiwizowani = this.translate.instant('ADMIN_PANEL.LBL_ARCHIVED_USERS');

          this.tabelaPacjenci = [
            { status: lblAktywni, liczba: aktywni },
            { status: lblZarchiwizowani, liczba: zarchiwizowani }
          ];

          if (this.wykresInstancja) this.wykresInstancja.destroy();

          this.wykresInstancja = new Chart(this.wykresCanvas.nativeElement, {
            type: 'pie',
            data: {
              labels: [lblAktywni, lblZarchiwizowani],
              datasets: [{
                data: [aktywni, zarchiwizowani],
                backgroundColor: ['#2e8eff', '#030da3'],
                borderWidth: 0,
                hoverOffset: 10
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: 'gray', padding: 20, font: { size: 14 } } } }
            }
          });
        }
      });
    }
  }

  async pobierzRaportPDF() {
    if (this.trwaGenerowaniePDF) return;

    const element = document.getElementById('obszar-raportu');
    if (!element) return;

    this.trwaGenerowaniePDF = true;
    let kopiaRaportu: HTMLElement | null = null;

    try {
      kopiaRaportu = element.cloneNode(true) as HTMLElement;
      kopiaRaportu.removeAttribute('id');
      kopiaRaportu.classList.add('pdf-mode', 'pdf-export-clone');
      kopiaRaportu.setAttribute('aria-hidden', 'true');
      document.body.appendChild(kopiaRaportu);

      const oryginalnyWykres = element.querySelector('canvas');
      const skopiowanyWykres = kopiaRaportu.querySelector('canvas');

      if (oryginalnyWykres && skopiowanyWykres) {
        skopiowanyWykres.width = oryginalnyWykres.width;
        skopiowanyWykres.height = oryginalnyWykres.height;
        skopiowanyWykres.getContext('2d')?.drawImage(oryginalnyWykres, 0, 0);
      }

      await document.fonts.ready;

      const canvas = await html2canvas(kopiaRaportu, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      this.zapiszCanvasJakoPDF(canvas, 'Raport_Biznesowy.pdf');
    } catch {
      this.snackBar.open('Nie udało się utworzyć pliku PDF.', 'Zamknij', { duration: 4000 });
    } finally {
      kopiaRaportu?.remove();
      this.trwaGenerowaniePDF = false;
    }
  }

  private zapiszCanvasJakoPDF(canvas: HTMLCanvasElement, nazwaPliku: string): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margines = 10;
    const szerokoscStrony = pdf.internal.pageSize.getWidth();
    const wysokoscStrony = pdf.internal.pageSize.getHeight();
    const szerokoscObszaru = szerokoscStrony - margines * 2;
    const wysokoscObszaru = wysokoscStrony - margines * 2;
    const wysokoscFragmentu = Math.floor(canvas.width * wysokoscObszaru / szerokoscObszaru);

    let pozycjaY = 0;
    let numerStrony = 0;

    while (pozycjaY < canvas.height) {
      const wysokosc = Math.min(wysokoscFragmentu, canvas.height - pozycjaY);
      const fragment = document.createElement('canvas');
      fragment.width = canvas.width;
      fragment.height = wysokosc;

      const kontekst = fragment.getContext('2d');
      if (!kontekst) break;

      kontekst.fillStyle = '#ffffff';
      kontekst.fillRect(0, 0, fragment.width, fragment.height);
      kontekst.drawImage(
        canvas,
        0,
        pozycjaY,
        canvas.width,
        wysokosc,
        0,
        0,
        canvas.width,
        wysokosc
      );

      if (numerStrony > 0) pdf.addPage();

      const wysokoscWPDF = wysokosc * szerokoscObszaru / canvas.width;
      pdf.addImage(
        fragment.toDataURL('image/png'),
        'PNG',
        margines,
        margines,
        szerokoscObszaru,
        wysokoscWPDF
      );

      pozycjaY += wysokosc;
      numerStrony += 1;
    }

    pdf.save(nazwaPliku);
  }

  dodajPacjenta() {
    if (!this.czyEmailPoprawny(this.nowyPacjent.email)) {
      this.snackBar.open('Błędny format adresu e-mail!', 'Poprawię', { duration: 4000 });
      return;
    }
    if (!this.czyPeselZgodnyZData(this.nowyPacjent.pesel, this.nowyPacjent.data_urodzenia)) {
      this.snackBar.open('Numer PESEL jest fałszywy lub nie zgadza się z podaną datą!', 'Poprawię', { duration: 5000 });
      return; 
    }
    this.http.post('/api/pacjenci', this.nowyPacjent).subscribe({
      next: () => {
        this.snackBar.open('Pacjent dodany!', 'OK', { duration: 3000 });
        this.nowyPacjent = { imie: '', nazwisko: '', pesel: '', data_urodzenia: '', email: '' };
        this.pobierzDaneDoArchiwum();
        if (this.wybranyWykres === 'pacjenci') this.generujWykres();
      },
      error: () => this.snackBar.open('Błąd', 'Zamknij')
    });
  }

  dodajLekarza() {
    if (!this.czyEmailPoprawny(this.nowyLekarz.email)) {
      this.snackBar.open('Błędny format adresu e-mail!', 'Poprawię', { duration: 4000 });
      return;
    }
    this.http.post('/api/lekarze', this.nowyLekarz).subscribe({
      next: () => {
        this.snackBar.open('Lekarz dodany!', 'OK', { duration: 3000 });
        this.nowyLekarz = { imie: '', nazwisko: '', specjalizacja: '', email: '' };
        this.pobierzDaneDoArchiwum(); 
        if (this.wybranyWykres === 'lekarze') this.generujWykres(); 
      },
      error: () => this.snackBar.open('Błąd', 'Zamknij')
    });
  }

  dodajGabinet() {
    this.http.post('/api/gabinety', this.nowyGabinet).subscribe({
      next: () => {
        this.snackBar.open('Gabinet dodany!', 'OK', { duration: 3000 });
        this.nowyGabinet = { numer: '' }; 
      },
      error: (err) => {
        const msg = err.error?.wiadomosc || 'Błąd serwera';
        this.snackBar.open('Błąd: ' + msg, 'Zamknij', { duration: 5000 });
      }
    });
  }

  wgrajPlikCSV(event: any) {
    const plik: File = event.target.files[0];
    if (plik) {
      const formData = new FormData();
      formData.append('plik', plik);
      this.snackBar.open('Wgrywanie pliku...', '', { duration: 2000 });
      this.http.post('http://localhost:4000/api/pacjenci/import', formData).subscribe({
        next: (res: any) => {
          this.snackBar.open(res.wiadomosc, 'OK', { duration: 6000 });
          this.pobierzDaneDoArchiwum();
          if (this.wybranyWykres === 'pacjenci') this.generujWykres();
        },
        error: (err) => {
          const wiadomosc = err.error?.wiadomosc || 'Błąd importu pliku.';
          this.snackBar.open(wiadomosc, 'Zamknij', { duration: 6000 });
        }
      });
      event.target.value = '';
    }
  }

  pobierzDaneDoArchiwum() {
    this.http.get<any>('/api/pacjenci').subscribe((res: any) => {
      if (res && res.sukces) {
        setTimeout(() => { this.wszyscyPacjenci = res.data || []; }, 0);
      }
    });
    this.http.get<any>('/api/lekarze').subscribe((res: any) => {
      if (res && res.sukces) {
        setTimeout(() => { this.wszyscyLekarze = res.data || []; }, 0);
      }
    });
  }

  get filtrowaniPacjenci(): any[] {
    const fraza = this.normalizujTekst(this.szukajPacjenta);
    if (!fraza) return this.wszyscyPacjenci;

    return this.wszyscyPacjenci.filter(pacjent =>
      this.normalizujTekst(
        `${pacjent.imie} ${pacjent.nazwisko} ${pacjent.pesel} ${pacjent.email || ''}`
      ).includes(fraza)
    );
  }

  get filtrowaniLekarze(): any[] {
    const fraza = this.normalizujTekst(this.szukajLekarza);
    if (!fraza) return this.wszyscyLekarze;

    return this.wszyscyLekarze.filter(lekarz =>
      this.normalizujTekst(
        `${lekarz.imie} ${lekarz.nazwisko} ${lekarz.specjalizacja} ${lekarz.email || ''}`
      ).includes(fraza)
    );
  }

  private normalizujTekst(wartosc: unknown): string {
    return String(wartosc ?? '')
      .toLocaleLowerCase('pl-PL')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  zmienStatusPacjenta(id: number, obecnyStatus: number) {
    const nowyStatus = obecnyStatus === 0 ? 1 : 0; 
    this.http.patch(`/api/pacjenci/${id}/archiwizuj`, { czy_aktywny: nowyStatus }).subscribe({
      next: () => {
        this.snackBar.open('Status pacjenta zmieniony!', 'OK', { duration: 3000 });
        this.pobierzDaneDoArchiwum();
        if (this.wybranyWykres === 'pacjenci') this.generujWykres();
      }
    });
  }

  zmienStatusLekarza(id: number, obecnyStatus: number) {
    const nowyStatus = obecnyStatus === 0 ? 1 : 0; 
    this.http.patch(`/api/lekarze/${id}/archiwizuj`, { czy_aktywny: nowyStatus }).subscribe({
      next: () => {
        this.snackBar.open('Status lekarza zmieniony!', 'OK', { duration: 3000 });
        this.pobierzDaneDoArchiwum();
        if (this.wybranyWykres === 'lekarze') this.generujWykres(); 
      }
    });
  }

  pobierzAudyt() {
    this.http.get<any>('/api/audyt').subscribe((res: any) => {
      if (res && res.sukces) {
        setTimeout(() => { this.daneAudytu = res.data || []; }, 0);
      }
    });
  }

  otworzEdycjePacjenta(pacjent: any) {
    const okienko = this.dialog.open(EdycjaPacjentaDialog, {
      width: '500px',
      maxWidth: 'calc(100vw - 24px)',
      data: Object.assign({}, pacjent)
    });
    okienko.afterClosed().subscribe(zmienioneDane => {
      if (zmienioneDane) {
        if (!this.czyEmailPoprawny(zmienioneDane.email)) {
          this.snackBar.open('Błędny format adresu e-mail!', 'Poprawię', { duration: 4000 });
          return;
        }
        let czystaData = zmienioneDane.data_urodzenia;
        if (czystaData && czystaData.includes('T')) czystaData = czystaData.split('T')[0];
        
        if (!this.czyPeselZgodnyZData(zmienioneDane.pesel, czystaData)) {
          this.snackBar.open('PESEL nie zgadza się z datą urodzenia!', 'Poprawię', { duration: 5000 });
          return; 
        }
        this.http.put(`/api/pacjenci/${zmienioneDane.id}`, zmienioneDane).subscribe({
          next: () => {
            this.snackBar.open('Dane pacjenta zaktualizowane!', 'OK', { duration: 3000 });
            this.pobierzDaneDoArchiwum(); 
            this.pobierzAudyt(); 
          },
          error: (err) => {
            const msg = err.error?.wiadomosc || 'Błąd zapisu w bazie.';
            this.snackBar.open('Błąd zapisu: ' + msg, 'Zamknij', { duration: 6000 });
          }
        });
      }
    });
  }

  otworzEdycjeLekarza(lekarz: any) {
    const okienko = this.dialog.open(EdycjaLekarzaDialog, {
      width: '500px',
      maxWidth: 'calc(100vw - 24px)',
      data: lekarz
    });
    okienko.afterClosed().subscribe(zmienioneDane => {
      if (zmienioneDane) {
        this.http.put(`/api/lekarze/${zmienioneDane.id}`, zmienioneDane).subscribe({
          next: () => {
            this.snackBar.open('Dane lekarza zaktualizowane!', 'OK', { duration: 3000 });
            this.pobierzDaneDoArchiwum();
            this.pobierzAudyt();
          },
          error: () => this.snackBar.open('Błąd zapisu.', 'Zamknij')
        });
      }
    });
  }

  czyEmailPoprawny(email: string): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  czyPeselZgodnyZData(pesel: string, dataUrodzenia: string): boolean {
    if (!pesel || !/^\d{11}$/.test(pesel)) return false;
    if (!dataUrodzenia) return false;
    
    const [rokStr, miesiacStr, dzienStr] = dataUrodzenia.split('-');
    const rokNum = parseInt(rokStr);
    let miesiacNum = parseInt(miesiacStr);
    
    if (rokNum >= 1800 && rokNum < 1900) miesiacNum += 80;
    else if (rokNum >= 2000 && rokNum < 2100) miesiacNum += 20;
    else if (rokNum >= 2100 && rokNum < 2200) miesiacNum += 40;
    else if (rokNum >= 2200 && rokNum < 2300) miesiacNum += 60;

    const oczekiwanyRok = rokStr.substring(2, 4);
    const oczekiwanyMiesiac = miesiacNum < 10 ? '0' + miesiacNum : miesiacNum.toString();
    const oczekiwanyDzien = dzienStr;

    const peselRok = pesel.substring(0, 2);
    const peselMiesiac = pesel.substring(2, 4);
    const peselDzien = pesel.substring(4, 6);

    return (peselRok === oczekiwanyRok && peselMiesiac === oczekiwanyMiesiac && peselDzien === oczekiwanyDzien);
  }
}
