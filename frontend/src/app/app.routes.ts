import { Routes } from '@angular/router';
import { AuthService } from './auth.service';
import { PacjenciComponent } from './pacjenci/pacjenci';
import { LekarzeComponent } from './lekarze/lekarze';
import { WizytyComponent } from './wizyty/wizyty';
import { ListaWizytComponent } from './lista-wizyt/lista-wizyt';
import { AudytComponent } from './audyt/audyt';
import { KalendarzComponent } from './kalendarz/kalendarz';
import { ChatComponent } from './chat/chat';
import { PanelAdminaComponent } from './panel-admina/panel-admina';
import { PustaStrona } from './pustastrona/pustastrona';

export interface RouteData {
  url: string;
  label: string;
  icon: string;
  roles: number[];
}

export const routes: Routes = [
  { path: '', component: PustaStrona, data: { url: '/', label: 'MENU.HOME', icon: 'home_health',roles: [] } },
  { path: 'kalendarz', component: KalendarzComponent, data: { url: '/kalendarz' , label: 'MENU.CALENDAR', icon: 'calendar_month', roles: [] } },
  { path: 'lista-wizyt', component: ListaWizytComponent, data: { url: '/lista-wizyt', label: 'MENU.APPOINTMENTS', icon: 'list_alt', roles: [0, 1, 2] } },
  { path: 'wizyty', component: WizytyComponent, data: { url: '/wizyty', label: 'MENU.REGISTER', icon: 'event_note', roles: [0, 2] } },
  { path: 'pacjenci', component: PacjenciComponent, data: { url: '/pacjenci', label: 'MENU.PATIENTS', icon: 'article_person',  roles: [0,1,2] } },
  { path: 'lekarze', component: LekarzeComponent, data: { url: '/lekarze', label: 'MENU.DOCTORS', icon: 'medical_services', roles:[] } },
  { path: 'chat', component: ChatComponent,data: { url: '/chat', label: 'MENU.CHAT', icon: 'chat', roles: [0, 1, 2] }},
  { path: 'audyt', component: AudytComponent },
  { path: 'admin', component: PanelAdminaComponent, data: { url: '/admin', label: 'MENU.ADMIN', icon: 'settings', roles: [0] } }
];