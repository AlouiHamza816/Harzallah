import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';

interface CatalogItem {
  id: number;
  type: 'product' | 'bundle';
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  bundleItems?: { productId: number; productName: string; quantity: number }[];
}

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ButtonModule, DropdownModule,
    InputNumberModule, InputTextModule, InputTextareaModule, CalendarModule,
    ToastModule, DividerModule
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-right" />

    <!-- TOP BAR -->
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-icon"><i class="pi pi-box"></i></div>
          <div>
            <div class="brand-name">{{ settings?.companyName || 'Didier Stock' }}</div>
            <div class="brand-sub">Portail de facturation client</div>
          </div>
        </div>
        <div class="brand-badge">DÉMO</div>
      </div>
    </header>

    <main class="page-main">

      <!-- ── NEW INVOICE CARD ── -->
      <section class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon bg-blue"><i class="pi pi-file-edit"></i></div>
            <div>
              <div class="card-title">{{ editingInvoiceId ? 'Modifier le document' : 'Créer un document' }}</div>
              <div class="card-desc">Facture, devis ou bon de livraison</div>
            </div>
          </div>
        </div>

        <form [formGroup]="form" class="invoice-form">

          <!-- Header fields -->
          <div class="form-grid-4">
            <div class="field">
              <label class="field-label">Type <span class="req">*</span></label>
              <p-dropdown formControlName="type" [options]="typeOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
            <div class="field">
              <label class="field-label">Client <span class="req">*</span></label>
              <p-dropdown formControlName="customerId" [options]="customers"
                          optionLabel="name" optionValue="id" placeholder="Choisir un client existant..."
                          [filter]="true" filterBy="name" [showClear]="true"
                          styleClass="w-full" appendTo="body"
                          (onChange)="onCustomerSelect($event)" />
              <input pInputText formControlName="passengerName"
                     placeholder="...ou saisir un nom (client de passage)" class="w-full customer-name-field"
                     (input)="onPassengerNameInput()" />
              <ng-container *ngIf="!hasSelectedCustomer">
                <input pInputText formControlName="passengerAddress"
                       placeholder="Adresse (optionnel)" class="w-full customer-extra-field" />
                <input pInputText formControlName="passengerNif"
                       placeholder="Matricule fiscal (optionnel)" class="w-full customer-extra-field" />
              </ng-container>
            </div>
            <div class="field">
              <label class="field-label">Date <span class="req">*</span></label>
              <p-calendar formControlName="date" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
            </div>
            <div class="field">
              <label class="field-label">Taux TVA (%)</label>
              <p-inputNumber formControlName="taxRate" [min]="0" [max]="100"
                             [minFractionDigits]="2" suffix=" %" styleClass="w-full"
                             (onInput)="recalculate()" />
            </div>
            <div class="field field-full">
              <label class="field-label">Notes</label>
              <textarea pTextarea formControlName="notes" rows="2" class="w-full notes-input" placeholder="Remarques éventuelles..."></textarea>
            </div>
          </div>

          <!-- Lines -->
          <div class="lines-section">
            <div class="lines-header">
              <span class="lines-title"><i class="pi pi-list"></i> Lignes du document</span>
            </div>

            <div class="lines-scroll">
              <table class="lines-table">
                <thead>
                  <tr>
                    <th class="th-item">Article / Description</th>
                    <th class="th-dim">DIM</th>
                    <th class="th-num">Qté</th>
                    <th class="th-num">Prix unit.</th>
                    <th class="th-disc">Remise %</th>
                    <th class="th-total">Total HT</th>
                    <th class="th-del"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of lines.controls; let i = index" [formGroupName]="i" class="line-row">
                    <td class="td-item">
                      <p-dropdown formControlName="catalogItemId" [options]="catalogItems"
                                  optionLabel="name" optionValue="id"
                                  placeholder="Choisir article..." [filter]="true" filterBy="name"
                                  styleClass="w-full" appendTo="body"
                                  (onChange)="onItemSelect(i, $event)">
                        <ng-template pTemplate="item" let-item>
                          <span [class]="'catalog-opt ' + item.type">
                            <i [class]="item.type === 'bundle' ? 'pi pi-th-large' : 'pi pi-tag'"></i>
                            {{ item.name }}
                          </span>
                        </ng-template>
                      </p-dropdown>
                      <input pInputText formControlName="description" placeholder="Description libre..."
                             class="w-full desc-field" />
                    </td>
                    <td class="td-dim">
                      <input pInputText formControlName="dimension" placeholder="ex: 2.20/2.80"
                             class="w-full dim-field" />
                    </td>
                    <td class="td-num">
                      <p-inputNumber formControlName="quantity" [min]="0.001"
                                     [minFractionDigits]="0" [maxFractionDigits]="3"
                                     styleClass="w-full" (onInput)="recalculateLine(i)" />
                    </td>
                    <td class="td-num">
                      <p-inputNumber formControlName="unitPrice" [min]="0"
                                     [minFractionDigits]="0" [maxFractionDigits]="3"
                                     styleClass="w-full" (onInput)="recalculateLine(i)" />
                    </td>
                    <td class="td-disc">
                      <p-inputNumber formControlName="discountPercent" [min]="0" [max]="100"
                                     styleClass="w-full" (onInput)="recalculateLine(i)" />
                    </td>
                    <td class="td-total">{{ getLineTotal(i) | number:'1.0-3' }}</td>
                    <td class="td-del">
                      <button type="button" class="btn-del-line" (click)="removeLine(i)" title="Supprimer">
                        <i class="pi pi-trash"></i>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="lines.length === 0" class="empty-line-row">
                    <td colspan="7" class="empty-lines-msg">
                      <i class="pi pi-inbox"></i> Aucune ligne — cliquez sur "Ajouter une ligne"
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="add-line-footer">
              <button type="button" class="btn-add-line" (click)="addLine()">
                <i class="pi pi-plus"></i> Ajouter une ligne
              </button>
            </div>

            <!-- Timbre + Remise sous les lignes -->
            <div class="stamp-remise-row">
              <div class="stamp-remise-field">
                <label class="field-label">Timbre fiscal</label>
                <p-inputNumber formControlName="stampDuty" [min]="0"
                               [minFractionDigits]="3" [maxFractionDigits]="3"
                               styleClass="stamp-duty-input" (onInput)="recalculate()" />
              </div>
              <div class="stamp-remise-field">
                <label class="field-label">Remise globale (%)</label>
                <p-inputNumber formControlName="globalDiscount" [min]="0" [max]="100"
                               [minFractionDigits]="2" [maxFractionDigits]="2" suffix=" %"
                               styleClass="stamp-duty-input" (onInput)="recalculate()" />
              </div>
            </div>

            <!-- Totals -->
            <div class="totals-area">
              <div class="totals-box">
                <div class="total-row">
                  <span>Total HT</span>
                  <span class="total-val">{{ totalHT | number:'1.0-3' }} {{ currency }}</span>
                </div>
                <div class="total-row" *ngIf="(form.get('globalDiscount')?.value || 0) > 0">
                  <span>Remise ({{ form.get('globalDiscount')?.value }}%)</span>
                  <span class="total-val">- {{ totalHT * (form.get('globalDiscount')?.value || 0) / 100 | number:'1.0-3' }} {{ currency }}</span>
                </div>
                <div class="total-row">
                  <span>TVA {{ form.get('taxRate')?.value }}%</span>
                  <span class="total-val">{{ totalTVA | number:'1.0-3' }} {{ currency }}</span>
                </div>
                <div class="total-row">
                  <span>Timbre fiscal</span>
                  <span class="total-val">{{ (form.get('stampDuty')?.value || 0) | number:'1.0-3' }} {{ currency }}</span>
                </div>
                <div class="total-row total-ttc">
                  <span>Total TTC</span>
                  <span class="total-val-big">{{ totalTTC | number:'1.0-3' }} {{ currency }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Save button -->
          <div class="form-footer">
            <button *ngIf="editingInvoiceId" type="button" class="btn-cancel" (click)="cancelEdit()">
              <i class="pi pi-times"></i> Annuler
            </button>
            <button type="button" class="btn-save" (click)="save()" [disabled]="saving">
              <i class="pi" [class.pi-spin]="saving" [class.pi-spinner]="saving" [class.pi-save]="!saving"></i>
              {{ saving ? 'Enregistrement...' : (editingInvoiceId ? 'Mettre à jour' : 'Enregistrer le document') }}
            </button>
          </div>

        </form>
      </section>

      <!-- ── INVOICE LIST CARD ── -->
      <section class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon bg-indigo"><i class="pi pi-list"></i></div>
            <div>
              <div class="card-title">Documents récents</div>
              <div class="card-desc">{{ invoices.length }} document(s) enregistré(s)</div>
            </div>
          </div>
          <button class="btn-refresh" (click)="loadInvoices()" title="Actualiser">
            <i class="pi pi-refresh"></i>
          </button>
        </div>

        <div *ngIf="invoices.length === 0" class="empty-state">
          <i class="pi pi-file-o empty-icon"></i>
          <p>Aucun document pour le moment.</p>
          <p class="empty-hint">Créez votre première facture ci-dessus.</p>
        </div>

        <div class="inv-list" *ngIf="invoices.length > 0">
          <div class="inv-row" *ngFor="let inv of invoices">
            <div class="inv-row-main">
              <div class="inv-number">{{ inv.number }}</div>
              <div class="inv-type-badge" [class]="'type-' + inv.type?.toLowerCase()">
                {{ typeLabel(inv.type) }}
              </div>
              <div class="inv-customer"><i class="pi pi-user"></i> {{ inv.customerName }}</div>
              <div class="inv-date"><i class="pi pi-calendar"></i> {{ inv.date | date:'dd/MM/yyyy' }}</div>
              <div class="inv-amount">{{ inv.totalTTC | number:'1.0-3' }} {{ currency }}</div>
              <div class="inv-status">
                <span [class]="'status-chip status-' + inv.status?.toLowerCase()">
                  {{ statusLabel(inv.status) }}
                </span>
              </div>
            </div>
            <div class="inv-row-actions">
              <button class="btn-action btn-edit"
                      (click)="loadForEdit(inv)">
                <i class="pi pi-pencil"></i>
                Modifier
              </button>
              <button *ngIf="inv.status === 'DRAFT'" class="btn-action btn-send"
                      (click)="changeStatus(inv, 'SENT')" [disabled]="inv['_loading']">
                <i class="pi" [class.pi-ban]="!inv['_loading']" [class.pi-spin]="inv['_loading']" [class.pi-spinner]="inv['_loading']"></i>
                Impayé
              </button>
              <button *ngIf="inv.status === 'SENT'" class="btn-action btn-pay"
                      (click)="changeStatus(inv, 'PAID')" [disabled]="inv['_loading']">
                <i class="pi" [class.pi-check-circle]="!inv['_loading']" [class.pi-spin]="inv['_loading']" [class.pi-spinner]="inv['_loading']"></i>
                Marquer payé
              </button>
              <button *ngIf="inv.status === 'SENT'" class="btn-action btn-print"
                      (click)="printer.print(inv)">
                <i class="pi pi-print"></i>
                Imprimer PDF
              </button>
              <button *ngIf="inv.status === 'PAID'" class="btn-action btn-print"
                      (click)="printer.print(inv)">
                <i class="pi pi-print"></i>
                Imprimer PDF
              </button>
            </div>
          </div>
        </div>
      </section>

    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #f1f5f9; font-family: 'Segoe UI', system-ui, sans-serif; }

    /* ── TOPBAR ── */
    .topbar {
      background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 60%, #2563eb 100%);
      padding: 0.9rem 2rem;
      box-shadow: 0 2px 12px rgba(30,64,175,0.3);
    }
    .topbar-inner { max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; gap: 0.85rem; align-items: center; }
    .brand-icon {
      width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; color: #fff;
    }
    .brand-name { font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .brand-sub { font-size: 0.72rem; color: #93c5fd; margin-top: 1px; }
    .brand-badge {
      background: rgba(255,255,255,0.18); color: #fff;
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em;
      padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.3);
    }

    /* ── PAGE LAYOUT ── */
    .page-main { max-width: 1100px; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

    /* ── CARDS ── */
    .card { background: #fff; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05); overflow: hidden; }

    .card-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.1rem 1.5rem; border-bottom: 1px solid #f1f5f9;
      background: #fafbff;
    }
    .card-header-left { display: flex; gap: 0.85rem; align-items: center; }
    .card-icon {
      width: 38px; height: 38px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; color: #fff; flex-shrink: 0;
    }
    .bg-blue   { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
    .bg-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }
    .card-title { font-size: 0.95rem; font-weight: 700; color: #1e293b; }
    .card-desc  { font-size: 0.75rem; color: #94a3b8; margin-top: 1px; }

    .btn-refresh {
      background: none; border: 1px solid #e2e8f0; border-radius: 7px;
      padding: 6px 10px; cursor: pointer; color: #64748b; transition: all 0.15s;
    }
    .btn-refresh:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }

    /* ── FORM ── */
    .invoice-form { padding: 1.25rem 1.5rem; }
    .form-grid-4 {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.25rem;
    }
    .field-full { grid-column: 1 / -1; }
    .field-label { display: block; margin-bottom: 0.35rem; font-size: 0.8rem; font-weight: 600; color: #475569; }
    .req { color: #ef4444; }
    .notes-input { font-size: 0.85rem; resize: vertical; }
    .stamp-remise-row { display: flex; gap: 2rem; align-items: flex-end; margin: 0.75rem 0 0.5rem; }
    .stamp-remise-field { display: flex; flex-direction: column; gap: 0.3rem; }
    :host ::ng-deep .stamp-duty-input .p-inputnumber-input { width: 130px; }
    .customer-name-field { font-size: 0.83rem; margin-top: 6px; }
    .customer-extra-field { font-size: 0.78rem; margin-top: 6px; color: #64748b; }

    /* ── LINES ── */
    .lines-section { margin-top: 0.25rem; }
    .lines-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.75rem;
    }
    .lines-title { font-size: 0.88rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.4rem; }
    .lines-title i { color: #6366f1; }

    .btn-add-line {
      display: flex; align-items: center; gap: 0.35rem;
      background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
      padding: 6px 14px; border-radius: 7px; font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-add-line:hover { background: #dbeafe; border-color: #93c5fd; }

    .lines-scroll { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; }
    .lines-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; min-width: 700px; }
    .lines-table thead tr { background: #f8fafc; }
    .lines-table thead th {
      padding: 0.6rem 0.75rem; text-align: left;
      font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }
    .lines-table tbody .line-row td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .lines-table tbody .line-row:last-child td { border-bottom: none; }
    .lines-table tbody .line-row:hover { background: #fafbff; }

    .th-item { min-width: 240px; }
    .th-dim { width: 100px; }
    .th-num { width: 110px; }
    .th-disc { width: 90px; }
    .th-total { width: 110px; text-align: right; }
    .th-del { width: 40px; }

    .td-item { min-width: 240px; }
    .td-dim { width: 100px; vertical-align: middle !important; }
    .td-num { width: 110px; }
    .td-disc { width: 90px; }
    .td-total { width: 110px; text-align: right; font-weight: 700; color: #1e293b; padding-right: 0.75rem !important; vertical-align: middle !important; }
    .td-del { width: 40px; vertical-align: middle !important; text-align: center; }

    .desc-field { font-size: 0.78rem; margin-top: 4px; color: #64748b; }
    .dim-field { font-size: 0.83rem; }
    .catalog-opt { display: flex; align-items: center; gap: 6px; font-size: 0.83rem; }
    .catalog-opt.bundle { color: #7c3aed; }
    .catalog-opt.product { color: #1d4ed8; }

    .btn-del-line {
      background: none; border: none; cursor: pointer; padding: 6px;
      color: #cbd5e1; border-radius: 6px; transition: all 0.15s;
    }
    .btn-del-line:hover { color: #ef4444; background: #fef2f2; }

    .empty-line-row td { padding: 1.5rem !important; text-align: center; color: #94a3b8; font-style: italic; font-size: 0.85rem; }
    .empty-line-row i { margin-right: 0.4rem; }

    .add-line-footer { margin-top: 0.6rem; }

    /* ── TOTALS ── */
    .totals-area { display: flex; justify-content: flex-end; margin-top: 1rem; }
    .totals-box {
      width: 300px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.55rem 1rem; border-bottom: 1px solid #e2e8f0;
      font-size: 0.85rem; color: #475569;
    }
    .total-val { font-weight: 600; color: #1e293b; }
    .total-ttc {
      background: linear-gradient(135deg, #1e40af, #2563eb); color: #fff;
      border-bottom: none; padding: 0.75rem 1rem;
    }
    .total-ttc span { color: #fff !important; font-weight: 700; }
    .total-val-big { font-size: 1.05rem; font-weight: 800; color: #fff !important; }

    /* ── SAVE BUTTON ── */
    .form-footer { margin-top: 1.25rem; display: flex; justify-content: flex-end; }
    .btn-save {
      display: flex; align-items: center; gap: 0.5rem;
      background: linear-gradient(135deg, #16a34a, #15803d);
      color: #fff; border: none; border-radius: 9px;
      padding: 0.7rem 1.6rem; font-size: 0.9rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(22,163,74,0.3);
    }
    .btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(22,163,74,0.4); }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-cancel {
      display: flex; align-items: center; gap: 0.5rem;
      background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;
      border-radius: 9px; padding: 0.7rem 1.4rem; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-cancel:hover { background: #f1f5f9; border-color: #cbd5e1; }

    /* ── INVOICE LIST ── */
    .inv-list { padding: 0.5rem 0; }
    .inv-row {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
      padding: 0.85rem 1.5rem; border-bottom: 1px solid #f1f5f9; gap: 0.5rem;
      transition: background 0.1s;
    }
    .inv-row:last-child { border-bottom: none; }
    .inv-row:hover { background: #f8faff; }
    .inv-row-main { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; flex: 1; }
    .inv-number { font-weight: 800; font-size: 0.88rem; color: #1e40af; min-width: 110px; }
    .inv-type-badge {
      font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 5px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .type-facture    { background: #eff6ff; color: #1d4ed8; }
    .type-devis      { background: #f5f3ff; color: #6d28d9; }
    .type-bon_livraison { background: #ecfdf5; color: #065f46; }
    .inv-customer { font-size: 0.83rem; color: #334155; display: flex; align-items: center; gap: 0.3rem; }
    .inv-date     { font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 0.3rem; }
    .inv-amount   { font-weight: 700; font-size: 0.9rem; color: #1e293b; margin-left: auto; margin-right: 0.5rem; }
    .inv-status   { min-width: 80px; }

    .status-chip {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.03em;
    }
    .status-draft      { background: #fef9c3; color: #854d0e; }
    .status-sent       { background: #fff3e0; color: #e65100; }
    .status-paid       { background: #dcfce7; color: #166534; }
    .status-cancelled  { background: #fee2e2; color: #991b1b; }

    .inv-row-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-action {
      display: flex; align-items: center; gap: 0.35rem;
      border: none; border-radius: 7px; padding: 6px 14px;
      font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.15s;
    }
    .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-edit  { background: #fefce8; color: #854d0e; border: 1px solid #fde68a; }
    .btn-edit:hover { background: #fef9c3; }
    .btn-send  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .btn-send:hover:not(:disabled)  { background: #dbeafe; }
    .btn-pay   { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .btn-pay:hover:not(:disabled)   { background: #dcfce7; }
    .btn-print { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border: none; box-shadow: 0 2px 6px rgba(124,58,237,0.3); }
    .btn-print:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(124,58,237,0.4); }

    /* ── EMPTY STATE ── */
    .empty-state { padding: 3rem; text-align: center; }
    .empty-icon { font-size: 3rem; color: #cbd5e1; display: block; margin-bottom: 0.75rem; }
    .empty-state p { color: #94a3b8; font-size: 0.9rem; margin: 0.25rem 0; }
    .empty-hint { font-size: 0.78rem !important; color: #cbd5e1 !important; }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .topbar { padding: 0.9rem 1.25rem; }
      .page-main { padding: 1rem; }
      .form-grid-4 { grid-template-columns: 1fr 1fr; }
      .invoice-form { padding: 1rem; }
    }
    @media (max-width: 600px) {
      .form-grid-4 { grid-template-columns: 1fr; }
      .field-full { grid-column: 1; }
      .totals-box { width: 100%; }
      .inv-row-main { gap: 0.5rem; }
      .inv-amount { margin-left: 0; }
    }
  `]
})
export class DemoComponent implements OnInit {
  private base = environment.apiUrl + '/public';

  form: FormGroup;
  customers: any[] = [];
  suppliers: any[] = [];
  catalogItems: CatalogItem[] = [];
  invoices: any[] = [];
  settings: any = null;
  currency = 'DT';
  saving = false;
  totalHT = 0; totalTVA = 0; totalTTC = 0;
  editingInvoiceId: number | null = null;

  get isBonSortie(): boolean { return false; }
  get hasSelectedCustomer(): boolean { return !!this.form.get('customerId')?.value; }

  typeOptions = [
    { label: 'Facture',          value: 'FACTURE' },
    { label: 'Devis',            value: 'DEVIS' },
    { label: 'Bon de livraison', value: 'BON_LIVRAISON' }
  ];

  constructor(private fb: FormBuilder, private http: HttpClient, private msg: MessageService,
              public printer: ThermalPrintService) {
    this.form = this.fb.group({
      type:          ['FACTURE', Validators.required],
      date:          [new Date(), Validators.required],
      customerId:      [null],
      supplierId:      [null],
      passengerName:   [''],
      passengerAddress:[''],
      passengerNif:    [''],
      taxRate:        [0],
      stampDuty:      [0],
      globalDiscount: [0],
      notes:          [''],
      lines:         this.fb.array([])
    });
  }

  ngOnInit() {

    this.http.get<any>(`${this.base}/settings`).subscribe({
      next: s => { this.settings = s; this.currency = s.currency === 'TND' ? 'DT' : (s.currency || 'DT'); this.printer.loadSettings(s); this.form.patchValue({ taxRate: s.taxRate }); this.recalculate(); },
      error: () => {}
    });
    this.http.get<any[]>(`${this.base}/customers`).subscribe({ next: c => this.customers = c, error: () => {} });
    this.http.get<any[]>(`${this.base}/suppliers`).subscribe({ next: s => this.suppliers = s, error: () => {} });
    this.loadCatalog();
    this.loadInvoices();
    this.addLine();
  }

  onCustomerSelect(event: any) {
    if (event.value) {
      this.form.patchValue({ passengerName: '', passengerAddress: '', passengerNif: '' }, { emitEvent: false });
    }
  }

  onPassengerNameInput() {
    const name = this.form.get('passengerName')!.value;
    if (name && name.trim()) {
      this.form.get('customerId')!.setValue(null, { emitEvent: false });
    }
  }

  loadCatalog() {
    this.http.get<any[]>(`${this.base}/products`).subscribe({
      next: products => {
        const productItems: CatalogItem[] = products.map(p => ({ id: p.id, type: 'product' as const, name: p.name, sellingPrice: p.sellingPrice, purchasePrice: p.purchasePrice }));
        this.http.get<any[]>(`${this.base}/bundles`).subscribe({
          next: bundles => {
            const bundleItems: CatalogItem[] = bundles.map(b => ({ id: -b.id, type: 'bundle' as const, name: '📦 ' + b.name, sellingPrice: b.sellingPrice, purchasePrice: b.sellingPrice, bundleItems: b.items }));
            this.catalogItems = [...productItems, ...bundleItems];
          },
          error: () => { this.catalogItems = productItems; }
        });
      },
      error: () => {}
    });
  }

  loadInvoices() {
    this.http.get<any[]>(`${this.base}/invoices`).subscribe({
      next: inv => {
        this.invoices = inv.sort((a, b) =>
          new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
        ).slice(0, 25);
      },
      error: () => {}
    });
  }

  get lines() { return this.form.get('lines') as FormArray; }

  addLine() {
    this.lines.push(this.fb.group({
      catalogItemId:   [null],
      productId:       [null],
      description:     [''],
      dimension:       [''],
      quantity:        [1],
      unitPrice:       [0],
      discountPercent: [0],
      totalHT:         [0]
    }));
  }

  removeLine(i: number) { this.lines.removeAt(i); this.recalculate(); }

  onItemSelect(i: number, event: any) {
    const selected = this.catalogItems.find(c => c.id === event.value);
    if (!selected) return;
    const isBundle = selected.type === 'bundle';
    const price = this.isBonSortie ? selected.purchasePrice : selected.sellingPrice;
    this.lines.at(i).patchValue({
      productId:   isBundle ? null : selected.id,
      description: isBundle ? selected.name.replace('📦 ', '') : selected.name,
      unitPrice:   price
    });
    this.recalculateLine(i);
  }

  recalculateLine(i: number) {
    const l = this.lines.at(i).value;
    const total = (l.quantity || 0) * (l.unitPrice || 0) * (1 - (l.discountPercent || 0) / 100);
    this.lines.at(i).patchValue({ totalHT: total }, { emitEvent: false });
    this.recalculate();
  }

  recalculate() {
    this.totalHT      = this.lines.controls.reduce((s, l) => s + (l.value.totalHT || 0), 0);
    const discountPct = this.form.get('globalDiscount')?.value || 0;
    const discountAmt = this.totalHT * discountPct / 100;
    const netHT       = this.totalHT - discountAmt;
    const tax         = this.form.get('taxRate')?.value || 0;
    const stamp       = this.form.get('stampDuty')?.value || 0;
    this.totalTVA     = netHT * tax / 100;
    this.totalTTC     = netHT + this.totalTVA + stamp;
  }

  getLineTotal(i: number): number { return this.lines.at(i).value.totalHT || 0; }

  loadForEdit(inv: any) {
    this.http.get<any>(`${this.base}/invoices/${inv.id}`).subscribe({
      next: data => {
        this.editingInvoiceId = data.id;
        this.form.patchValue({
          type: data.type,
          date: new Date(data.date),
          customerId: data.customerId || null,
          supplierId: data.supplierId || null,
          passengerName: data.passengerName || '',
          passengerAddress: data.passengerAddress || '',
          passengerNif: data.passengerNif || '',
          taxRate: data.taxRate,
          stampDuty: data.stampDuty || 0,
          globalDiscount: data.globalDiscount || 0,
          notes: data.notes || ''
        });
        while (this.lines.length) this.lines.removeAt(0);
        (data.lines || []).forEach((l: any) => {
          this.lines.push(this.fb.group({
            catalogItemId: [null],
            productId:     [l.productId || null],
            description:   [l.description || ''],
            dimension:     [l.dimension || ''],
            quantity:      [l.quantity],
            unitPrice:     [l.unitPrice],
            discountPercent:[l.discountPercent || 0],
            totalHT:       [l.totalHT || 0]
          }));
        });
        this.recalculate();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le document' })
    });
  }

  cancelEdit() {
    this.editingInvoiceId = null;
    this.form.patchValue({ customerId: null, supplierId: null, passengerName: '', passengerAddress: '', passengerNif: '', notes: '', type: 'FACTURE' });
    while (this.lines.length) this.lines.removeAt(0);
    this.addLine();
    this.totalHT = this.totalTVA = this.totalTTC = 0;
  }

  save() {
    if (!this.isBonSortie && !this.form.value.customerId && !this.form.value.passengerName?.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner un client ou saisir un nom.' });
      return;
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value;
    const payload = {
      type: val.type, date: this.fmtDate(val.date),
      customerId: this.isBonSortie ? null : (val.customerId || null),
      supplierId: this.isBonSortie ? val.supplierId : null,
      passengerName: this.isBonSortie ? null : (val.customerId ? null : (val.passengerName?.trim() || null)),
      passengerAddress: this.isBonSortie ? null : (val.customerId ? null : (val.passengerAddress?.trim() || null)),
      passengerNif: this.isBonSortie ? null : (val.customerId ? null : (val.passengerNif?.trim() || null)),
      taxRate: val.taxRate, stampDuty: val.stampDuty || 0, globalDiscount: val.globalDiscount || 0, notes: val.notes,
      lines: val.lines.map((l: any) => ({
        productId: l.productId || null, description: l.description, dimension: l.dimension || null,
        quantity: l.quantity, unitPrice: l.unitPrice,
        discountPercent: l.discountPercent || 0, totalHT: l.totalHT
      }))
    };
    const request$ = this.editingInvoiceId
      ? this.http.put<any>(`${this.base}/invoices/${this.editingInvoiceId}`, payload)
      : this.http.post<any>(`${this.base}/invoices`, payload);
    const successMsg = this.editingInvoiceId ? 'Document mis à jour !' : 'Document créé avec succès !';
    request$.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Succès', detail: successMsg });
        this.editingInvoiceId = null;
        this.form.patchValue({ customerId: null, supplierId: null, passengerName: '', passengerAddress: '', passengerNif: '', notes: '', type: 'FACTURE' });
        while (this.lines.length) this.lines.removeAt(0);
        this.addLine();
        this.totalHT = this.totalTVA = this.totalTTC = 0;
        this.saving = false;
        this.loadInvoices();
      },
      error: err => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur serveur' });
        this.saving = false;
      }
    });
  }

  changeStatus(inv: any, status: string) {
    inv['_loading'] = true;
    this.http.patch<any>(`${this.base}/invoices/${inv.id}/status`, null, { params: { status } }).subscribe({
      next: updated => { const idx = this.invoices.findIndex(i => i.id === inv.id); if (idx >= 0) this.invoices[idx] = { ...updated }; inv['_loading'] = false; },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur statut' }); inv['_loading'] = false; }
    });
  }

  statusLabel(s?: string): string {
    return ({ DRAFT: 'Brouillon', SENT: 'Impayé', PAID: 'Payé', CANCELLED: 'Annulé' } as any)[s || ''] || s || '';
  }

  typeLabel(t?: string): string {
    return ({ FACTURE: 'Facture', DEVIS: 'Devis', BON_LIVRAISON: 'Bon livraison' } as any)[t || ''] || t || '';
  }

  private fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
}
