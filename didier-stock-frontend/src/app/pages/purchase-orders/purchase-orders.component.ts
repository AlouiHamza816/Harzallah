import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { Product, ProductBundle, PurchaseOrder, Supplier } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    InputNumberModule, DialogModule, DropdownModule, CalendarModule, ConfirmDialogModule,
    ToastModule, InputTextareaModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-shopping-cart"></i>Bons de commande</h2>
      <p-button label="Nouveau BC" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="orders" [loading]="loading" [paginator]="true" [rows]="10"
               [globalFilterFields]="['number','supplierName']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher numéro, fournisseur..." class="table-search" />
            <span class="item-count"><i class="pi pi-shopping-cart" style="margin-right:4px"></i>{{ orders.length }} commande(s)</span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="number">Numéro <p-sortIcon field="number" /></th>
            <th class="hide-mobile" pSortableColumn="date">Date</th>
            <th pSortableColumn="supplierName">Fournisseur <p-sortIcon field="supplierName" /></th>
            <th class="hide-mobile">Total TTC</th>
            <th>Statut</th>
            <th style="width:140px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-o>
          <tr>
            <td>
              <strong>{{ o.number }}</strong>
              <div class="sub-info hide-desktop">{{ o.date | date:'dd/MM/yy' }} — {{ o.totalTTC | number:'1.0-0' }} DT</div>
            </td>
            <td class="hide-mobile">{{ o.date | date:'dd/MM/yyyy' }}</td>
            <td>{{ o.supplierName }}</td>
            <td class="hide-mobile">{{ o.totalTTC | number:'1.0-0' }} DT</td>
            <td>
              <span [class]="'status-badge status-' + o.status?.toLowerCase()">
                {{ statusLabel(o.status) }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <p-button *ngIf="o.status==='DRAFT'" icon="pi pi-send" [rounded]="true" [text]="true"
                          severity="info" pTooltip="Envoyer" (onClick)="updateStatus(o,'SENT')" />
                <p-button *ngIf="o.status==='SENT'" icon="pi pi-check" [rounded]="true" [text]="true"
                          severity="success" pTooltip="Marquer reçu" (onClick)="updateStatus(o,'RECEIVED')" />
                <p-button icon="pi pi-print" [rounded]="true" [text]="true"
                          severity="secondary" pTooltip="Télécharger PDF" (onClick)="print(o)" />
                <p-button *ngIf="o.status!=='RECEIVED'" icon="pi pi-trash" [rounded]="true" [text]="true"
                          severity="danger" pTooltip="Supprimer" (onClick)="delete(o)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-shopping-cart empty-icon"></i>
              <div class="empty-title">Aucun bon de commande trouvé</div>
              <div class="empty-sub">Créez votre premier bon de commande fournisseur</div>
              <p-button label="Nouveau BC" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'720px'}" [breakpoints]="{'768px':'95vw'}"
              header="Nouveau bon de commande"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form grid">
        <div class="col-6 field">
          <label>Fournisseur <span class="required">*</span></label>
          <p-dropdown formControlName="supplierId" [options]="suppliers"
                      optionLabel="name" optionValue="id"
                      placeholder="-- Sélectionner --" [filter]="true" styleClass="w-full" />
        </div>
        <div class="col-6 field">
          <label>Date <span class="required">*</span></label>
          <p-calendar formControlName="date" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
        </div>
        <div class="col-6 field">
          <label>Taux TVA (%)</label>
          <p-inputNumber formControlName="taxRate" [min]="0" [max]="100"
                         [minFractionDigits]="2" styleClass="w-full" suffix=" %" />
        </div>
        <div class="col-12 field">
          <label>Notes</label>
          <textarea pTextarea formControlName="notes" rows="2" class="w-full"></textarea>
        </div>

        <div class="col-12">
          <h4 class="lines-title">Lignes de commande</h4>
          <div class="lines-wrapper">
            <table class="lines-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th class="col-qty">Qté</th>
                  <th class="col-price">Prix unit.</th>
                  <th class="col-del"></th>
                </tr>
              </thead>
              <tbody formArrayName="lines">
                <tr *ngFor="let line of lines.controls; let i = index" [formGroupName]="i">
                  <td>
                    <div class="type-switch mb-1">
                      <button type="button" [class.active]="line.get('_lineType')?.value !== 'BUNDLE'"
                              (click)="setLineType(i,'PRODUCT')">Produit</button>
                      <button type="button" [class.active]="line.get('_lineType')?.value === 'BUNDLE'"
                              (click)="setLineType(i,'BUNDLE')">Paquet</button>
                    </div>
                    <p-dropdown *ngIf="line.get('_lineType')?.value !== 'BUNDLE'"
                                formControlName="productId" [options]="products"
                                optionLabel="name" optionValue="id"
                                placeholder="Produit" [filter]="true" styleClass="w-full"
                                appendTo="body" (onChange)="onProductSelect(i,$event)" />
                    <p-dropdown *ngIf="line.get('_lineType')?.value === 'BUNDLE'"
                                formControlName="productId" [options]="bundles"
                                optionLabel="name" optionValue="id"
                                placeholder="Paquet" [filter]="true" styleClass="w-full"
                                appendTo="body" (onChange)="onBundleSelect(i,$event)" />
                  </td>
                  <td class="col-qty">
                    <p-inputNumber formControlName="quantity" [min]="1" styleClass="w-full" />
                  </td>
                  <td class="col-price">
                    <p-inputNumber formControlName="unitPrice" [min]="0" styleClass="w-full" />
                  </td>
                  <td class="col-del">
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true"
                              severity="danger" (onClick)="lines.removeAt(i)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p-button label="Ajouter ligne" icon="pi pi-plus" [text]="true"
                    (onClick)="addLine()" styleClass="mt-2" />
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
    .type-switch { display: flex; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .type-switch button { flex: 1; border: none; background: #f8f9fa; padding: 3px 5px; font-size: 0.75rem; cursor: pointer; color: #555; }
    .type-switch button.active { background: #2c3e50; color: white; }
    .sub-info    { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    .lines-title { font-size: 0.95rem; font-weight: 600; margin: 0.5rem 0; color: #2c3e50; }
    .lines-wrapper { overflow-x: auto; }
    .lines-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 400px; }
    .lines-table th { background: #f8f9fa; padding: 0.4rem 0.5rem; text-align: left;
                      border-bottom: 2px solid #dee2e6; white-space: nowrap; }
    .lines-table td { padding: 0.25rem 0.5rem; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
    .col-qty   { width: 90px; }
    .col-price { width: 120px; }
    .col-del   { width: 44px; }
    @media (min-width: 601px) { .hide-desktop { display: none; } }
    @media (max-width: 560px) {
      .col-6 { width: 100%; flex: 0 0 100%; max-width: 100%; }
    }
  `]
})
export class PurchaseOrdersComponent implements OnInit {
  orders: PurchaseOrder[] = [];
  suppliers: Supplier[] = [];
  products: Product[] = [];
  bundles: ProductBundle[] = [];
  loading = true; showDialog = false; saving = false;
  form: FormGroup;

  constructor(private api: ApiService, private fb: FormBuilder,
              private msg: MessageService, private confirm: ConfirmationService,
              private printer: ThermalPrintService) {
    this.form = this.fb.group({
      supplierId: [null, Validators.required],
      date:       [new Date(), Validators.required],
      taxRate:    [0],
      notes:      [''],
      lines:      this.fb.array([])
    });
  }

  ngOnInit() {
    this.load();
    this.api.getSuppliers().subscribe(s => this.suppliers = s);
    this.api.getProducts().subscribe(p => this.products = p);
    this.api.getBundles().subscribe(b => this.bundles = b.filter((x: ProductBundle) => x.active));
  }

  load() {
    this.loading = true;
    this.api.getPurchaseOrders().subscribe({
      next: d => { this.orders = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get lines() { return this.form.get('lines') as FormArray; }

  addLine() {
    this.lines.push(this.fb.group({ _lineType: ['PRODUCT'], productId: [null], description: [''], quantity: [1], unitPrice: [0] }));
  }

  setLineType(i: number, type: 'PRODUCT' | 'BUNDLE') {
    this.lines.at(i).patchValue({ _lineType: type, productId: null, description: '', unitPrice: 0 });
  }

  onProductSelect(i: number, e: any) {
    const p = this.products.find(p => p.id === e.value);
    if (p) this.lines.at(i).patchValue({ description: p.name, unitPrice: p.purchasePrice });
  }

  onBundleSelect(i: number, e: any) {
    const b = this.bundles.find(b => b.id === e.value);
    if (b) this.lines.at(i).patchValue({ description: b.name, unitPrice: b.sellingPrice });
  }

  openNew() {
    this.form.reset({ date: new Date(), taxRate: 0 });
    while (this.lines.length) this.lines.removeAt(0);
    this.addLine();
    this.showDialog = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;
    const payload = {
      ...val,
      date: val.date.toISOString().split('T')[0],
      lines: val.lines.map(({ _lineType, ...rest }: any) => ({
        ...rest,
        productId: _lineType === 'BUNDLE' ? null : rest.productId
      }))
    };
    this.api.createPurchaseOrder(payload).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', detail: 'Bon de commande créé' });
        this.showDialog = false; this.saving = false; this.load();
      },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  updateStatus(o: PurchaseOrder, status: string) {
    this.api.updatePurchaseOrderStatus(o.id!, status).subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Statut mis à jour' }); this.load(); },
      error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
    });
  }

  delete(o: PurchaseOrder) {
    this.confirm.confirm({
      message: `Supprimer le BC <strong>${o.number}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deletePurchaseOrder(o.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }

  print(o: PurchaseOrder) { this.printer.printPurchaseOrder(o); }

  statusLabel(s?: string): string {
    const map: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Envoyé', RECEIVED: 'Reçu', CANCELLED: 'Annulé' };
    return map[s ?? ''] ?? s ?? '';
  }
}
