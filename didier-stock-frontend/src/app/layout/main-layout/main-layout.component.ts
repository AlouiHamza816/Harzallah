import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ButtonModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />

    <!-- Mobile overlay -->
    <div class="sidebar-overlay" [class.visible]="sidebarOpen" (click)="closeSidebar()"></div>

    <div class="layout-wrapper">
      <!-- Sidebar -->
      <nav class="sidebar" [class.open]="sidebarOpen">
        <div class="sidebar-header">
          <div class="logo">
            <i class="pi pi-box"></i>
            <span>NEW-BAT HARZALLAH</span>
          </div>
          <button class="sidebar-close" (click)="closeSidebar()" title="Fermer">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <ul class="nav-menu">
          <li>
            <a routerLink="/dashboard" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-home"></i><span>Tableau de bord</span>
            </a>
          </li>
          <li class="nav-section">Catalogue</li>
          <li>
            <a routerLink="/categories" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-tags"></i><span>Catégories</span>
            </a>
          </li>
          <li>
            <a routerLink="/products" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-box"></i><span>Produits</span>
            </a>
          </li>
          <li>
            <a routerLink="/bundles" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-th-large"></i><span>Paquets</span>
            </a>
          </li>
          <li class="nav-section">Tiers</li>
          <li>
            <a routerLink="/customers" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-users"></i><span>Clients</span>
            </a>
          </li>
          <li>
            <a routerLink="/suppliers" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-truck"></i><span>Fournisseurs</span>
            </a>
          </li>
          <li class="nav-section">Documents</li>
          <li>
            <a routerLink="/documents" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-copy"></i><span>Tous les documents</span>
            </a>
          </li>
          <li>
            <a routerLink="/invoices" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-file"></i><span>Facturation</span>
            </a>
          </li>
          <li>
            <a routerLink="/purchase-orders" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-shopping-cart"></i><span>Bons de commande</span>
            </a>
          </li>
          <li class="nav-section">Stock</li>
          <li>
            <a routerLink="/stock-movements" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-arrow-right-arrow-left"></i><span>Mouvements</span>
            </a>
          </li>
          <li class="nav-section">Administration</li>
          <li *ngIf="isAdmin">
            <a routerLink="/users" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-user"></i><span>Utilisateurs</span>
            </a>
          </li>
          <li>
            <a routerLink="/settings" routerLinkActive="active" (click)="closeSidebar()">
              <i class="pi pi-cog"></i><span>Paramètres</span>
            </a>
          </li>
        </ul>

        <div class="sidebar-footer">
          <div class="user-info">
            <i class="pi pi-user-circle"></i>
            <span>{{ userName }}</span>
          </div>
          <button (click)="logout()" class="logout-btn" title="Déconnexion">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </nav>

      <!-- Main content -->
      <div class="main-wrapper">
        <!-- Top bar (mobile only) -->
        <header class="topbar">
          <button class="hamburger" (click)="toggleSidebar()" aria-label="Menu">
            <i class="pi pi-bars"></i>
          </button>
          <div class="topbar-logo">
            <i class="pi pi-box"></i>
            <span>NEW-BAT HARZALLAH</span>
          </div>
          <button (click)="logout()" class="topbar-logout" title="Déconnexion">
            <i class="pi pi-sign-out"></i>
          </button>
        </header>

        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout shell ── */
    .layout-wrapper {
      display: flex;
      min-height: 100vh;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px;
      min-height: 100vh;
      background: linear-gradient(180deg, #1a2332 0%, #2c3e50 100%);
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      overflow-y: auto;
      z-index: 200;
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
    }
    .sidebar-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      i { font-size: 1.3rem; color: #3498db; }
    }
    .sidebar-close {
      display: none;
      background: none;
      border: none;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem;
      &:hover { color: white; }
    }
    .nav-menu {
      list-style: none;
      padding: 0.5rem 0;
      flex: 1;
    }
    .nav-section {
      padding: 0.75rem 1rem 0.2rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.38);
      font-weight: 600;
    }
    .nav-menu li a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1.5rem;
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      font-size: 0.88rem;
      transition: all 0.2s;
      border-radius: 0 20px 20px 0;
      margin-right: 0.5rem;
      i { width: 16px; text-align: center; flex-shrink: 0; }
      &:hover { background: rgba(255,255,255,0.09); color: white; }
      &.active { background: #3498db; color: white; }
    }
    .sidebar-footer {
      padding: 0.875rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.8);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      i { flex-shrink: 0; }
    }
    .logout-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.55);
      cursor: pointer;
      padding: 0.3rem;
      border-radius: 4px;
      font-size: 1rem;
      &:hover { color: #e74c3c; }
    }

    /* ── Main wrapper ── */
    .main-wrapper {
      margin-left: 240px;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .main-content {
      flex: 1;
      padding: 1.75rem 2rem;
    }

    /* ── Top bar (hidden on desktop) ── */
    .topbar {
      display: none;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: linear-gradient(90deg, #1a2332, #2c3e50);
      color: white;
      position: sticky;
      top: 0;
      z-index: 150;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    }
    .hamburger {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem 0.35rem;
      border-radius: 4px;
      flex-shrink: 0;
      &:hover { background: rgba(255,255,255,0.12); }
    }
    .topbar-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      font-size: 1rem;
      flex: 1;
      i { color: #3498db; }
    }
    .topbar-logout {
      background: none;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem 0.35rem;
      border-radius: 4px;
      &:hover { color: #e74c3c; }
    }

    /* ── Mobile overlay ── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 190;
      opacity: 0;
      transition: opacity 0.25s;
      &.visible { opacity: 1; }
    }

    /* ── Tablet (≤ 1024px) ── */
    @media (max-width: 1024px) {
      .sidebar {
        transform: translateX(-100%);
        &.open { transform: translateX(0); }
      }
      .sidebar-close { display: block; }
      .sidebar-overlay { display: block; pointer-events: none; }
      .sidebar-overlay.visible { pointer-events: auto; }
      .main-wrapper { margin-left: 0; }
      .topbar { display: flex; }
      .main-content { padding: 1.25rem 1.25rem; }
    }

    /* ── Phone (≤ 600px) ── */
    @media (max-width: 600px) {
      .main-content { padding: 1rem 0.75rem; }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  userName = '';
  isAdmin = false;
  sidebarOpen = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.userName = user?.fullName ?? '';
    this.isAdmin = this.auth.isAdmin();

    // Auto-close sidebar on navigation
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.sidebarOpen = false);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape() { this.sidebarOpen = false; }

  logout() { this.auth.logout(); }
}
