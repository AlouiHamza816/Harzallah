import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ThermalPrintService } from '../../../core/services/thermal-print.service';
import { Customer, Invoice, Product, ProductBundle, Supplier } from '../../../core/models/models';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule,
    InputNumberModule, DropdownModule, CalendarModule, ToastModule, InputTextareaModule, TableModule],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <h2><i class="pi pi-file-edit mr-2"></i>{{ id ? 'Modifier' : 'Nouveau' }} document</h2>
      <div class="header-actions">
        <p-button label="Retour" icon="pi pi-arrow-left" [text]="true" severity="secondary"
                  routerLink="/invoices" />
        <p-button *ngIf="currentInvoice" label="PDF" icon="pi pi-print" severity="secondary"
                  (onClick)="print()" pTooltip="Imprimer document PDF (A4)" />
        <p-button label="Enregistrer" icon="pi pi-save" (onClick)="save()" [loading]="saving" />
      </div>
    </div>

    <div class="card-content">
      <form [formGroup]="form">

        <div class="form-header-grid">
          <div class="field">
            <label>Type <span class="required">*</span></label>
            <p-dropdown formControlName="type" [options]="typeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Date <span class="required">*</span></label>
            <p-calendar formControlName="date" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>Échéance</label>
            <p-calendar formControlName="dueDate" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field field-wide">
            <ng-container *ngIf="!isBonSortie">
              <label>Client <span class="required">*</span></label>
              <p-dropdown formControlName="customerId" [options]="customers"
                          optionLabel="name" optionValue="id" placeholder="-- Sélectionner --"
                          [filter]="true" filterBy="name" styleClass="w-full" appendTo="body" />
            </ng-container>
            <ng-container *ngIf="isBonSortie">
              <label>Fournisseur <span class="required">*</span></label>
              <p-dropdown formControlName="supplierId" [options]="suppliers"
                          optionLabel="name" optionValue="id" placeholder="-- Sélectionner --"
                          [filter]="true" filterBy="name" styleClass="w-full" appendTo="body" />
            </ng-container>
          </div>
          <div class="field">
            <label>Taux TVA (%)</label>
            <p-inputNumber formControlName="taxRate" [min]="0" [max]="100"
                           [minFractionDigits]="2" styleClass="w-full" suffix=" %"
                           (onInput)="recalculate()" />
          </div>
          <div class="field field-wide">
            <label>Notes</label>
            <textarea pTextarea formControlName="notes" rows="2" class="w-full"></textarea>
          </div>
          <ng-container *ngIf="isBonLivraison">
            <div class="field">
              <label>Nom du chauffeur</label>
              <input pInputText formControlName="driverName" class="w-full" placeholder="Nom du chauffeur" />
            </div>
            <div class="field">
              <label>Série de camion</label>
              <input pInputText formControlName="truckPlate" class="w-full" placeholder="Série de camion" />
            </div>
          </ng-container>
          <div class="field">
            <label>Timbre fiscal</label>
            <p-inputNumber formControlName="stampDuty" [min]="0" [minFractionDigits]="3"
                           styleClass="stamp-input" (onInput)="recalculate()" />
          </div>
          <div class="field">
            <label>Remise globale (%)</label>
            <p-inputNumber formControlName="globalDiscount" [min]="0" [max]="100"
                           [minFractionDigits]="2" [maxFractionDigits]="2" suffix=" %"
                           styleClass="stamp-input" (onInput)="recalculate()" />
          </div>
        </div>

        <h3 class="lines-heading">Lignes de document</h3>
        <div class="lines-wrapper">
          <table class="lines-table">
            <thead>
              <tr>
                <th>Produit / Description</th>
                <th class="col-dim hide-mobile">DIM</th>
                <th class="col-num">Qté</th>
                <th class="col-num">Prix unit.</th>
                <th class="col-disc hide-mobile">Remise %</th>
                <th class="col-total">Total HT</th>
                <th class="col-del"></th>
              </tr>
            </thead>
            <tbody formArrayName="lines">
              <tr *ngFor="let line of lines.controls; let i = index" [formGroupName]="i">
                <td class="td-product">
                  <div class="type-switch">
                    <button type="button" [class.active]="line.get('_lineType')?.value !== 'BUNDLE'"
                            (click)="setLineType(i,'PRODUCT')">Produit</button>
                    <button type="button" [class.active]="line.get('_lineType')?.value === 'BUNDLE'"
                            (click)="setLineType(i,'BUNDLE')">Paquet</button>
                  </div>
                  <p-dropdown *ngIf="line.get('_lineType')?.value !== 'BUNDLE'"
                              formControlName="productId" [options]="products"
                              optionLabel="name" optionValue="id" placeholder="Choisir produit"
                              [filter]="true" filterBy="name" styleClass="w-full"
                              appendTo="body" (onChange)="onProductSelect(i, $event)" />
                  <p-dropdown *ngIf="line.get('_lineType')?.value === 'BUNDLE'"
                              formControlName="productId" [options]="bundles"
                              optionLabel="name" optionValue="id" placeholder="Choisir paquet"
                              [filter]="true" filterBy="name" styleClass="w-full"
                              appendTo="body" (onChange)="onBundleSelect(i, $event)" />
                  <input pInputText formControlName="description" placeholder="Description"
                         class="w-full mt-1 desc-input" />
                </td>
                <td class="col-dim hide-mobile">
                  <input pInputText formControlName="dimension" placeholder="ex: 2.20/2.80"
                         class="w-full dim-input" />
                </td>
                <td class="col-num">
                  <p-inputNumber formControlName="quantity" [min]="0.001"
                                 [minFractionDigits]="0" [maxFractionDigits]="3"
                                 styleClass="w-full" (onInput)="recalculateLine(i)" />
                </td>
                <td class="col-num">
                  <p-inputNumber formControlName="unitPrice" [min]="0"
                                 styleClass="w-full" (onInput)="recalculateLine(i)" />
                </td>
                <td class="col-disc hide-mobile">
                  <p-inputNumber formControlName="discountPercent" [min]="0" [max]="100"
                                 styleClass="w-full" (onInput)="recalculateLine(i)" />
                </td>
                <td class="col-total">{{ getLineTotal(i) | number:'1.0-0' }}</td>
                <td class="col-del">
                  <p-button icon="pi pi-trash" [rounded]="true" [text]="true"
                            severity="danger" (onClick)="removeLine(i)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p-button label="Ajouter ligne" icon="pi pi-plus" [text]="true"
                  (onClick)="addLine()" styleClass="mt-2" />

        <div class="totals-box">
          <div class="total-row">
            <span>Total HT</span>
            <strong>{{ totalHT | number:'1.0-3' }} DT</strong>
          </div>
          <div class="total-row" *ngIf="(form.get('globalDiscount')?.value || 0) > 0">
            <span>Remise ({{ form.get('globalDiscount')?.value }}%)</span>
            <strong>- {{ totalHT * (form.get('globalDiscount')?.value || 0) / 100 | number:'1.0-3' }} DT</strong>
          </div>
          <div class="total-row" *ngIf="(form.get('taxRate')?.value || 0) > 0">
            <span>TVA ({{ form.get('taxRate')?.value }}%)</span>
            <strong>{{ totalTVA | number:'1.0-3' }} DT</strong>
          </div>
          <div class="total-row" *ngIf="(form.get('stampDuty')?.value || 0) > 0">
            <span>Timbre fiscal</span>
            <strong>{{ (form.get('stampDuty')?.value || 0) | number:'1.0-3' }} DT</strong>
          </div>
          <div class="total-row total-ttc">
            <span>Total TTC</span>
            <strong>{{ totalTTC | number:'1.0-3' }} DT</strong>
          </div>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .required { color: #e74c3c; }

    .form-header-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .field-wide { grid-column: span 2; }
    .field label { display: block; margin-bottom: 0.3rem; font-weight: 500; font-size: 0.88rem; color: #444; }

    .lines-heading {
      font-size: 1rem; font-weight: 600; color: #2c3e50;
      margin: 0 0 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid #f0f0f0;
    }
    .lines-wrapper { overflow-x: auto; }
    .lines-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 520px; }
    .lines-table thead th {
      background: #f8f9fa; padding: 0.5rem 0.5rem;
      text-align: left; border-bottom: 2px solid #dee2e6;
      white-space: nowrap;
    }
    .lines-table tbody td { padding: 0.3rem 0.5rem; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
    .type-switch { display: flex; margin-bottom: 4px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .type-switch button { flex: 1; border: none; background: #f8f9fa; padding: 3px 6px; font-size: 0.78rem; cursor: pointer; color: #555; transition: all .15s; }
    .type-switch button.active { background: #2c3e50; color: white; }
    .td-product { min-width: 220px; }
    .col-dim   { width: 100px; }
    .col-num   { width: 110px; }
    .col-disc  { width: 90px; }
    .col-total { width: 110px; text-align: right; font-weight: 600; padding-right: 0.75rem; }
    .col-del   { width: 44px; }
    .desc-input { font-size: 0.82rem; }
    .dim-input  { font-size: 0.82rem; }

    .totals-box {
      max-width: 340px; margin: 1.25rem 0 0 auto;
      border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;
    }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.55rem 1rem; border-bottom: 1px solid #dee2e6;
    }
    .total-ttc { background: #2c3e50; color: white; font-size: 1.05rem; border-bottom: none; }
    :host ::ng-deep .stamp-input .p-inputnumber-input { width: 90px; text-align: right; font-size: 0.88rem; }

    @media (max-width: 900px) {
      .form-header-grid { grid-template-columns: 1fr 1fr; }
      .field-wide { grid-column: span 2; }
    }
    @media (max-width: 600px) {
      .form-header-grid { grid-template-columns: 1fr; }
      .field-wide { grid-column: span 1; }
      .totals-box { max-width: 100%; }
    }
  `]
})
export class InvoiceFormComponent implements OnInit {
  form: FormGroup;
  customers: Customer[] = [];
  suppliers: Supplier[] = [];
  products: Product[] = [];
  bundles: ProductBundle[] = [];
  id?: number;
  saving = false;
  totalHT = 0; totalTVA = 0; totalTTC = 0;
  currentInvoice: Invoice | null = null;

  get isBonSortie(): boolean { return this.form.get('type')?.value === 'DEVIS'; }
  get isBonLivraison(): boolean { return this.form.get('type')?.value === 'BON_LIVRAISON'; }

  typeOptions = [
    { label: 'Facture',          value: 'FACTURE' },
    { label: 'Devis',            value: 'DEVIS' },
    { label: 'Bon de livraison', value: 'BON_LIVRAISON' }
  ];

  constructor(private fb: FormBuilder, private api: ApiService,
              private route: ActivatedRoute, private router: Router,
              private msg: MessageService, private printer: ThermalPrintService) {
    this.form = this.fb.group({
      type:       ['FACTURE', Validators.required],
      date:       [new Date(), Validators.required],
      dueDate:    [null],
      customerId: [null, Validators.required],
      supplierId: [null],
      taxRate:        [0],
      stampDuty:      [0],
      globalDiscount: [0],
      driverName: [''],
      truckPlate: [''],
      notes:      [''],
      lines:      this.fb.array([])
    });

    this.form.get('type')!.valueChanges.subscribe(type => {
      const cid = this.form.get('customerId')!;
      const sid = this.form.get('supplierId')!;
      if (type === 'DEVIS') {
        cid.clearValidators(); cid.setValue(null);
        sid.setValidators(Validators.required);
      } else {
        sid.clearValidators(); sid.setValue(null);
        cid.setValidators(Validators.required);
      }
      cid.updateValueAndValidity();
      sid.updateValueAndValidity();
    });
  }

  ngOnInit() {
    this.api.getCustomers().subscribe(c => this.customers = c);
    this.api.getSuppliers().subscribe(s => this.suppliers = s);
    this.api.getProducts().subscribe(p => this.products = p);
    this.api.getBundles().subscribe(b => this.bundles = b.filter((x: ProductBundle) => x.active));
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = +idParam;
      this.api.getInvoice(this.id).subscribe(inv => { this.currentInvoice = inv; this.patchForm(inv); });
    } else {
      this.addLine();
    }
  }

  get lines() { return this.form.get('lines') as FormArray; }

  addLine() {
    this.lines.push(this.fb.group({
      _lineType: ['PRODUCT'], productId: [null], description: [''], dimension: [''], quantity: [1],
      unitPrice: [0], discountPercent: [0], totalHT: [0]
    }));
  }

  setLineType(i: number, type: 'PRODUCT' | 'BUNDLE') {
    this.lines.at(i).patchValue({ _lineType: type, productId: null, description: '', unitPrice: 0 });
    this.recalculateLine(i);
  }

  removeLine(i: number) { this.lines.removeAt(i); this.recalculate(); }

  onProductSelect(i: number, event: any) {
    const product = this.products.find(p => p.id === event.value);
    if (product) {
      const price = this.isBonSortie ? product.purchasePrice : product.sellingPrice;
      this.lines.at(i).patchValue({ description: product.name, unitPrice: price });
      this.recalculateLine(i);
    }
  }

  onBundleSelect(i: number, event: any) {
    const bundle = this.bundles.find(b => b.id === event.value);
    if (bundle) {
      this.lines.at(i).patchValue({ description: bundle.name, unitPrice: bundle.sellingPrice });
      this.recalculateLine(i);
    }
  }

  recalculateLine(i: number) {
    const line = this.lines.at(i).value;
    const total = (line.quantity || 0) * (line.unitPrice || 0) * (1 - (line.discountPercent || 0) / 100);
    this.lines.at(i).patchValue({ totalHT: total }, { emitEvent: false });
    this.recalculate();
  }

  recalculate() {
    this.totalHT      = this.lines.controls.reduce((sum, l) => sum + (l.value.totalHT || 0), 0);
    const discountPct = this.form.get('globalDiscount')?.value || 0;
    const discountAmt = this.totalHT * discountPct / 100;
    const netHT       = this.totalHT - discountAmt;
    const tax         = this.form.get('taxRate')?.value || 0;
    this.totalTVA     = netHT * tax / 100;
    const stamp       = this.form.get('stampDuty')?.value || 0;
    this.totalTTC     = netHT + this.totalTVA + stamp;
  }

  getLineTotal(i: number): number { return this.lines.at(i).value.totalHT || 0; }

  patchForm(inv: any) {
    const isBs = inv.type === 'DEVIS';
    const cid = this.form.get('customerId')!;
    const sid = this.form.get('supplierId')!;
    if (isBs) {
      cid.clearValidators(); cid.updateValueAndValidity();
      sid.setValidators(Validators.required); sid.updateValueAndValidity();
    }
    this.form.patchValue({
      type: inv.type, date: new Date(inv.date),
      dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
      customerId: isBs ? null : inv.customerId,
      supplierId: isBs ? inv.supplierId : null,
      taxRate: inv.taxRate, notes: inv.notes,
      stampDuty: inv.stampDuty || 0,
      globalDiscount: inv.globalDiscount || 0,
      driverName: inv.driverName || '', truckPlate: inv.truckPlate || ''
    });
    inv.lines?.forEach((l: any) => {
      this.lines.push(this.fb.group({
        _lineType: ['PRODUCT'], productId: [l.productId], description: [l.description],
        dimension: [l.dimension || ''], quantity: [l.quantity], unitPrice: [l.unitPrice],
        discountPercent: [l.discountPercent || 0], totalHT: [l.totalHT]
      }));
    });
    this.recalculate();
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;
    const isBs = val.type === 'DEVIS';
    const payload = {
      ...val,
      date:       this.formatDate(val.date),
      dueDate:    val.dueDate ? this.formatDate(val.dueDate) : null,
      customerId: isBs ? null : val.customerId,
      supplierId: isBs ? val.supplierId : null,
      lines:      val.lines.map(({ _lineType, ...rest }: any) => ({
        ...rest,
        productId: _lineType === 'BUNDLE' ? null : rest.productId
      }))
    };
    const obs = this.id ? this.api.updateInvoice(this.id, payload) : this.api.createInvoice(payload);
    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', detail: 'Document enregistré' });
        this.router.navigate(['/invoices']);
      },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  print() { if (this.currentInvoice) { this.printer.print(this.currentInvoice); } }

  private formatDate(d: Date): string { return d.toISOString().split('T')[0]; }
}
