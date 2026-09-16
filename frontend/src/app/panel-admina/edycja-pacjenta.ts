import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-edycja-pacjenta-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MatDialogModule, TranslateModule],
  template: `
    <h2 mat-dialog-title style="color: #2e8eff;">{{ 'ADMIN_PANEL.EDIT_PATIENT_TITLE' | translate }}</h2>
    <mat-dialog-content>
      <div class="edit-dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ADMIN_PANEL.LBL_NAME' | translate }}</mat-label>
          <input matInput [(ngModel)]="dane.imie">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'ADMIN_PANEL.LBL_SURNAME' | translate }}</mat-label>
          <input matInput [(ngModel)]="dane.nazwisko">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'ADMIN_PANEL.LBL_PESEL' | translate }}</mat-label>
          <input matInput [(ngModel)]="dane.pesel" maxlength="11">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'ADMIN_PANEL.LBL_DOB' | translate }}</mat-label>
          <input matInput type="date" [(ngModel)]="dane.data_urodzenia">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'ADMIN_PANEL.LBL_EMAIL' | translate }}</mat-label>
          <input matInput [(ngModel)]="dane.email" type="email">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="edit-dialog-actions">
      <button mat-button (click)="anuluj()">{{ 'ADMIN_PANEL.BTN_CANCEL' | translate }}</button>

      <button mat-flat-button (click)="zapisz()" style="background-color: #2e8eff; color: white; border-radius: 8px; padding: 0 20px; font-weight: 600; box-shadow: 0 4px 15px rgba(46, 142, 255, 0.4);">
        <mat-icon style="margin-right: 5px;">save</mat-icon> {{ 'ADMIN_PANEL.BTN_SAVE' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-dialog-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 15px;
    }

    .edit-dialog-actions {
      padding: 0 20px 20px;
    }

    @media (max-width: 600px) {
      h2[mat-dialog-title] {
        padding: 18px 16px 8px;
        font-size: 20px;
      }

      mat-dialog-content {
        padding: 0 16px;
      }

      .edit-dialog-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 8px 16px 16px;
      }

      .edit-dialog-actions button {
        width: 100%;
        min-width: 0;
        padding: 0 8px !important;
      }
    }
  `]
})
export class EdycjaPacjentaDialog {
  dane: any;
  constructor(
    public dialogRef: MatDialogRef<EdycjaPacjentaDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.dane = { ...data };
    if (this.dane.data_urodzenia && this.dane.data_urodzenia.includes('T')) {
      this.dane.data_urodzenia = this.dane.data_urodzenia.split('T')[0];
    }
  }
  anuluj(): void { this.dialogRef.close(); }
  zapisz(): void { this.dialogRef.close(this.dane); }
}
