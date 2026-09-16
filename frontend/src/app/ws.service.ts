import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WsService {
  public messages: any[] = [];
  public czatOtwarty: boolean = false;

  private ws: WebSocket | null = null;
  private zone = inject(NgZone);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private zainicjalizowany = false;

  get powiadomienia() {
    const user = this.auth.user();
    if (!user) return [];

    const lastReadStr = localStorage.getItem(`chat_last_read_${user.username}`);
    const lastReadTime = lastReadStr ? parseInt(lastReadStr, 10) : 0;

    return this.messages.filter(msg => {
      const doMnie = msg.to === 'Wszyscy' || msg.to === user.username;
      const nieOdeMnie = msg.author !== user.username;
      const msgTime = msg.timestamp || 0;

      return doMnie && nieOdeMnie && msgTime > lastReadTime;
    }).map(msg => ({
      text: `Wiadomość od: ${msg.author}`,
      czas: msg.time
    })).reverse(); 
  }

  get nieprzeczytane() {
    return this.powiadomienia.length;
  }

  public podlacz() {
    if (this.zainicjalizowany) return;
    const user = this.auth.user();
    if (!user) return;

    this.zainicjalizowany = true;

    this.http.get<any[]>('/api/chat/historia').subscribe({
      next: (historia) => {
       const historiaZeZnacznikiem = historia.map(m => {
  const czasUTC = m.time
    ? new Date(`${m.time.replace(' ', 'T')}Z`).getTime()
    : Date.now();

  return {
    ...m,
    time: czasUTC,
    timestamp: czasUTC
  };
});
        this.messages.splice(0, this.messages.length, ...historiaZeZnacznikiem);
      }
    });

    const wsUrl = 'ws://localhost:4000'; 
    this.ws = new WebSocket(wsUrl); 
    this.ws.onclose = () => {
  this.zainicjalizowany = false;
  this.ws = null;
};

this.ws.onerror = (error) => {
  console.error('Błąd połączenia WebSocket:', error);
};

    this.ws.onmessage = (event) => {
      this.zone.run(() => {
        const msg = JSON.parse(event.data);
        if (!msg.time) {
            const d = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            msg.time = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
        msg.timestamp = Date.now(); 

        this.messages.push(msg);

        if (this.czatOtwarty) {
            this.oznaczJakoPrzeczytane();
        }
      });
    };
  }

  public send(msgData: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      msgData.author = this.auth.user()?.username;
      this.ws.send(JSON.stringify(msgData));
    }
  }

  public oznaczJakoPrzeczytane() {
    const user = this.auth.user();
    if (user) {
      localStorage.setItem(`chat_last_read_${user.username}`, Date.now().toString());
    }
  }

  public rozlacz() {
    if (this.ws) this.ws.close();
    this.zainicjalizowany = false;
    this.messages.splice(0, this.messages.length);
  }
}