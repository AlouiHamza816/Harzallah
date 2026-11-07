import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Product, ProductBundle } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-bundles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    InputNumberModule, DialogModule, ConfirmDialogModule, ToastModule, DropdownModule,
    InputTextareaModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-th-large"></i>Paquets de produits</h2>
      <p-button label="Nouveau paquet" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="bundles" [loading]="loading" [paginator]="true" [rows]="10"
               [globalFilterFields]="['reference','name']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher un paquet..." class="table-search" />
            <span class="item-count"><i class="pi pi-th-large" style="margin-right:4px"></i>{{ bundles.length }} paquet(s)</span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="reference">Référence <p-sortIcon field="reference" /></th>
            <th pSortableColumn="name">Nom <p-sortIcon field="name" /></th>
            <th class="hide-mobile">Produits inclus</th>
            <th class="hide-mobile" pSortableColumn="sellingPrice">Prix vente</th>
            <th>Statut</th>
            <th style="width:110px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-b>
          <tr>
            <td><code>{{ b.reference }}</code></td>
            <td>
              <strong>{{ b.name }}</strong>
              <div class="sub-info hide-desktop">{{ b.sellingPrice | number:'1.0-0' }} DT</div>
            </td>
            <td class="hide-mobile">
              <span *ngFor="let item of b.items; let last=last" class="bundle-item-chip">
                {{ item.quantity }}× {{ item.productName }}{{ last ? '' : ', ' }}
              </span>
            </td>
            <td class="hide-mobile">{{ b.sellingPrice | number:'1.0-0' }} DT</td>
            <td>
              <span [class]="'status-badge ' + (b.active ? 'status-paid' : 'status-cancelled')">
                {{ b.active ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" (onClick)="edit(b)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(b)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-th-large empty-icon"></i>
              <div class="empty-title">Aucun paquet trouvé</div>
              <div class="empty-sub">Créez des paquets pour regrouper plusieurs produits</div>
              <p-button label="Nouveau paquet" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'680px'}" [breakpoints]="{'768px':'95vw'}"
              [header]="editMode ? 'Modifier le paquet' : 'Nouveau paquet'"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form grid">
        <div class="col-6 field">
          <label>Référence <span class="required">*</span></label>
          <input pInputText formControlName="reference" class="w-full" placeholder="PKG-001" />
        </div>
        <div class="col-6 field">
          <label>Nom <span class="required">*</span></label>
          <input pInputText formControlName="name" class="w-full" />
        </div>
        <div class="col-12 field">
          <label>Description</label>
          <textarea pTextarea formControlName="description" rows="2" class="w-full"
                    placeholder="Ex: Pack eau 6 bouteilles de 1.5L..."></textarea>
        </div>
        <div class="col-6 field">
          <label>Prix de vente (TND)</label>
          <p-inputNumber formControlName="sellingPrice" [min]="0" [minFractionDigits]="3"
                         styleClass="w-full" suffix=" DT" />
        </div>

        <div class="col-12">
          <h4 class="items-title">
            <i class="pi pi-list mr-1"></i>Produits du paquet
          </h4>
          <div class="items-wrapper">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th class="col-qty">Quantité</th>
                  <th class="col-unit">Unité</th>
                  <th class="col-del"></th>
                </tr>
              </thead>
              <tbody formArrayName="items">
                <tr *ngFor="let item of items.controls; let i = index" [formGroupName]="i">
                  <td>
                    <p-dropdown formControlName="productId" [options]="products"
                                optionLabel="name" optionValue="id"
                                placeholder="Choisir un produit" [filter]="true" filterBy="name"
                                styleClass="w-full" appendTo="body"
                                (onChange)="onProductChange(i, $event)" />
                  </td>
                  <td class="col-qty">
                    <p-inputNumber formControlName="quantity" [min]="1" styleClass="w-full" />
                  </td>
                  <td class="col-unit">
                    <span class="unit-label">{{ getUnit(i) }}</span>
                  </td>
                  <td class="col-del">
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true"
                              severity="danger" (onClick)="items.removeAt(i)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p-button label="Ajouter un produit" icon="pi pi-plus" [text]="true"
                    (onClick)="addItem()" styleClass="mt-2" />
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
    .text-muted  { color: #7f8c8d; font-size: 0.88rem; }
    .text-center { text-align: center; }
    .required    { color: #e74c3c; }
    .dialog-form { padding: 0.25rem 0; }
    .sub-info    { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    .bundle-item-chip { font-size: 0.82rem; color: #555; }

    .items-title { font-size: 0.95rem; font-weight: 600; color: #2c3e50;
                   margin: 0.25rem 0 0.6rem; display: flex; align-items: center; }
    .items-wrapper { overflow-x: auto; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 380px; }
    .items-table thead th { background: #f8f9fa; padding: 0.4rem 0.5rem;
                            text-align: left; border-bottom: 2px solid #dee2e6; white-space: nowrap; }
    .items-table tbody td { padding: 0.25rem 0.5rem; vertical-align: middle;
                            border-bottom: 1px solid #f0f0f0; }
    .col-qty  { width: 100px; }
    .col-unit { width: 70px; }
    .col-del  { width: 44px; }
    .unit-label { font-size: 0.82rem; color: #7f8c8d; }

    @media (min-width: 601px) { .hide-desktop { display: none; } }
    @media (max-width: 560px) {
      .col-6 { width: 100%; flex: 0 0 100%; max-width: 100%; }
    }
  `]
})
export class BundlesComponent implements OnInit {
  bundles: ProductBundle[] = [];
  products: Product[] = [];
  loading = true; showDialog = false; editMode = false; saving = false;
  form: FormGroup;
  private editId?: number;

  constructor(private api: ApiService, private fb: FormBuilder,
              private msg: MessageService, private confirm: ConfirmationService) {
    this.form = this.fb.group({
      reference:    ['', Validators.required],
      name:         ['', Validators.required],
      description:  [''],
      sellingPrice: [0],
      active:       [true],
      items:        this.fb.array([])
    });
  }

  ngOnInit() {
    this.load();
    this.api.getProducts().subscribe(p => this.products = p.filter(pr => pr.active));
  }

  load() {
    this.loading = true;
    this.api.getBundles().subscribe({
      next: d => { this.bundles = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get items() { return this.form.get('items') as FormArray; }

  addItem() {
    this.items.push(this.fb.group({ productId: [null], quantity: [1], unit: [''] }));
  }

  onProductChange(i: number, e: any) {
    const p = this.products.find(pr => pr.id === e.value);
    if (p) this.items.at(i).patchValue({ unit: p.unit });
  }

  getUnit(i: number): string { return this.items.at(i).value.unit || ''; }

  openNew() {
    this.editMode = false; this.editId = undefined;
    this.form.reset({ sellingPrice: 0, active: true });
    while (this.items.length) this.items.removeAt(0);
    this.addItem();
    this.showDialog = true;
  }

  edit(b: ProductBundle) {
    this.editMode = true; this.editId = b.id;
    this.form.patchValue({ reference: b.reference, name: b.name, description: b.description,
                           sellingPrice: b.sellingPrice, active: b.active });
    while (this.items.length) this.items.removeAt(0);
    b.items.forEach(item => {
      const prod = this.products.find(p => p.id === item.productId);
      this.items.push(this.fb.group({
        productId: [item.productId], quantity: [item.quantity], unit: [prod?.unit || '']
      }));
    });
    this.showDialog = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;
    const payload = { ...val, items: val.items.filter((i: any) => i.productId) };
    const obs = this.editMode
      ? this.api.updateBundle(this.editId!, payload)
      : this.api.createBundle(payload);
    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Succès', detail: 'Paquet enregistré' });
        this.showDialog = false; this.saving = false; this.load();
      },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  delete(b: ProductBundle) {
    this.confirm.confirm({
      message: `Supprimer le paquet <strong>${b.name}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteBundle(b.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
