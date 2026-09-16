import { Component, Injectable, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePl from '@angular/common/locales/pl';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../material/material-module';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import {
  CalendarDateFormatter,
  CalendarEvent,
  CalendarModule,
  CalendarNativeDateFormatter
} from 'angular-calendar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';

registerLocaleData(localePl);

@Injectable()
export class KrotkiFormatDni extends CalendarNativeDateFormatter {
 override monthViewColumnHeader({ date, locale }: any): string {
    const dniPl = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
    const dniEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return locale?.startsWith('en') ? dniEn[date.getDay()] : dniPl[date.getDay()];
  }
}

@Component({
  selector: 'app-kalendarz',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, CalendarModule, TranslateModule],
  templateUrl: './kalendarz.html',
  styleUrls: ['./kalendarz.css'],
  providers: [
    { provide: CalendarDateFormatter, useClass: KrotkiFormatDni }
  ]
})
export class KalendarzComponent implements OnInit, OnDestroy {
  viewDate: Date = new Date();
  wybranaData: Date = new Date();
  events: CalendarEvent[] = [];
  refresh = new Subject<void>();
    get wizytyWybranegoDnia(): CalendarEvent[] {
    return this.events
      .filter(event =>
        event.start.getFullYear() === this.wybranaData.getFullYear() &&
        event.start.getMonth() === this.wybranaData.getMonth() &&
        event.start.getDate() === this.wybranaData.getDate()
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  lekarze: any[] = [];
  wybranyLekarzId: number | null = null;

  szukanyNumer: string = '';
  znalezionaWizyta: any = null;

  private http = inject(HttpClient);
  public auth = inject(AuthService);
  private router = inject(Router);
  public translate = inject(TranslateService);
  private languageSubscription?: Subscription;


  get calendarLocale(): string {
    return this.translate.currentLang === 'en' ? 'en-US' : 'pl-PL';
  }
  
  ngOnInit() {
    this.languageSubscription = this.translate.onLangChange.subscribe(() => {
      this.odswiezTytulyWizyt();
      this.refresh.next();
    });

    const uzytkownik = this.auth.user();

    if (uzytkownik && uzytkownik.roles.includes(1)) {
      this.wybranyLekarzId = uzytkownik.id;
      this.pobierzWizytyLekarza();
    } else {
      this.pobierzLekarzy();
    }
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
    this.refresh.complete();
  }

  private utworzTytulWizyty(dataWizyty: Date, id: number | string): string {
    const godzina = dataWizyty.toLocaleTimeString(this.calendarLocale, {
      hour: '2-digit',
      minute: '2-digit'
    });
    const nazwaWizyty = this.translate.instant('CALENDAR.VISIT');

    return `${godzina} - ${nazwaWizyty} #${id}`;
  }

  private odswiezTytulyWizyt(): void {
    this.events = this.events.map(event => {
      if (event.meta?.id == null) return event;

      return {
        ...event,
        title: this.utworzTytulWizyty(event.start, event.meta.id)
      };
    });
  }

  pobierzLekarzy() {
    this.http.get<any>('/api/lekarze').subscribe(res => {
      if (res.sukces) {
        this.lekarze = res.data;
      }
    });
  }

  pobierzWizytyLekarza() {
    if (!this.wybranyLekarzId) return;

    this.http.get<any>(`/api/wizyty?lekarz_id=${this.wybranyLekarzId}`).subscribe(res => {
      if (res.sukces) {
        this.events = res.data
          .filter((w: any) => w.status.toLowerCase() !== 'anulowana')
          .map((w: any) => {
            const dataWizyty = new Date(w.data);

            return {
              start: dataWizyty,
              title: this.utworzTytulWizyty(dataWizyty, w.id),
              color: { primary: '#1976d2', secondary: '#e3f2fd' },
              meta: w
            };
          });

        this.refresh.next();
      }
    });
  }

  zmienMiesiac(ile: number) {
    const nowaData = new Date(this.viewDate);
    nowaData.setMonth(nowaData.getMonth() + ile);

    this.viewDate = nowaData;
    this.wybranaData = new Date(nowaData.getFullYear(), nowaData.getMonth(), 1);
    this.znalezionaWizyta = null;
    this.refresh.next();
  }

  wybierzDzien(dzien: any) {
    if (!dzien?.date) return;

    const data = new Date(dzien.date);
    this.wybranaData = data;
    this.znalezionaWizyta = null;

    if (
      data.getMonth() !== this.viewDate.getMonth() ||
      data.getFullYear() !== this.viewDate.getFullYear()
    ) {
      this.viewDate = new Date(data);
    }

    this.refresh.next();
  }

  oznaczWybranyDzien(widok: any) {
    widok.body.forEach((dzien: any) => {
      const klasy = (dzien.cssClass || '')
        .split(' ')
        .filter((klasa: string) => klasa && klasa !== 'selected-calendar-day');

      if (this.czyTenSamDzien(dzien.date, this.wybranaData)) {
        klasy.push('selected-calendar-day');
      }

      dzien.cssClass = klasy.join(' ');
    });
  }

  szukajWizyty() {
    if (!this.szukanyNumer) {
      this.znalezionaWizyta = null;
      return;
    }

    const znaleziona = this.events.find(e => e.meta && e.meta.id.toString() === this.szukanyNumer.trim());

    if (znaleziona) {
      this.viewDate = new Date(znaleziona.start);
      this.wybranaData = new Date(znaleziona.start);
      this.znalezionaWizyta = znaleziona;
      this.szukanyNumer = '';
      this.refresh.next();
    } else {
      this.znalezionaWizyta = null;
      const bladStart = this.translate.instant('CALENDAR.ALERT_NOT_FOUND');
      const bladKoniec = this.translate.instant('CALENDAR.ALERT_NOT_FOUND_END');
      alert(`${bladStart}${this.szukanyNumer}${bladKoniec}`);
    }
  }

  wyczyscWyszukiwanie() {
    this.znalezionaWizyta = null;
  }
  
  wydarzenieKlikniete(event: CalendarEvent) {
    if (this.auth.user()) {
      const czystaData = this.formatujDate(event.start);
      this.router.navigate(['/lista-wizyt'], {
        queryParams: { data: czystaData, lekarz_id: this.wybranyLekarzId }
      });
    }
  }

  private czyTenSamDzien(pierwsza: Date, druga: Date): boolean {
    return pierwsza.getFullYear() === druga.getFullYear()
      && pierwsza.getMonth() === druga.getMonth()
      && pierwsza.getDate() === druga.getDate();
  }

  private formatujDate(data: Date): string {
    const rok = data.getFullYear();
    const miesiac = String(data.getMonth() + 1).padStart(2, '0');
    const dzien = String(data.getDate()).padStart(2, '0');

    return `${rok}-${miesiac}-${dzien}`;
  }
}
