import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { Invoice, PurchaseOrder } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

interface JourCloture {
  date: string;
  dateLabel: string;
  bls: Invoice[];
  totalTTC: number;
  count: number;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, InputTextModule,
    TabViewModule, ConfirmDialogModule, ToastModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-copy"></i>Tous les documents</h2>
      <div class="header-actions">
        <p-button label="Nouveau BL" icon="pi pi-file-plus" severity="success"
                  routerLink="/invoices/new" />
        <p-button label="Nouveau BC" icon="pi pi-shopping-cart" severity="info"
                  routerLink="/purchase-orders/new" />
      </div>
    </div>

    <div class="card-content">
      <p-tabView styleClass="doc-tabs">

        <!-- ── Clôture de Jour ── -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span><i class="pi pi-calendar mr-1"></i>Clôture de Jour
              <span class="tab-badge">{{ joursClosures.length }}</span>
            </span>
          </ng-template>

          <p-table [value]="joursClosures" dataKey="date"
                   [expandedRowKeys]="expandedRows"
                   [loading]="loadingInv"
                   styleClass="p-datatable-sm p-datatable-gridlines cloture-table">
            <ng-template pTemplate="header">
              <tr>
                <th style="width:3rem"></th>
                <th pSortableColumn="date">Date</th>
                <th>Nb. BL</th>
                <th>Total TTC du Jour</th>
                <th style="width:90px">Actions</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-jour let-expanded="expanded">
              <tr class="jour-row">
                <td>
                  <p-button [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                            [rounded]="true" [text]="true" severity="secondary"
                            (onClick)="toggleRow(jour.date)" />
                </td>
                <td>
                  <strong class="date-label">{{ jour.dateLabel }}</strong>
                </td>
                <td>
                  <span class="bl-count-badge">{{ jour.count }} BL</span>
                </td>
                <td>
                  <strong class="total-ttc">{{ jour.totalTTC | number:'1.3-3' }} DT</strong>
                </td>
                <td>
                  <div class="action-buttons">
                    <p-button icon="pi pi-expand" [rounded]="true" [text]="true"
                              severity="info" pTooltip="Voir les BL"
                              (onClick)="toggleRow(jour.date)" />
                    <p-button icon="pi pi-print" [rounded]="true" [text]="true"
                              severity="secondary" pTooltip="Imprimer clôture du jour"
                              (onClick)="printCloture(jour)" />
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="rowexpansion" let-jour>
              <tr>
                <td colspan="5" class="expansion-cell">
                  <div class="bl-expansion">
                    <div class="bl-expansion-header">
                      <span><i class="pi pi-list mr-1"></i>Bons de Livraison du {{ jour.dateLabel }}</span>
                      <span class="total-recap">Total : <strong>{{ jour.totalTTC | number:'1.3-3' }} DT</strong></span>
                    </div>

                    <p-table [value]="jour.bls"
                             styleClass="p-datatable-sm p-datatable-striped bl-subtable">
                      <ng-template pTemplate="header">
                        <tr>
                          <th pSortableColumn="number">Numéro</th>
                          <th pSortableColumn="customerName">Client</th>
                          <th>Total TTC</th>
                          <th>Statut</th>
                          <th style="width:160px">Actions</th>
                        </tr>
                      </ng-template>
                      <ng-template pTemplate="body" let-bl>
                        <tr>
                          <td><strong>{{ bl.number }}</strong></td>
                          <td>{{ bl.customerName || '—' }}</td>
                          <td>{{ bl.totalTTC | number:'1.3-3' }} DT</td>
                          <td>
                            <span [class]="'status-badge status-' + bl.status?.toLowerCase()">
                              {{ invStatusLabel(bl.status) }}
                            </span>
                          </td>
                          <td>
                            <div class="action-buttons">
                              <p-button icon="pi pi-pencil" [rounded]="true" [text]="true"
                                        severity="info" pTooltip="Modifier"
                                        [routerLink]="['/invoices', bl.id]" />
                              <p-button *ngIf="bl.status==='DRAFT'" icon="pi pi-send"
                                        [rounded]="true" [text]="true" severity="success"
                                        pTooltip="Envoyer"
                                        (onClick)="changeInvoiceStatus(bl,'SENT')" />
                              <p-button *ngIf="bl.status==='SENT'" icon="pi pi-check-circle"
                                        [rounded]="true" [text]="true" severity="success"
                                        pTooltip="Marquer réglé"
                                        (onClick)="changeInvoiceStatus(bl,'PAID')" />
                              <p-button icon="pi pi-print" [rounded]="true" [text]="true"
                                        severity="secondary" pTooltip="Imprimer BL"
                                        (onClick)="printInv(bl)" />
                              <p-button icon="pi pi-trash" [rounded]="true" [text]="true"
                                        severity="danger" pTooltip="Supprimer"
                                        (onClick)="deleteInvoice(bl)" />
                            </div>
                          </td>
                        </tr>
                      </ng-template>
                      <ng-template pTemplate="emptymessage">
                        <tr><td colspan="5" class="text-center text-muted" style="padding:1rem">
                          Aucun bon de livraison pour ce jour.
                        </td></tr>
                      </ng-template>
                    </p-table>
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5">
                <div class="empty-state">
                  <i class="pi pi-calendar empty-icon"></i>
                  <div class="empty-title">Aucune clôture de jour</div>
                  <div class="empty-sub">Créez votre premier bon de livraison</div>
                </div>
              </td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- ── Ventes ── -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span><i class="pi pi-file mr-1"></i>Ventes
              <span class="tab-badge">{{ invoices.length }}</span>
            </span>
          </ng-template>
          <p-table [value]="invoices" [loading]="loadingInv" [paginator]="true" [rows]="10"
                   [globalFilterFields]="['number','customerName','type']"
                   [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dtInv>
            <ng-template pTemplate="caption">
              <div class="caption-row">
                <input pInputText type="text"
                       (input)="dtInv.filterGlobal($any($event.target).value,'contains')"
                       placeholder="Rechercher numéro, client..." class="table-search" />
                <span class="item-count"><i class="pi pi-file" style="margin-right:4px"></i>{{ invoices.length }} document(s)</span>
              </div>
            </ng-template>
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="number">Numéro</th>
                <th class="hide-mobile">Type</th>
                <th class="hide-mobile" pSortableColumn="date">Date</th>
                <th pSortableColumn="customerName">Client</th>
                <th class="hide-mobile">Total TTC</th>
                <th>Statut</th>
                <th style="width:120px">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-inv>
              <tr>
                <td>
                  <strong>{{ inv.number }}</strong>
                  <div class="sub-info hide-desktop">{{ inv.date | date:'dd/MM/yy' }}</div>
                </td>
                <td class="hide-mobile">
                  <span class="type-chip">{{ typeLabel(inv.type) }}</span>
                </td>
                <td class="hide-mobile">{{ inv.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ inv.customerName }}</td>
                <td class="hide-mobile">{{ inv.totalTTC | number:'1.3-3' }} DT</td>
                <td>
                  <span [class]="'status-badge status-' + inv.status?.toLowerCase()">
                    {{ invStatusLabel(inv.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                              pTooltip="Modifier" [routerLink]="['/invoices', inv.id]" />
                    <p-button *ngIf="inv.status==='DRAFT'" icon="pi pi-send" [rounded]="true"
                              [text]="true" severity="success" pTooltip="Envoyer"
                              (onClick)="changeInvoiceStatus(inv,'SENT')" />
                    <p-button *ngIf="inv.status==='SENT' && inv.type==='FACTURE'" icon="pi pi-check-circle"
                              [rounded]="true" [text]="true" severity="success" pTooltip="Marquer payé"
                              (onClick)="changeInvoiceStatus(inv,'PAID')" />
                    <p-button icon="pi pi-print" [rounded]="true" [text]="true" severity="secondary"
                              pTooltip="Télécharger PDF" (onClick)="printInv(inv)" />
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                              pTooltip="Supprimer" (onClick)="deleteInvoice(inv)" />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7">
                <div class="empty-state">
                  <i class="pi pi-file empty-icon"></i>
                  <div class="empty-title">Aucun document de vente</div>
                  <div class="empty-sub">Créez votre première facture ou devis</div>
                </div>
              </td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- ── Achats ── -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span><i class="pi pi-shopping-cart mr-1"></i>Achats
              <span class="tab-badge">{{ orders.length }}</span>
            </span>
          </ng-template>
          <p-table [value]="orders" [loading]="loadingOrd" [paginator]="true" [rows]="10"
                   [globalFilterFields]="['number','supplierName']"
                   [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dtOrd>
            <ng-template pTemplate="caption">
              <div class="caption-row">
                <input pInputText type="text"
                       (input)="dtOrd.filterGlobal($any($event.target).value,'contains')"
                       placeholder="Rechercher numéro, fournisseur..." class="table-search" />
                <span class="item-count"><i class="pi pi-shopping-cart" style="margin-right:4px"></i>{{ orders.length }} commande(s)</span>
              </div>
            </ng-template>
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="number">Numéro</th>
                <th class="hide-mobile" pSortableColumn="date">Date</th>
                <th pSortableColumn="supplierName">Fournisseur</th>
                <th class="hide-mobile">Total TTC</th>
                <th>Statut</th>
                <th style="width:120px">Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-o>
              <tr>
                <td>
                  <strong>{{ o.number }}</strong>
                  <div class="sub-info hide-desktop">{{ o.date | date:'dd/MM/yy' }}</div>
                </td>
                <td class="hide-mobile">{{ o.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ o.supplierName }}</td>
                <td class="hide-mobile">{{ o.totalTTC | number:'1.3-3' }} DT</td>
                <td>
                  <span [class]="'status-badge status-' + o.status?.toLowerCase()">
                    {{ ordStatusLabel(o.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <p-button *ngIf="o.status==='DRAFT'" icon="pi pi-pencil" [rounded]="true"
                              [text]="true" severity="info" pTooltip="Modifier"
                              [routerLink]="['/purchase-orders', o.id]" />
                    <p-button *ngIf="o.status==='DRAFT'" icon="pi pi-send" [rounded]="true"
                              [text]="true" severity="info" pTooltip="Envoyer"
                              (onClick)="changeOrderStatus(o,'SENT')" />
                    <p-button *ngIf="o.status==='SENT'" icon="pi pi-check" [rounded]="true"
                              [text]="true" severity="success" pTooltip="Marquer reçu"
                              (onClick)="changeOrderStatus(o,'RECEIVED')" />
                    <p-button *ngIf="o.status!=='RECEIVED'" icon="pi pi-trash" [rounded]="true"
                              [text]="true" severity="danger" pTooltip="Supprimer"
                              (onClick)="deleteOrder(o)" />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6">
                <div class="empty-state">
                  <i class="pi pi-shopping-cart empty-icon"></i>
                  <div class="empty-title">Aucun bon de commande</div>
                  <div class="empty-sub">Créez votre premier bon de commande fournisseur</div>
                </div>
              </td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

      </p-tabView>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .text-muted  { color: #7f8c8d; font-size: 0.88rem; }
    .text-center { text-align: center; }
    .sub-info    { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    .type-chip   { font-size: 0.78rem; background: #edf2fb; color: #3498db;
                   padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
    .tab-badge   { display: inline-flex; align-items: center; justify-content: center;
                   background: #3498db; color: white; border-radius: 10px;
                   font-size: 0.72rem; min-width: 18px; height: 18px;
                   padding: 0 4px; margin-left: 4px; vertical-align: middle; }

    /* Clôture de Jour styles */
    .jour-row td { background: #f8f9ff !important; }
    .date-label  { font-size: 0.95rem; color: #2c3e50; text-transform: capitalize; }
    .bl-count-badge {
      background: #e8f4fd; color: #2980b9;
      padding: 3px 10px; border-radius: 12px;
      font-size: 0.82rem; font-weight: 600;
    }
    .total-ttc { font-size: 1rem; color: #27ae60; }

    .expansion-cell { padding: 0 !important; background: #fff !important; }
    .bl-expansion {
      border-left: 4px solid #3498db;
      margin: 0;
      background: #fafcff;
    }
    .bl-expansion-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.6rem 1rem;
      background: #eaf3fb;
      font-size: 0.9rem;
      font-weight: 600;
      color: #2c3e50;
    }
    .total-recap { font-size: 0.9rem; color: #27ae60; }
    .bl-subtable { margin: 0; }

    :host ::ng-deep .bl-subtable .p-datatable-thead > tr > th {
      background: #f0f7ff !important;
      font-size: 0.82rem;
      padding: 0.4rem 0.75rem;
    }
    :host ::ng-deep .bl-subtable .p-datatable-tbody > tr > td {
      padding: 0.4rem 0.75rem;
      font-size: 0.88rem;
    }

    :host ::ng-deep .doc-tabs .p-tabview-nav { flex-wrap: wrap; }
    @media (max-width: 480px) {
      :host ::ng-deep .doc-tabs .p-tabview-nav li a { padding: 0.5rem; font-size: 0.82rem; }
      .header-actions { flex-direction: column; width: 100%; }
      .header-actions ::ng-deep .p-button { width: 100%; }
    }
    @media (min-width: 601px) { .hide-desktop { display: none; } }
  `]
})
export class DocumentsComponent implements OnInit {
  invoices: Invoice[] = [];
  orders: PurchaseOrder[] = [];
  joursClosures: JourCloture[] = [];
  expandedRows: { [key: string]: boolean } = {};
  loadingInv = true;
  loadingOrd = true;

  constructor(private api: ApiService, private msg: MessageService,
              private confirm: ConfirmationService, private printer: ThermalPrintService) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loadingInv = true; this.loadingOrd = true;
    this.api.getInvoices().subscribe({
      next: d => {
        this.invoices = d;
        this.joursClosures = this.buildJoursClosures(d);
        this.loadingInv = false;
      },
      error: () => { this.loadingInv = false; }
    });
    this.api.getPurchaseOrders().subscribe({
      next: d => { this.orders = d; this.loadingOrd = false; },
      error: () => { this.loadingOrd = false; }
    });
  }

  buildJoursClosures(invoices: Invoice[]): JourCloture[] {
    const bls = invoices.filter(i => i.type === 'BON_LIVRAISON');
    const map = new Map<string, Invoice[]>();

    for (const bl of bls) {
      const date = (bl.date || '').substring(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(bl);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, bls]) => ({
        date,
        dateLabel: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
        bls,
        totalTTC: bls.reduce((s, bl) => s + (bl.totalTTC || 0), 0),
        count: bls.length
      }));
  }

  toggleRow(date: string) {
    if (this.expandedRows[date]) {
      delete this.expandedRows[date];
    } else {
      this.expandedRows[date] = true;
    }
    this.expandedRows = { ...this.expandedRows };
  }

  printInv(inv: Invoice) { this.printer.print(inv); }

  printCloture(jour: JourCloture) { this.printer.printCloture(jour); }

  typeLabel(t?: string): string {
    return ({ FACTURE: 'Facture', DEVIS: 'Devis', BON_LIVRAISON: 'BL' } as any)[t ?? ''] ?? t ?? '';
  }

  invStatusLabel(s?: string): string {
    return ({ DRAFT: 'Brouillon', SENT: 'Envoyé', PAID: 'Payé', CANCELLED: 'Annulé' } as any)[s ?? ''] ?? s ?? '';
  }

  ordStatusLabel(s?: string): string {
    return ({ DRAFT: 'Brouillon', SENT: 'Envoyé', RECEIVED: 'Reçu', CANCELLED: 'Annulé' } as any)[s ?? ''] ?? s ?? '';
  }

  changeInvoiceStatus(inv: Invoice, status: string) {
    this.api.updateInvoiceStatus(inv.id!, status).subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Statut mis à jour' }); this.loadAll(); },
      error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
    });
  }

  changeOrderStatus(o: PurchaseOrder, status: string) {
    this.api.updatePurchaseOrderStatus(o.id!, status).subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Statut mis à jour' }); this.loadAll(); },
      error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
    });
  }

  deleteInvoice(inv: Invoice) {
    this.confirm.confirm({
      message: `Supprimer le document <strong>${inv.number}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteInvoice(inv.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.loadAll(); }
      })
    });
  }

  deleteOrder(o: PurchaseOrder) {
    this.confirm.confirm({
      message: `Supprimer le BC <strong>${o.number}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deletePurchaseOrder(o.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.loadAll(); }
      })
    });
  }
}
