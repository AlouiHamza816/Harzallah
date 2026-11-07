import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { Product, ProductBundle, StockMovement } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    InputNumberModule, DialogModule, DropdownModule, ToastModule, InputTextareaModule],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <h2><i class="pi pi-arrow-right-arrow-left"></i>Mouvements de stock</h2>
      <p-button label="Nouveau mouvement" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="movements" [loading]="loading" [paginator]="true" [rows]="15"
               [globalFilterFields]="['productName','reference','type']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher produit, référence..." class="table-search" />
            <span class="item-count"><i class="pi pi-arrow-right-arrow-left" style="margin-right:4px"></i>{{ movements.length }} mouvement(s)</span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="date">Date <p-sortIcon field="date" /></th>
            <th>Type</th>
            <th pSortableColumn="productName">Produit <p-sortIcon field="productName" /></th>
            <th>Quantité</th>
            <th class="hide-mobile">Référence</th>
            <th class="hide-tablet">Notes</th>
            <th style="width:80px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-m>
          <tr>
            <td>{{ m.date | date:'dd/MM/yy HH:mm' }}</td>
            <td>
              <span [class]="'status-badge ' + typeClass(m.type)">{{ typeLabel(m.type) }}</span>
            </td>
            <td>
              <strong>{{ m.productName }}</strong>
              <div class="sub-info hide-desktop">{{ m.reference }}</div>
            </td>
            <td>
              <span [class]="m.type === 'SORTIE' ? 'qty-out' : 'qty-in'">
                {{ m.type === 'SORTIE' ? '-' : '+' }}{{ m.quantity }}
              </span>
            </td>
            <td class="hide-mobile">{{ m.reference || '—' }}</td>
            <td class="hide-tablet">{{ m.notes || '—' }}</td>
            <td>
              <p-button *ngIf="m.type === 'SORTIE'" icon="pi pi-print" [rounded]="true" [text]="true"
                        severity="secondary" pTooltip="Bon de Sortie PDF" (onClick)="printMovement(m)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="empty-state">
              <i class="pi pi-arrow-right-arrow-left empty-icon"></i>
              <div class="empty-title">Aucun mouvement de stock</div>
              <div class="empty-sub">Enregistrez une entrée ou sortie pour commencer</div>
              <p-button label="Nouveau mouvement" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'500px'}" [breakpoints]="{'768px':'95vw'}"
              header="Nouveau mouvement de stock"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form grid">
        <div class="col-12 field">
          <label>Type <span class="required">*</span></label>
          <p-dropdown formControlName="type" [options]="typeOptions"
                      optionLabel="label" optionValue="value" styleClass="w-full" />
        </div>
        <div class="col-12 field">
          <label>Type d'article <span class="required">*</span></label>
          <div class="type-switch mb-2">
            <button type="button" [class.active]="form.get('_itemType')?.value !== 'BUNDLE'"
                    (click)="setItemType('PRODUCT')">Produit</button>
            <button type="button" [class.active]="form.get('_itemType')?.value === 'BUNDLE'"
                    (click)="setItemType('BUNDLE')">Paquet</button>
          </div>
          <p-dropdown *ngIf="form.get('_itemType')?.value !== 'BUNDLE'"
                      formControlName="productId" [options]="products"
                      optionLabel="name" optionValue="id"
                      placeholder="-- Sélectionner un produit --" [filter]="true" filterBy="name"
                      styleClass="w-full" />
          <p-dropdown *ngIf="form.get('_itemType')?.value === 'BUNDLE'"
                      formControlName="bundleId" [options]="bundles"
                      optionLabel="name" optionValue="id"
                      placeholder="-- Sélectionner un paquet --" [filter]="true" filterBy="name"
                      styleClass="w-full" />
        </div>
        <div class="col-6 field">
          <label>Quantité <span class="required">*</span></label>
          <p-inputNumber formControlName="quantity" [min]="1" styleClass="w-full" />
        </div>
        <div class="col-6 field">
          <label>Référence</label>
          <input pInputText formControlName="reference" class="w-full" />
        </div>
        <div class="col-12 field">
          <label>Notes</label>
          <textarea pTextarea formControlName="notes" rows="2" class="w-full"></textarea>
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
    .type-switch { display: flex; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .type-switch button { flex: 1; border: none; background: #f8f9fa; padding: 5px 8px; font-size: 0.82rem; cursor: pointer; color: #555; }
    .type-switch button.active { background: #2c3e50; color: white; }
    .sub-info { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    .qty-in  { color: #27ae60; font-weight: 700; }
    .qty-out { color: #e74c3c; font-weight: 700; }
    @media (min-width: 601px) { .hide-desktop { display: none; } }
    @media (max-width: 480px) {
      .col-6 { width: 100%; flex: 0 0 100%; max-width: 100%; }
    }
  `]
})
export class StockMovementsComponent implements OnInit {
  movements: StockMovement[] = [];
  products: Product[] = [];
  bundles: ProductBundle[] = [];
  loading = true; showDialog = false; saving = false;
  form: FormGroup;
  typeOptions = [
    { label: 'Entrée',      value: 'ENTREE' },
    { label: 'Sortie',      value: 'SORTIE' },
    { label: 'Ajustement',  value: 'AJUSTEMENT' }
  ];

  constructor(private api: ApiService, private fb: FormBuilder, private msg: MessageService,
              private printer: ThermalPrintService) {
    this.form = this.fb.group({
      _itemType: ['PRODUCT'],
      type:      ['ENTREE', Validators.required],
      productId: [null],
      bundleId:  [null],
      quantity:  [1, Validators.required],
      reference: [''],
      notes:     ['']
    });
  }

  ngOnInit() {
    this.load();
    this.api.getProducts().subscribe(p => this.products = p);
    this.api.getBundles().subscribe(b => this.bundles = b.filter((x: ProductBundle) => x.active));
  }

  setItemType(type: 'PRODUCT' | 'BUNDLE') {
    this.form.patchValue({ _itemType: type, productId: null, bundleId: null });
  }

  load() {
    this.loading = true;
    this.api.getStockMovements().subscribe({
      next: d => { this.movements = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openNew() {
    this.form.reset({ _itemType: 'PRODUCT', type: 'ENTREE', quantity: 1 });
    this.showDialog = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;

    if (val._itemType === 'BUNDLE') {
      const bundle = this.bundles.find(b => b.id === val.bundleId);
      if (!bundle || !bundle.items?.length) {
        this.msg.add({ severity: 'warn', detail: 'Paquet vide ou introuvable' });
        this.saving = false; return;
      }
      const calls = bundle.items.map((item: any) =>
        this.api.createStockMovement({
          type: val.type, quantity: item.quantity * val.quantity,
          productId: item.productId,
          reference: val.reference || bundle.name,
          notes: val.notes
        })
      );
      forkJoin(calls).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', detail: `${bundle.items.length} mouvement(s) créé(s) pour le paquet` });
          this.showDialog = false; this.saving = false;
          this.form.reset({ _itemType: 'PRODUCT', type: 'ENTREE', quantity: 1 });
          this.load();
        },
        error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
      });
    } else {
      const { _itemType, bundleId, ...payload } = val;
      this.api.createStockMovement(payload).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', detail: 'Mouvement enregistré' });
          this.showDialog = false; this.saving = false;
          this.form.reset({ _itemType: 'PRODUCT', type: 'ENTREE', quantity: 1 });
          this.load();
        },
        error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
      });
    }
  }

  printMovement(m: StockMovement) { this.printer.printMovement(m); }

  typeLabel(t: string): string { return ({ ENTREE: 'Entrée', SORTIE: 'Bon de Sortie', AJUSTEMENT: 'Ajustement' } as any)[t] ?? t; }
  typeClass(t: string): string { return ({ ENTREE: 'status-paid', SORTIE: 'status-cancelled', AJUSTEMENT: 'status-sent' } as any)[t] ?? ''; }
}
