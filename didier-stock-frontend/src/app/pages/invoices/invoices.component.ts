import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { Invoice } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TableModule, ButtonModule, InputTextModule,
    CalendarModule, ConfirmDialogModule, ToastModule, TabViewModule, DropdownModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-file"></i>Documents de vente</h2>
      <p-button label="Nouveau document" icon="pi pi-plus" routerLink="/invoices/new" />
    </div>

    <div class="card-content">
      <p-tabView styleClass="inv-tabs">
        <p-tabPanel header="Bons de livraison">
          <ng-template [ngTemplateOutlet]="invoiceTable" [ngTemplateOutletContext]="{items:getByType('BON_LIVRAISON')}" />
        </p-tabPanel>
        <p-tabPanel header="Factures">
          <ng-template [ngTemplateOutlet]="invoiceTable" [ngTemplateOutletContext]="{items:getByType('FACTURE')}" />
        </p-tabPanel>
        <p-tabPanel header="Devis">
          <ng-template [ngTemplateOutlet]="invoiceTable" [ngTemplateOutletContext]="{items:getByType('DEVIS')}" />
        </p-tabPanel>
      </p-tabView>
    </div>

    <ng-template #invoiceTable let-items="items">
      <p-table [value]="filterItems(items)" [loading]="loading" [paginator]="true" [rows]="10"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines"
               sortField="date" [sortOrder]="-1">
        <ng-template pTemplate="caption">
          <div class="filters-bar">
            <input pInputText type="text" [(ngModel)]="searchText"
                   placeholder="Rechercher par client ou numéro..." class="table-search filter-input" />
            <p-calendar [(ngModel)]="dateFrom" dateFormat="dd/mm/yy" placeholder="Date début"
                        [showClear]="true" styleClass="filter-cal" appendTo="body" />
            <p-calendar [(ngModel)]="dateTo" dateFormat="dd/mm/yy" placeholder="Date fin"
                        [showClear]="true" styleClass="filter-cal" appendTo="body" />
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="number">Numéro <p-sortIcon field="number" /></th>
            <th class="hide-mobile" pSortableColumn="date">Date <p-sortIcon field="date" /></th>
            <th pSortableColumn="customerName">Client <p-sortIcon field="customerName" /></th>
            <th class="hide-mobile">Total TTC</th>
            <th>Statut</th>
            <th style="width:160px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-inv>
          <tr>
            <td>
              <strong>{{ inv.number }}</strong>
              <div class="sub-info hide-desktop">{{ inv.date | date:'dd/MM/yy' }} — {{ inv.totalTTC | number:'1.0-0' }} DT</div>
            </td>
            <td class="hide-mobile">{{ inv.date | date:'dd/MM/yyyy' }}</td>
            <td>
              {{ inv.customerName }}
              <div *ngIf="inv.customerAddress" class="sub-info">{{ inv.customerAddress }}</div>
            </td>
            <td class="hide-mobile">{{ inv.totalTTC | number:'1.0-0' }} DT</td>
            <td>
              <span [class]="'status-badge status-' + inv.status?.toLowerCase()">
                {{ statusLabel(inv.status) }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" [routerLink]="['/invoices', inv.id]" />
                <p-button *ngIf="inv.status==='DRAFT'" icon="pi pi-send" [rounded]="true" [text]="true"
                          severity="warning" pTooltip="Envoyer" (onClick)="changeStatus(inv,'SENT')" />
                <p-button *ngIf="inv.status==='SENT' && inv.type==='FACTURE'" icon="pi pi-check-circle"
                          [rounded]="true" [text]="true" severity="success"
                          pTooltip="Marquer réglé" (onClick)="changeStatus(inv,'PAID')" />
                <p-button icon="pi pi-print" [rounded]="true" [text]="true" severity="secondary"
                          pTooltip="Télécharger PDF" (onClick)="print(inv)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(inv)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-file empty-icon"></i>
              <div class="empty-title">Aucun document trouvé</div>
              <div class="empty-sub">Créez un nouveau document ou modifiez vos filtres</div>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </ng-template>
  `,
  styles: [`
    .text-muted  { color: #7f8c8d; font-size: 0.88rem; }
    .text-center { text-align: center; }
    .sub-info    { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    @media (min-width: 601px) { .hide-desktop { display: none; } }

    .filters-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .filter-input { flex: 1 1 180px; min-width: 140px; }
    :host ::ng-deep .filter-cal { flex: 1 1 140px; min-width: 120px; }
    :host ::ng-deep .filter-cal .p-inputtext { width: 100%; }

    :host ::ng-deep .inv-tabs .p-tabview-nav { flex-wrap: wrap; }
    :host ::ng-deep .inv-tabs .p-tabview-nav li { flex: 1 1 auto; text-align: center; }
    @media (max-width: 480px) {
      :host ::ng-deep .inv-tabs .p-tabview-nav li a { padding: 0.5rem 0.5rem; font-size: 0.82rem; }
      .filters-bar { flex-direction: column; }
    }
  `]
})
export class InvoicesComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  searchText = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  constructor(private api: ApiService, private msg: MessageService,
              private confirm: ConfirmationService, private printer: ThermalPrintService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getInvoices().subscribe({
      next: d => { this.invoices = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getByType(type: string) { return this.invoices.filter(i => i.type === type); }

  filterItems(items: Invoice[]): Invoice[] {
    const q = this.searchText.toLowerCase().trim();
    return items.filter(inv => {
      if (q && !inv.number?.toLowerCase().includes(q) && !inv.customerName?.toLowerCase().includes(q)) return false;
      const d = inv.date ? new Date(inv.date) : null;
      if (this.dateFrom && d && d < this.dateFrom) return false;
      if (this.dateTo && d) { const to = new Date(this.dateTo); to.setHours(23,59,59); if (d > to) return false; }
      return true;
    });
  }

  print(inv: Invoice) { this.printer.print(inv); }

  statusLabel(s?: string): string {
    const map: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Envoyé', PAID: 'Réglé', CANCELLED: 'Annulé' };
    return map[s ?? ''] ?? s ?? '';
  }

  changeStatus(inv: Invoice, status: string) {
    this.api.updateInvoiceStatus(inv.id!, status).subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Statut mis à jour' }); this.load(); },
      error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
    });
  }

  delete(inv: Invoice) {
    this.confirm.confirm({
      message: `Supprimer le document <strong>${inv.number}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteInvoice(inv.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
