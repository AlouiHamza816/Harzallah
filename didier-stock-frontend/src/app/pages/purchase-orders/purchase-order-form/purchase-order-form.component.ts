import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Product, Supplier } from '../../../core/models/models';
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
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule,
    InputNumberModule, DropdownModule, CalendarModule, ToastModule, InputTextareaModule, TableModule],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <h2><i class="pi pi-shopping-cart"></i>{{ id ? 'Modifier' : 'Nouveau' }} bon de commande</h2>
      <div class="header-actions">
        <p-button label="Retour" icon="pi pi-arrow-left" [text]="true" severity="secondary"
                  routerLink="/purchase-orders" />
        <p-button label="Enregistrer" icon="pi pi-save" (onClick)="save()" [loading]="saving" />
      </div>
    </div>

    <div class="card-content">
      <form [formGroup]="form">

        <div class="form-header-grid">
          <div class="field field-wide">
            <label>Fournisseur <span class="required">*</span></label>
            <p-dropdown formControlName="supplierId" [options]="suppliers"
                        optionLabel="name" optionValue="id" placeholder="-- Sélectionner --"
                        [filter]="true" filterBy="name" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>Date <span class="required">*</span></label>
            <p-calendar formControlName="date" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
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
        </div>

        <h3 class="lines-heading">Lignes de commande</h3>
        <div class="lines-wrapper">
          <table class="lines-table">
            <thead>
              <tr>
                <th>Produit / Description</th>
                <th class="col-num">Qté</th>
                <th class="col-num">Prix unit.</th>
                <th class="col-total">Total HT</th>
                <th class="col-del"></th>
              </tr>
            </thead>
            <tbody formArrayName="lines">
              <tr *ngFor="let line of lines.controls; let i = index" [formGroupName]="i">
                <td class="td-product">
                  <p-dropdown formControlName="productId" [options]="products"
                              optionLabel="name" optionValue="id" placeholder="Choisir produit"
                              [filter]="true" filterBy="name" styleClass="w-full"
                              appendTo="body" (onChange)="onProductSelect(i, $event)" />
                  <input pInputText formControlName="description" placeholder="Description"
                         class="w-full mt-1 desc-input" />
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
                <td class="col-total">{{ getLineTotal(i) | number:'1.3-3' }}</td>
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
            <strong>{{ totalHT | number:'1.3-3' }} DT</strong>
          </div>
          <div class="total-row">
            <span>TVA ({{ form.get('taxRate')?.value }}%)</span>
            <strong>{{ totalTVA | number:'1.3-3' }} DT</strong>
          </div>
          <div class="total-row total-ttc">
            <span>Total TTC</span>
            <strong>{{ totalTTC | number:'1.3-3' }} DT</strong>
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
      grid-template-columns: repeat(2, 1fr);
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
    .lines-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 480px; }
    .lines-table thead th {
      background: #f8f9fa; padding: 0.5rem 0.5rem;
      text-align: left; border-bottom: 2px solid #dee2e6; white-space: nowrap;
    }
    .lines-table tbody td { padding: 0.3rem 0.5rem; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
    .td-product { min-width: 220px; }
    .col-num   { width: 120px; }
    .col-total { width: 120px; text-align: right; font-weight: 600; padding-right: 0.75rem; }
    .col-del   { width: 44px; }
    .desc-input { font-size: 0.82rem; }

    .totals-box {
      max-width: 340px; margin: 1.25rem 0 0 auto;
      border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;
    }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.55rem 1rem; border-bottom: 1px solid #dee2e6;
    }
    .total-ttc { background: #2c3e50; color: white; font-size: 1.05rem; border-bottom: none; }

    @media (max-width: 600px) {
      .form-header-grid { grid-template-columns: 1fr; }
      .field-wide { grid-column: span 1; }
      .totals-box { max-width: 100%; }
    }
  `]
})
export class PurchaseOrderFormComponent implements OnInit {
  form: FormGroup;
  suppliers: Supplier[] = [];
  products: Product[] = [];
  id?: number;
  saving = false;
  totalHT = 0; totalTVA = 0; totalTTC = 0;

  constructor(private fb: FormBuilder, private api: ApiService,
              private route: ActivatedRoute, private router: Router,
              private msg: MessageService) {
    this.form = this.fb.group({
      supplierId: [null, Validators.required],
      date:       [new Date(), Validators.required],
      taxRate:    [19.000],
      notes:      [''],
      lines:      this.fb.array([])
    });
  }

  ngOnInit() {
    this.api.getSuppliers().subscribe(s => this.suppliers = s);
    this.api.getProducts().subscribe(p => this.products = p.filter(pr => pr.active));
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = +idParam;
      this.api.getPurchaseOrder(this.id).subscribe(po => this.patchForm(po));
    } else {
      this.addLine();
    }
  }

  get lines() { return this.form.get('lines') as FormArray; }

  addLine() {
    this.lines.push(this.fb.group({
      productId: [null], description: [''], quantity: [1], unitPrice: [0], totalHT: [0]
    }));
  }

  removeLine(i: number) { this.lines.removeAt(i); this.recalculate(); }

  onProductSelect(i: number, event: any) {
    const product = this.products.find(p => p.id === event.value);
    if (product) {
      this.lines.at(i).patchValue({ description: product.name, unitPrice: product.purchasePrice });
      this.recalculateLine(i);
    }
  }

  recalculateLine(i: number) {
    const line = this.lines.at(i).value;
    const total = (line.quantity || 0) * (line.unitPrice || 0);
    this.lines.at(i).patchValue({ totalHT: total }, { emitEvent: false });
    this.recalculate();
  }

  recalculate() {
    this.totalHT  = this.lines.controls.reduce((sum, l) => sum + (l.value.totalHT || 0), 0);
    const tax     = this.form.get('taxRate')?.value || 0;
    this.totalTVA = this.totalHT * tax / 100;
    this.totalTTC = this.totalHT + this.totalTVA;
  }

  getLineTotal(i: number): number { return this.lines.at(i).value.totalHT || 0; }

  patchForm(po: any) {
    this.form.patchValue({
      supplierId: po.supplierId,
      date:       new Date(po.date),
      taxRate:    po.taxRate,
      notes:      po.notes
    });
    po.lines?.forEach((l: any) => {
      this.lines.push(this.fb.group({
        productId: [l.productId], description: [l.description],
        quantity: [l.quantity], unitPrice: [l.unitPrice], totalHT: [l.totalHT]
      }));
    });
    this.recalculate();
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;
    const payload = { ...val, date: this.formatDate(val.date) };
    const obs = this.id
      ? this.api.updatePurchaseOrder(this.id, payload)
      : this.api.createPurchaseOrder(payload);
    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', detail: 'Bon de commande enregistré' });
        this.router.navigate(['/purchase-orders']);
      },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  private formatDate(d: Date): string { return d.toISOString().split('T')[0]; }
}
