import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Supplier } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    DialogModule, ConfirmDialogModule, ToastModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-truck"></i>Fournisseurs</h2>
      <p-button label="Nouveau fournisseur" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="suppliers" [loading]="loading" [paginator]="true" [rows]="10"
               [globalFilterFields]="['code','name','phone','email','contactPerson']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher un fournisseur..." class="table-search" />
            <span class="item-count"><i class="pi pi-truck" style="margin-right:4px"></i>{{ suppliers.length }} fournisseur(s)</span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Nom <p-sortIcon field="name" /></th>
            <th class="hide-mobile">Contact</th>
            <th class="hide-mobile">Téléphone</th>
            <th class="hide-tablet">Email</th>
            <th class="hide-tablet">NIF</th>
            <th style="width:110px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-s>
          <tr>
            <td>
              <strong>{{ s.name }}</strong>
              <div class="sub-info hide-desktop">{{ s.phone }}</div>
            </td>
            <td class="hide-mobile">{{ s.contactPerson || '—' }}</td>
            <td class="hide-mobile">{{ s.phone || '—' }}</td>
            <td class="hide-tablet">{{ s.email || '—' }}</td>
            <td class="hide-tablet">{{ s.nif || '—' }}</td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" (onClick)="edit(s)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(s)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-truck empty-icon"></i>
              <div class="empty-title">Aucun fournisseur trouvé</div>
              <div class="empty-sub">Ajoutez vos fournisseurs pour gérer les achats</div>
              <p-button label="Nouveau fournisseur" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'560px'}" [breakpoints]="{'768px':'95vw'}"
              [header]="editMode ? 'Modifier le fournisseur' : 'Nouveau fournisseur'"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form grid">
        <div class="col-6 field">
          <label>Code <span class="required">*</span></label>
          <input pInputText formControlName="code" class="w-full" placeholder="FOUR-001" />
        </div>
        <div class="col-6 field">
          <label>Personne contact</label>
          <input pInputText formControlName="contactPerson" class="w-full" />
        </div>
        <div class="col-12 field">
          <label>Nom <span class="required">*</span></label>
          <input pInputText formControlName="name" class="w-full" placeholder="Nom du fournisseur" />
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
export class SuppliersComponent implements OnInit {
  suppliers: Supplier[] = [];
  loading = true; showDialog = false; editMode = false; saving = false;
  form: FormGroup;
  private editId?: number;

  constructor(private api: ApiService, private fb: FormBuilder,
              private msg: MessageService, private confirm: ConfirmationService) {
    this.form = this.fb.group({
      code: ['', Validators.required], name: ['', Validators.required],
      address: [''], phone: [''], email: [''], nif: [''], contactPerson: ['']
    });
  }

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.getSuppliers().subscribe({ next: d => { this.suppliers = d; this.loading = false; }, error: () => { this.loading = false; } });
  }
  openNew() { this.editMode = false; this.editId = undefined; this.form.reset(); this.showDialog = true; }
  edit(s: Supplier) { this.editMode = true; this.editId = s.id; this.form.patchValue(s); this.showDialog = true; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const obs = this.editMode ? this.api.updateSupplier(this.editId!, this.form.value) : this.api.createSupplier(this.form.value);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Fournisseur enregistré' }); this.showDialog = false; this.saving = false; this.load(); },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  delete(s: Supplier) {
    this.confirm.confirm({
      message: `Supprimer le fournisseur <strong>${s.name}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteSupplier(s.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
