import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { Category, Invoice, InvoiceLine, Product, Supplier } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

interface BsLine {
  productId: number | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalHT: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule,
    InputTextModule, InputNumberModule, DialogModule, ConfirmDialogModule, ToastModule,
    DropdownModule, TagModule, ToggleButtonModule, InputTextareaModule, TooltipModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-box"></i>Produits</h2>
      <div class="header-actions">
        <p-button label="Bon de sortie" icon="pi pi-file-export" severity="warning"
                  pTooltip="Créer un bon de sortie depuis les produits sélectionnés"
                  (onClick)="openBonSortie()" />
        <p-button label="Nouveau produit" icon="pi pi-plus" (onClick)="openNew()" />
      </div>
    </div>

    <div class="card-content">
      <p-table [value]="filteredProducts" [loading]="loading" [paginator]="true" [rows]="10"
               [globalFilterFields]="['name','reference','categoryName']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines"
               [(selection)]="selectedProducts" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher un produit..." class="table-search" />
            <p-dropdown [options]="categoryFilterOptions" [(ngModel)]="selectedCategoryId"
                        optionLabel="name" optionValue="id"
                        placeholder="Toutes catégories" [showClear]="true"
                        (onChange)="applyFilter()" styleClass="cat-filter" />
            <span class="item-count">
              <i class="pi pi-box" style="margin-right:4px"></i>{{ filteredProducts.length }} produit(s)
              <span *ngIf="selectedProducts.length > 0" class="sel-count">&nbsp;· {{ selectedProducts.length }} sélectionné(s)</span>
            </span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem"><p-tableHeaderCheckbox /></th>
            <th pSortableColumn="name">Produit <p-sortIcon field="name" /></th>
            <th class="hide-mobile" pSortableColumn="categoryName">Catégorie <p-sortIcon field="categoryName" /></th>
            <th class="hide-mobile" pSortableColumn="sellingPrice">Prix vente <p-sortIcon field="sellingPrice" /></th>
            <th pSortableColumn="stockQuantity">Stock <p-sortIcon field="stockQuantity" /></th>
            <th class="hide-mobile">Statut</th>
            <th style="width:110px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td><p-tableCheckbox [value]="p" /></td>
            <td>
              <strong>{{ p.name }}</strong>
              <div class="sub-ref"><code>{{ p.reference }}</code></div>
              <div class="sub-info hide-desktop">{{ p.sellingPrice | number:'1.0-3' }} DT</div>
            </td>
            <td class="hide-mobile">{{ p.categoryName || '—' }}</td>
            <td class="hide-mobile">{{ p.sellingPrice | number:'1.0-3' }} DT</td>
            <td>
              <span [class]="'status-badge ' + (p.lowStock ? 'status-low' : 'status-paid')">
                {{ p.stockQuantity }} {{ p.unit }}
              </span>
            </td>
            <td class="hide-mobile">
              <span [class]="'status-badge ' + (p.active ? 'status-paid' : 'status-cancelled')">
                {{ p.active ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" (onClick)="edit(p)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(p)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="empty-state">
              <i class="pi pi-box empty-icon"></i>
              <div class="empty-title">Aucun produit trouvé</div>
              <div class="empty-sub">Commencez par ajouter votre premier produit au catalogue</div>
              <p-button label="Nouveau produit" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <!-- ── Dialog Produit ── -->
    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'640px'}" [breakpoints]="{'768px':'95vw'}"
              [header]="editMode ? 'Modifier le produit' : 'Nouveau produit'"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form grid">
        <div class="col-6 field">
          <label>Référence <span class="required">*</span></label>
          <input pInputText formControlName="reference" class="w-full" placeholder="REF-001" />
        </div>
        <div class="col-6 field">
          <label>Nom <span class="required">*</span></label>
          <input pInputText formControlName="name" class="w-full" />
        </div>
        <div class="col-12 field">
          <label>Description</label>
          <textarea pTextarea formControlName="description" rows="2" class="w-full"></textarea>
        </div>
        <div class="col-6 field">
          <label>Catégorie</label>
          <p-dropdown formControlName="categoryId" [options]="categories"
                      optionLabel="name" optionValue="id"
                      placeholder="— Sélectionner —" styleClass="w-full" />
        </div>
        <div class="col-6 field">
          <label>Unité</label>
          <input pInputText formControlName="unit" class="w-full" placeholder="pcs, kg, L..." />
        </div>
        <div class="col-6 field">
          <label>Prix d'achat</label>
          <input pInputText formControlName="purchasePrice" class="w-full" placeholder="0.000" />
        </div>
        <div class="col-6 field">
          <label>Prix de vente <span class="required">*</span></label>
          <input pInputText formControlName="sellingPrice" class="w-full" placeholder="0.000" />
        </div>
        <div class="col-6 field">
          <label>Quantité en stock</label>
          <p-inputNumber formControlName="stockQuantity" [min]="0" styleClass="w-full" />
        </div>
        <div class="col-6 field">
          <label>Seuil d'alerte</label>
          <p-inputNumber formControlName="alertThreshold" [min]="0" styleClass="w-full" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" icon="pi pi-times" [text]="true" severity="secondary"
                  (onClick)="showDialog=false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="save()" [loading]="saving" />
      </ng-template>
    </p-dialog>

    <!-- ── Dialog Bon de Sortie ── -->
    <p-dialog [(visible)]="showBonSortie" [modal]="true"
              [style]="{width:'860px'}" [breakpoints]="{'900px':'95vw'}"
              header="Nouveau Bon de Sortie"
              [draggable]="false" [resizable]="false">

      <div class="bs-form">
        <div class="bs-header-row">
          <div class="bs-field">
            <label>Fournisseur <span class="required">*</span></label>
            <p-dropdown [options]="suppliers" [(ngModel)]="bsSupplierId"
                        optionLabel="name" optionValue="id"
                        placeholder="— Sélectionner un fournisseur —"
                        styleClass="w-full" [filter]="true" filterBy="name" />
          </div>
          <div class="bs-field bs-field-sm">
            <label>Date</label>
            <input pInputText type="date" [(ngModel)]="bsDate" class="w-full" />
          </div>
        </div>

        <div class="bs-lines-wrap">
          <div class="bs-line-header">
            <span class="bsl-prod">Produit</span>
            <span class="bsl-qty">Quantité</span>
            <span class="bsl-prix">Prix unit.</span>
            <span class="bsl-total">Total HT</span>
            <span class="bsl-act"></span>
          </div>

          <div *ngFor="let line of bsLines; let i = index" class="bs-line-row">
            <span class="bsl-prod">
              <p-dropdown [options]="products" [(ngModel)]="line.productId"
                          optionLabel="name" optionValue="id"
                          placeholder="Choisir..." styleClass="w-full" [filter]="true"
                          (onChange)="onLineProductChange(i)" />
            </span>
            <span class="bsl-qty">
              <p-inputNumber [(ngModel)]="line.quantity" [min]="1" [showButtons]="true"
                             (ngModelChange)="calcLine(i)" styleClass="w-full" />
            </span>
            <span class="bsl-prix">
              <p-inputNumber [(ngModel)]="line.unitPrice" [minFractionDigits]="3" [maxFractionDigits]="3"
                             (ngModelChange)="calcLine(i)" styleClass="w-full" />
            </span>
            <span class="bsl-total">{{ line.totalHT | number:'1.0-3' }}</span>
            <span class="bsl-act">
              <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                        (onClick)="removeBsLine(i)" />
            </span>
          </div>

          <p-button label="Ajouter une ligne" icon="pi pi-plus" [text]="true"
                    severity="secondary" (onClick)="addBsLine()" styleClass="mt-2" />
        </div>

        <div class="bs-totals">
          <div class="bs-total-line"><span>Total HT</span><strong>{{ bsTotalHT | number:'1.0-3' }}</strong></div>
        </div>

        <div class="bs-notes-wrap">
          <label>Notes</label>
          <textarea pTextarea [(ngModel)]="bsNotes" rows="2" class="w-full" placeholder="Observations..."></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Annuler" icon="pi pi-times" [text]="true" severity="secondary"
                  (onClick)="showBonSortie=false" />
        <p-button label="Enregistrer et imprimer" icon="pi pi-print"
                  (onClick)="saveBonSortie()" [loading]="savingBs" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .header-actions { display: flex; gap: 0.5rem; align-items: center; }
    .required { color: #e74c3c; }
    .dialog-form { padding: 0.25rem 0; }
    .sub-ref { font-size: 0.75rem; color: #95a5a6; margin-top: 2px; }
    .sub-info { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    .sel-count { color: var(--primary-color); font-weight: 600; }
    .cat-filter { min-width: 180px; }
    @media (min-width: 601px) { .hide-desktop { display: none; } }

    /* Bon de sortie */
    .bs-form { display: flex; flex-direction: column; gap: 1rem; }
    .bs-header-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .bs-field { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px; }
    .bs-field-sm { flex: 0 0 160px; }
    .bs-lines-wrap { border: 1px solid #dee2e6; border-radius: 6px; padding: 0.75rem; }
    .bs-line-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 2.5rem;
                      gap: 0.5rem; font-size: 0.78rem; font-weight: 600;
                      text-transform: uppercase; color: #6c757d;
                      padding-bottom: 0.5rem; border-bottom: 1px solid #dee2e6; margin-bottom: 0.5rem; }
    .bs-line-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 2.5rem;
                   gap: 0.5rem; align-items: center; padding: 4px 0;
                   border-bottom: 1px dashed #f0f0f0; }
    .bsl-prod, .bsl-qty, .bsl-prix, .bsl-total, .bsl-act { display: flex; align-items: center; }
    .bsl-total { font-weight: 600; justify-content: flex-end; padding-right: 4px; }
    .bs-totals { display: flex; justify-content: flex-end; padding: 0.5rem 0; }
    .bs-total-line { display: flex; gap: 1.5rem; font-size: 1rem; align-items: center; }
    .bs-total-line strong { font-size: 1.2rem; }
    .bs-notes-wrap { display: flex; flex-direction: column; gap: 4px; }
    @media (max-width: 640px) {
      .bs-line-header { grid-template-columns: 1fr 120px 2.5rem; }
      .bs-line-row    { grid-template-columns: 1fr 120px 2.5rem; }
      .bsl-prix, .bsl-total { display: none; }
      .bsl-qty { overflow: hidden; }
      .bsl-qty ::ng-deep .p-inputnumber { width: 100%; }
      .bsl-qty ::ng-deep .p-inputnumber-input { min-width: 0; width: 100%; }
    }
  `]
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  categoryFilterOptions: Category[] = [];
  suppliers: Supplier[] = [];
  loading = true;
  showDialog = false;
  editMode = false;
  saving = false;
  form: FormGroup;
  private editId?: number;

  // Filtre catégorie
  selectedCategoryId: number | null = null;
  selectedProducts: Product[] = [];

  // Bon de sortie
  showBonSortie = false;
  savingBs = false;
  bsSupplierId: number | null = null;
  bsDate: string = new Date().toISOString().split('T')[0];
  bsNotes = '';
  bsLines: BsLine[] = [];
  bsTotalHT = 0;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private printer: ThermalPrintService,
    private msg: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.fb.group({
      reference:      ['', Validators.required],
      name:           ['', Validators.required],
      description:    [''],
      categoryId:     [null],
      purchasePrice:  [''],
      sellingPrice:   ['', Validators.required],
      stockQuantity:  [0],
      alertThreshold: [5],
      unit:           ['pcs'],
      active:         [true]
    });
  }

  ngOnInit() {
    this.load();
    this.api.getCategories().subscribe(c => {
      this.categories = c;
      this.categoryFilterOptions = c;
    });
    this.api.getSuppliers().subscribe(s => this.suppliers = s);
  }

  load() {
    this.loading = true;
    this.api.getProducts().subscribe({
      next: d => { this.products = d; this.applyFilter(); this.loading = false; },
      error: () => this.loading = false
    });
  }

  applyFilter() {
    if (this.selectedCategoryId == null) {
      this.filteredProducts = this.products;
    } else {
      this.filteredProducts = this.products.filter(p => p.categoryId === this.selectedCategoryId);
    }
  }

  // ── Bon de sortie ──────────────────────────────────────────

  openBonSortie() {
    this.bsSupplierId = null;
    this.bsDate = new Date().toISOString().split('T')[0];
    this.bsNotes = '';
    this.bsLines = this.selectedProducts.length > 0
      ? this.selectedProducts.map(p => this.productToLine(p))
      : [this.emptyLine()];
    this.calcTotals();
    this.showBonSortie = true;
  }

  private productToLine(p: Product): BsLine {
    return { productId: p.id!, productName: p.name, unit: p.unit, quantity: 1, unitPrice: p.purchasePrice, totalHT: p.purchasePrice };
  }

  private emptyLine(): BsLine {
    return { productId: null, productName: '', unit: '', quantity: 1, unitPrice: 0, totalHT: 0 };
  }

  addBsLine() { this.bsLines = [...this.bsLines, this.emptyLine()]; }

  removeBsLine(i: number) {
    this.bsLines = this.bsLines.filter((_, idx) => idx !== i);
    this.calcTotals();
  }

  onLineProductChange(i: number) {
    const line = this.bsLines[i];
    const prod = this.products.find(p => p.id === line.productId);
    if (prod) {
      line.productName = prod.name;
      line.unit = prod.unit;
      line.unitPrice = prod.purchasePrice;
      this.calcLine(i);
    }
  }

  calcLine(i: number) {
    const line = this.bsLines[i];
    line.totalHT = (line.quantity || 0) * (line.unitPrice || 0);
    this.calcTotals();
  }

  private calcTotals() {
    this.bsTotalHT = this.bsLines.reduce((s, l) => s + (l.totalHT || 0), 0);
  }

  saveBonSortie() {
    if (!this.bsSupplierId) {
      this.msg.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner un fournisseur.' });
      return;
    }
    if (this.bsLines.length === 0 || this.bsLines.every(l => !l.productId)) {
      this.msg.add({ severity: 'warn', summary: 'Attention', detail: 'Ajoutez au moins un produit.' });
      return;
    }

    const lines: InvoiceLine[] = this.bsLines
      .filter(l => l.productId != null)
      .map(l => ({
        productId: l.productId!,
        description: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: 0,
        totalHT: l.totalHT
      }));

    const supplier = this.suppliers.find(s => s.id === this.bsSupplierId);
    const invoice: Invoice = {
      type: 'DEVIS',
      date: this.bsDate,
      supplierId: this.bsSupplierId!,
      supplierName: supplier?.name,
      supplierAddress: supplier?.address,
      lines,
      taxRate: 0,
      totalHT: this.bsTotalHT,
      totalTVA: 0,
      totalTTC: this.bsTotalHT,
      notes: this.bsNotes || undefined,
      status: 'DRAFT'
    };

    this.savingBs = true;
    this.api.createInvoice(invoice).subscribe({
      next: saved => {
        this.msg.add({ severity: 'success', summary: 'Succès', detail: 'Bon de sortie créé.' });
        this.showBonSortie = false;
        this.savingBs = false;
        this.selectedProducts = [];
        this.printer.print(saved);
      },
      error: err => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur serveur' });
        this.savingBs = false;
      }
    });
  }

  // ── Produit CRUD ───────────────────────────────────────────

  openNew() {
    this.editMode = false; this.editId = undefined;
    this.form.reset({ stockQuantity: 0, alertThreshold: 5, unit: 'pcs', active: true, purchasePrice: '', sellingPrice: '' });
    this.showDialog = true;
  }

  edit(p: Product) {
    this.editMode = true; this.editId = p.id;
    this.form.patchValue({ ...p, purchasePrice: p.purchasePrice ?? '', sellingPrice: p.sellingPrice ?? '' });
    this.showDialog = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      ...raw,
      purchasePrice: raw.purchasePrice !== '' && raw.purchasePrice != null ? parseFloat(String(raw.purchasePrice).replace(',', '.')) : null,
      sellingPrice:  raw.sellingPrice  !== '' && raw.sellingPrice  != null ? parseFloat(String(raw.sellingPrice).replace(',', '.'))  : null,
    };
    const obs = this.editMode ? this.api.updateProduct(this.editId!, payload) : this.api.createProduct(payload);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Succès', detail: 'Produit enregistré' }); this.showDialog = false; this.saving = false; this.load(); },
      error: err => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  delete(p: Product) {
    this.confirm.confirm({
      message: `Supprimer le produit <strong>${p.name}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteProduct(p.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
