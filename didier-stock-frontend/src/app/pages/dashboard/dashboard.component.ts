import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ThermalPrintService } from '../../core/services/thermal-print.service';
import { Dashboard } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableModule, TagModule, ProgressSpinnerModule, ButtonModule],
  template: `
    <div class="page-header">
      <h2><i class="pi pi-home"></i>Tableau de bord</h2>
      <span class="dash-date">{{ today | date:'EEEE d MMMM yyyy':'':'fr' }}</span>
    </div>

    <div *ngIf="loading" class="spinner-wrap">
      <p-progressSpinner strokeWidth="4" styleClass="spinner-md" />
    </div>

    <ng-container *ngIf="data && !loading">

      <!-- KPI cards -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon"><i class="pi pi-box"></i></div>
          <div class="kpi-info">
            <div class="kpi-value">{{ data.totalProducts }}</div>
            <div class="kpi-label">Produits</div>
          </div>
        </div>
        <div class="kpi-card kpi-green">
          <div class="kpi-icon"><i class="pi pi-users"></i></div>
          <div class="kpi-info">
            <div class="kpi-value">{{ data.totalCustomers }}</div>
            <div class="kpi-label">Clients</div>
          </div>
        </div>
        <div class="kpi-card kpi-orange">
          <div class="kpi-icon"><i class="pi pi-truck"></i></div>
          <div class="kpi-info">
            <div class="kpi-value">{{ data.totalSuppliers }}</div>
            <div class="kpi-label">Fournisseurs</div>
          </div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <div class="kpi-info">
            <div class="kpi-value">{{ data.lowStockProducts }}</div>
            <div class="kpi-label">Stock faible</div>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <a routerLink="/invoices/new" class="qa-btn qa-blue">
          <i class="pi pi-file-plus"></i><span>Nouvelle facture</span>
        </a>
        <a routerLink="/purchase-orders/new" class="qa-btn qa-orange">
          <i class="pi pi-shopping-cart"></i><span>Bon de commande</span>
        </a>
        <a routerLink="/stock-movements" class="qa-btn qa-green">
          <i class="pi pi-arrow-right-arrow-left"></i><span>Mouvement stock</span>
        </a>
        <a routerLink="/products" class="qa-btn qa-purple">
          <i class="pi pi-box"></i><span>Produits</span>
        </a>
      </div>

      <!-- Période tabs -->
      <div class="period-tabs">
        <button [class.active]="period==='month'" (click)="period='month'">Ce mois</button>
        <button [class.active]="period==='week'"  (click)="period='week'">Cette semaine</button>
      </div>

      <!-- Ventes / Achats / Marge par période -->
      <div class="revenue-grid-3">
        <!-- Ventes -->
        <div class="revenue-card rev-blue">
          <div class="rev-icon"><i class="pi pi-arrow-up-right"></i></div>
          <div>
            <div class="rev-label">Ventes (Bons de livraison)</div>
            <div class="rev-value">
              {{ (period==='month' ? data.monthlyVentes : data.weeklyVentes) | number:'1.0-3' }} DT
            </div>
          </div>
        </div>
        <!-- Achats -->
        <div class="revenue-card rev-orange">
          <div class="rev-icon"><i class="pi pi-arrow-down-left"></i></div>
          <div>
            <div class="rev-label">Achats (Bons de sortie)</div>
            <div class="rev-value">
              {{ (period==='month' ? data.monthlyAchats : data.weeklyAchats) | number:'1.0-3' }} DT
            </div>
          </div>
        </div>
        <!-- Marge -->
        <div class="revenue-card" [class.rev-green]="(period==='month' ? data.monthlyMarge : data.weeklyMarge) >= 0"
                                  [class.rev-red]="(period==='month' ? data.monthlyMarge : data.weeklyMarge) < 0">
          <div class="rev-icon"><i class="pi pi-percentage"></i></div>
          <div>
            <div class="rev-label">Marge brute</div>
            <div class="rev-value">
              {{ (period==='month' ? data.monthlyMarge : data.weeklyMarge) | number:'1.0-3' }} DT
            </div>
          </div>
        </div>
      </div>

      <!-- Marge du jour -->
      <div class="daily-marge-card" [class.positive]="data.dailyMarge >= 0" [class.negative]="data.dailyMarge < 0">
        <div class="daily-icon"><i class="pi pi-calendar-clock"></i></div>
        <div>
          <div class="daily-label">Marge brute du jour</div>
          <div class="daily-value">{{ data.dailyMarge | number:'1.0-3' }} DT</div>
        </div>
      </div>

      <!-- Filtre période personnalisée -->
      <div class="period-filter-card">
        <div class="pf-title"><i class="pi pi-filter"></i> Filtrer par période</div>
        <div class="pf-row">
          <div class="pf-field">
            <label>Du</label>
            <input type="date" [(ngModel)]="filterFrom" class="pf-input" />
          </div>
          <div class="pf-field">
            <label>Au</label>
            <input type="date" [(ngModel)]="filterTo" class="pf-input" />
          </div>
          <button class="pf-btn" (click)="filterPeriod()" [disabled]="filterLoading">
            <i class="pi" [class.pi-search]="!filterLoading" [class.pi-spin]="filterLoading" [class.pi-spinner]="filterLoading"></i>
            {{ filterLoading ? 'Chargement...' : 'Filtrer' }}
          </button>
          <button *ngIf="periodStats" class="pf-btn-clear" (click)="clearFilter()">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div *ngIf="filterError" class="pf-error">{{ filterError }}</div>

        <!-- Résultats période personnalisée -->
        <div *ngIf="periodStats" class="pf-results">
          <div class="pf-result-card pf-blue">
            <div class="pf-res-label">Ventes</div>
            <div class="pf-res-value">{{ periodStats.ventes | number:'1.0-3' }} DT</div>
          </div>
          <div class="pf-result-card pf-orange">
            <div class="pf-res-label">Achats</div>
            <div class="pf-res-value">{{ periodStats.achats | number:'1.0-3' }} DT</div>
          </div>
          <div class="pf-result-card" [class.pf-green]="periodStats.marge >= 0" [class.pf-red]="periodStats.marge < 0">
            <div class="pf-res-label">Marge brute</div>
            <div class="pf-res-value">{{ periodStats.marge | number:'1.0-3' }} DT</div>
          </div>
        </div>
      </div>

      <!-- Low stock alerts -->
      <div class="card-content" *ngIf="data.lowStockAlerts?.length">
        <div class="alert-header">
          <h3 class="alert-title">
            <i class="pi pi-exclamation-triangle"></i> Alertes stock faible
            <span class="alert-badge">{{ data.lowStockAlerts.length }}</span>
          </h3>
          <button class="print-btn" (click)="printLowStock()">
            <i class="pi pi-print"></i> Imprimer
          </button>
        </div>
        <p-table [value]="data.lowStockAlerts"
                 [paginator]="data.lowStockAlerts.length > 5" [rows]="5"
                 [scrollable]="true" scrollHeight="auto"
                 styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Référence</th>
              <th>Produit</th>
              <th class="hide-mobile">Catégorie</th>
              <th>Stock</th>
              <th class="hide-mobile">Seuil</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td><code>{{ p.reference }}</code></td>
              <td>{{ p.name }}</td>
              <td class="hide-mobile">{{ p.categoryName }}</td>
              <td><span class="status-badge status-low">{{ p.stockQuantity }} {{ p.unit }}</span></td>
              <td class="hide-mobile">{{ p.alertThreshold }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

    </ng-container>
  `,
  styles: [`
    .spinner-wrap { display:flex; justify-content:center; padding: 3rem 0; }

    .dash-date { font-size: 0.85rem; color: #7f8c8d; font-weight: 400; }

    /* Quick actions */
    .quick-actions {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .qa-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 140px;
      padding: 0.75rem 1rem;
      border-radius: 9px;
      text-decoration: none;
      font-size: 0.86rem;
      font-weight: 600;
      border: 1.5px solid transparent;
      transition: transform 0.15s, box-shadow 0.15s;
      cursor: pointer;
      i { font-size: 1.05rem; }
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.12); }
      &.qa-blue   { background: #ebf5fb; color: #2176ae; border-color: #bee3f8; }
      &.qa-orange { background: #fef9e7; color: #b7770d; border-color: #fce8b2; }
      &.qa-green  { background: #eafaf1; color: #1a7a44; border-color: #a9dfbf; }
      &.qa-purple { background: #f4ecf7; color: #7d3c98; border-color: #d7bde2; }
    }

    /* KPI grid — 4 cols desktop, 2 tablet, 1 phone */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .kpi-card {
      background: white;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      border-left: 4px solid;
    }
    .kpi-blue   { border-color: #3498db; .kpi-icon { background:#ebf5fb; color:#3498db; } }
    .kpi-green  { border-color: #2ecc71; .kpi-icon { background:#eafaf1; color:#2ecc71; } }
    .kpi-orange { border-color: #e67e22; .kpi-icon { background:#fef9e7; color:#e67e22; } }
    .kpi-red    { border-color: #e74c3c; .kpi-icon { background:#fdedec; color:#e74c3c; } }
    .kpi-icon {
      width: 52px; height: 52px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; flex-shrink: 0;
    }
    .kpi-value { font-size: 1.9rem; font-weight: 700; line-height: 1; }
    .kpi-label { color: #7f8c8d; font-size: 0.82rem; margin-top: 0.2rem; }

    /* Period tabs */
    .period-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .period-tabs button {
      padding: 0.4rem 1.1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 20px;
      background: #f8fafc;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .period-tabs button.active {
      background: #1d4ed8;
      color: #fff;
      border-color: #1d4ed8;
    }

    /* Revenue grid — 3 cols desktop */
    .revenue-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .revenue-card {
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      color: white;
    }
    .rev-blue   { background: linear-gradient(135deg,#3498db,#2980b9); box-shadow:0 4px 14px rgba(52,152,219,.3); }
    .rev-green  { background: linear-gradient(135deg,#2ecc71,#27ae60); box-shadow:0 4px 14px rgba(46,204,113,.3); }
    .rev-orange { background: linear-gradient(135deg,#e67e22,#d35400); box-shadow:0 4px 14px rgba(230,126,34,.3); }
    .rev-red    { background: linear-gradient(135deg,#e74c3c,#c0392b); box-shadow:0 4px 14px rgba(231,76,60,.3); }
    .rev-icon  { font-size: 2rem; opacity: 0.85; flex-shrink: 0; }
    .rev-label { opacity: 0.9; font-size: 0.83rem; }
    .rev-value { font-size: 1.35rem; font-weight: 700; }

    /* Marge du jour */
    .daily-marge-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      border-radius: 10px;
      padding: 1rem 1.35rem;
      margin-bottom: 1rem;
      color: white;
    }
    .daily-marge-card.positive { background: linear-gradient(135deg,#0d9488,#0f766e); box-shadow:0 4px 14px rgba(13,148,136,.3); }
    .daily-marge-card.negative { background: linear-gradient(135deg,#dc2626,#b91c1c); box-shadow:0 4px 14px rgba(220,38,38,.3); }
    .daily-icon { font-size: 1.8rem; opacity: 0.85; flex-shrink: 0; }
    .daily-label { opacity: 0.9; font-size: 0.83rem; }
    .daily-value { font-size: 1.35rem; font-weight: 700; }

    /* Filtre période */
    .period-filter-card {
      background: white;
      border-radius: 10px;
      padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      margin-bottom: 1rem;
    }
    .pf-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .pf-row {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .pf-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .pf-field label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748b;
    }
    .pf-input {
      border: 1.5px solid #e2e8f0;
      border-radius: 7px;
      padding: 0.45rem 0.7rem;
      font-size: 0.85rem;
      color: #1e293b;
      outline: none;
      transition: border-color 0.15s;
    }
    .pf-input:focus { border-color: #3b82f6; }
    .pf-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #1d4ed8;
      color: white;
      border: none;
      border-radius: 7px;
      padding: 0.48rem 1.1rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .pf-btn:hover:not(:disabled) { background: #1e40af; }
    .pf-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .pf-btn-clear {
      background: #f1f5f9;
      color: #64748b;
      border: 1.5px solid #e2e8f0;
      border-radius: 7px;
      padding: 0.48rem 0.7rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    .pf-btn-clear:hover { background: #e2e8f0; }
    .pf-error { color: #dc2626; font-size: 0.82rem; margin-top: 0.5rem; }
    .pf-results {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .pf-result-card {
      border-radius: 9px;
      padding: 0.9rem 1rem;
      color: white;
    }
    .pf-blue   { background: linear-gradient(135deg,#3b82f6,#2563eb); }
    .pf-orange { background: linear-gradient(135deg,#f97316,#ea580c); }
    .pf-green  { background: linear-gradient(135deg,#22c55e,#16a34a); }
    .pf-red    { background: linear-gradient(135deg,#ef4444,#dc2626); }
    .pf-res-label { font-size: 0.78rem; opacity: 0.9; margin-bottom: 0.2rem; }
    .pf-res-value { font-size: 1.2rem; font-weight: 700; }
    @media (max-width: 700px) {
      .pf-results { grid-template-columns: 1fr; }
      .pf-row { flex-direction: column; align-items: stretch; }
    }

    .alert-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .alert-title {
      color: #c0392b;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    .alert-badge {
      background: #fce8e6;
      color: #c0392b;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.1rem 0.5rem;
      border-radius: 10px;
    }
    .print-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #fff3e0;
      color: #e65100;
      border: 1.5px solid #ffcc80;
      border-radius: 7px;
      padding: 0.35rem 0.85rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.15s;
    }
    .print-btn:hover {
      background: #ffe0b2;
      transform: translateY(-1px);
    }
    .print-btn .pi {
      font-size: 0.9rem;
    }

    /* Tablet */
    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .revenue-grid-3 { grid-template-columns: 1fr 1fr; }
      .quick-actions .qa-btn { min-width: 120px; }
    }
    /* Phone */
    @media (max-width: 560px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .revenue-grid-3 { grid-template-columns: 1fr; }
      .kpi-value { font-size: 1.6rem; }
      .rev-value { font-size: 1.25rem; }
      .quick-actions { grid-template-columns: 1fr 1fr; display: grid; }
      .dash-date { display: none; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  data: Dashboard | null = null;
  loading = true;
  today = new Date();
  period: 'month' | 'week' = 'month';

  // Filtre période personnalisée
  filterFrom: string = '';
  filterTo: string = '';
  filterLoading = false;
  filterError = '';
  periodStats: { ventes: number; achats: number; marge: number } | null = null;

  constructor(private api: ApiService, private printer: ThermalPrintService) {}

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  filterPeriod() {
    this.filterError = '';
    if (!this.filterFrom || !this.filterTo) {
      this.filterError = 'Veuillez sélectionner les deux dates.';
      return;
    }
    if (this.filterFrom > this.filterTo) {
      this.filterError = 'La date de début doit être avant la date de fin.';
      return;
    }
    this.filterLoading = true;
    this.periodStats = null;
    this.api.getDashboardPeriod(this.filterFrom, this.filterTo).subscribe({
      next: stats => { this.periodStats = stats; this.filterLoading = false; },
      error: () => { this.filterError = 'Erreur lors du chargement.'; this.filterLoading = false; }
    });
  }

  clearFilter() {
    this.periodStats = null;
    this.filterFrom = '';
    this.filterTo = '';
    this.filterError = '';
  }

  printLowStock() {
    if (this.data?.lowStockAlerts?.length) {
      this.printer.printLowStock(this.data.lowStockAlerts);
    }
  }
}
