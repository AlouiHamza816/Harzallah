import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule,
    InputNumberModule, DropdownModule, ToastModule, InputTextareaModule],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <h2><i class="pi pi-cog"></i>Paramètres de l'entreprise</h2>
      <p-button label="Enregistrer" icon="pi pi-save" (onClick)="save()" [loading]="saving" />
    </div>

    <div class="settings-card">
      <form [formGroup]="form" class="settings-grid">

        <div class="settings-section">
          <h3 class="section-title"><i class="pi pi-building mr-2"></i>Informations générales</h3>
          <div class="field">
            <label>Nom de l'entreprise <span class="required">*</span></label>
            <input pInputText formControlName="companyName" class="w-full"
                   placeholder="NEW-BAT HARZALLAH" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Matricule Fiscal (MF)</label>
              <input pInputText formControlName="nif" class="w-full" placeholder="1234567 A/A/M/000" />
            </div>
            <div class="field">
              <label>Devise</label>
              <p-dropdown formControlName="currency" [options]="currencyOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Téléphone / GSM</label>
              <input pInputText formControlName="phone" class="w-full" placeholder="97 000 000" />
            </div>
            <div class="field">
              <label>Email</label>
              <input pInputText formControlName="email" type="email" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>RIB (compte bancaire)</label>
            <input pInputText formControlName="rib" class="w-full" placeholder="BNA : 03-019-149-0115-004280-22" />
          </div>
          <div class="field">
            <label>Adresse</label>
            <textarea pTextarea formControlName="address" rows="3" class="w-full"
                      placeholder="Rue, quartier, ville..."></textarea>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title"><i class="pi pi-percentage mr-2"></i>Fiscalité & Logo</h3>
          <div class="field">
            <label>Taux TVA par défaut (%)</label>
            <p-inputNumber formControlName="taxRate" [min]="0" [max]="100"
                           [minFractionDigits]="2" styleClass="w-full" suffix=" %" />
          </div>
          <div class="field">
            <label>Logo (URL ou Base64)</label>
            <textarea pTextarea formControlName="logo" rows="3" class="w-full"
                      placeholder="https://monentreprise.com/logo.png"></textarea>
          </div>
          <div *ngIf="form.get('logo')?.value" class="logo-preview">
            <p class="preview-label">Aperçu :</p>
            <img [src]="form.get('logo')?.value" alt="Logo entreprise" class="logo-img" />
          </div>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .settings-card {
      background: white;
      border-radius: 10px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    .settings-section { }
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 1.25rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #f0f0f0;
      display: flex;
      align-items: center;
    }
    .field {
      margin-bottom: 1.1rem;
      label { display: block; margin-bottom: 0.35rem; font-weight: 500; color: #444; font-size: 0.88rem; }
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .required { color: #e74c3c; }
    .logo-preview { margin-top: 0.75rem; }
    .preview-label { font-size: 0.82rem; color: #7f8c8d; margin-bottom: 0.4rem; }
    .logo-img { max-height: 80px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 4px; display: block; }

    @media (max-width: 900px) {
      .settings-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .settings-card { padding: 1.25rem; }
      .field-row { grid-template-columns: 1fr; gap: 0; }
    }
  `]
})
export class SettingsComponent implements OnInit {
  form: FormGroup;
  saving = false;
  currencyOptions = [
    { label: 'Dinar Tunisien (TND)', value: 'TND' },
    { label: 'FCFA (XAF)', value: 'XAF' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'Dollar (USD)', value: 'USD' }
  ];

  constructor(private api: ApiService, private fb: FormBuilder, private msg: MessageService) {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      address: [''], phone: [''], email: [''],
      nif: [''], rib: [''], logo: [''], currency: ['TND'], taxRate: [0]
    });
  }

  ngOnInit() { this.api.getCompanySettings().subscribe(s => { if (s) this.form.patchValue(s); }); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.api.saveCompanySettings(this.form.value).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Succès', detail: 'Paramètres enregistrés' }); this.saving = false; },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }
}
