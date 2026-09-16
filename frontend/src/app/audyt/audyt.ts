import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MaterialModule } from '../material/material-module'; 
import { AuthService } from '../auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-audyt',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule],
  templateUrl: './audyt.html',
  styleUrls: ['./audyt.css']
})
export class AudytComponent implements OnInit {
  http = inject(HttpClient);

  displayedColumns: string[] = ['data', 'uzytkownik', 'operacja', 'szczegoly'];
  daneAudytu: any[] = [];
  protected auth = inject(AuthService);

  ngOnInit() {
    this.pobierzLogi();
  }

  pobierzLogi() {
    this.http.get<any>('/api/audyt').subscribe({
      next: (res) => {
        if (res.sukces) {
          this.daneAudytu = res.data;
        }
      },
      error: (err) => console.error('Błąd pobierania audytu:', err)
    });
  }
}