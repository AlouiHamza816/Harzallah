import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Customer } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    DialogModule, ConfirmDialogModule, ToastModule, DropdownModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-users"></i>Clients</h2>
      <p-button label="Nouveau client" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="customers" [loading]="loading" [paginator]="true" [rows]="10"
               [globalFilterFields]="['code','name','phone','email']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher un client..." class="table-search" />
            <span class="item-count"><i class="pi pi-users" style="margin-right:4px"></i>{{ customers.length }} client(s)</span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Nom <p-sortIcon field="name" /></th>
            <th class="hide-mobile">Type</th>
            <th class="hide-mobile">Téléphone</th>
            <th class="hide-tablet">Email</th>
            <th class="hide-tablet">NIF</th>
            <th style="width:110px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <strong>{{ c.name }}</strong>
              <div class="sub-info hide-desktop">{{ c.phone }}</div>
            </td>
            <td class="hide-mobile">
              <span [class]="'status-badge ' + (c.type==='COMPANY' ? 'status-sent' : 'status-draft')">
                {{ c.type === 'COMPANY' ? 'Entreprise' : 'Particulier' }}
              </span>
            </td>
            <td class="hide-mobile">{{ c.phone || '—' }}</td>
            <td class="hide-tablet">{{ c.email || '—' }}</td>
            <td class="hide-tablet">{{ c.nif || '—' }}</td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" (onClick)="edit(c)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(c)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-users empty-icon"></i>
              <div class="empty-title">Aucun client trouvé</div>
              <div class="empty-sub">Ajoutez votre premier client pour commencer à facturer</div>
              <p-button label="Nouveau client" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'560px'}" [breakpoints]="{'768px':'95vw'}"
              [header]="editMode ? 'Modifier le client' : 'Nouveau client'"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form grid">
        <div class="col-6 field">
          <label>Code <span class="required">*</span></label>
          <input pInputText formControlName="code" class="w-full" placeholder="CLI-001" />
        </div>
        <div class="col-6 field">
          <label>Type</label>
          <p-dropdown formControlName="type" [options]="typeOptions"
                      optionLabel="label" optionValue="value" styleClass="w-full" />
        </div>
        <div class="col-12 field">
          <label>Nom <span class="required">*</span></label>
          <input pInputText formControlName="name" class="w-full" placeholder="Nom du client" />
        </div>
        <div class="col-6 field">
          <label>Téléphone</label>
          <input pInputText formControlName="phone" class="w-full" placeholder="+237 6XX XXX XXX" />
        </div>
        <div class="col-6 field">
          <label>Email</label>
          <input pInputText formControlName="email" type="email" class="w-full" />
        </div>
        <div class="col-6 field">
          <label>NIF</label>
          <input pInputText formControlName="nif" class="w-full" />
        </div>
        <div class="col-12 field">
          <label>Adresse</label>
          <input pInputText formControlName="address" class="w-full" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" icon="pi pi-times" [text]="true" severity="secondary"
                  (onClick)="showDialog=false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="save()" [loading]="saving" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .text-muted { color: #7f8c8d; font-size: 0.88rem; }
    .text-center { text-align: center; }
    .required { color: #e74c3c; }
    .dialog-form { padding: 0.25rem 0; }
    .sub-info { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    @media (min-width: 601px) { .hide-desktop { display: none; } }
  `]
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  loading = true; showDialog = false; editMode = false; saving = false;
  form: FormGroup;
  typeOptions = [{ label: 'Entreprise', value: 'COMPANY' }, { label: 'Particulier', value: 'INDIVIDUAL' }];
  private editId?: number;

  constructor(private api: ApiService, private fb: FormBuilder,
              private msg: MessageService, private confirm: ConfirmationService) {
    this.form = this.fb.group({
      code: ['', Validators.required], name: ['', Validators.required],
      address: [''], phone: [''], email: [''], nif: [''], type: ['COMPANY']
    });
  }

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.getCustomers().subscribe({ next: d => { this.customers = d; this.loading = false; }, error: () => { this.loading = false; } });
  }
  openNew() { this.editMode = false; this.editId = undefined; this.form.reset({ type: 'COMPANY' }); this.showDialog = true; }
  edit(c: Customer) { this.editMode = true; this.editId = c.id; this.form.patchValue(c); this.showDialog = true; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const obs = this.editMode ? this.api.updateCustomer(this.editId!, this.form.value) : this.api.createCustomer(this.form.value);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Client enregistré' }); this.showDialog = false; this.saving = false; this.load(); },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  delete(c: Customer) {
    this.confirm.confirm({
      message: `Supprimer le client <strong>${c.name}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteCustomer(c.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
