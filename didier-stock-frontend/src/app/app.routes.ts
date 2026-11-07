import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',       loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'categories',      loadComponent: () => import('./pages/categories/categories.component').then(m => m.CategoriesComponent) },
      { path: 'products',        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent) },
      { path: 'bundles',         loadComponent: () => import('./pages/bundles/bundles.component').then(m => m.BundlesComponent) },
      { path: 'customers',       loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent) },
      { path: 'suppliers',       loadComponent: () => import('./pages/suppliers/suppliers.component').then(m => m.SuppliersComponent) },
      { path: 'documents',       loadComponent: () => import('./pages/documents/documents.component').then(m => m.DocumentsComponent) },
      { path: 'invoices',        loadComponent: () => import('./pages/invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'invoices/new',    loadComponent: () => import('./pages/invoices/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent) },
      { path: 'invoices/:id',    loadComponent: () => import('./pages/invoices/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent) },
      { path: 'purchase-orders', loadComponent: () => import('./pages/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent) },
      { path: 'purchase-orders/new', loadComponent: () => import('./pages/purchase-orders/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent) },
      { path: 'purchase-orders/:id', loadComponent: () => import('./pages/purchase-orders/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent) },
      { path: 'stock-movements', loadComponent: () => import('./pages/stock-movements/stock-movements.component').then(m => m.StockMovementsComponent) },
      { path: 'settings',        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'users',           loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent) },
    ]
  },
  { path: 'demo', loadComponent: () => import('./pages/demo/demo.component').then(m => m.DemoComponent) },
  { path: '**', redirectTo: '' }
];
