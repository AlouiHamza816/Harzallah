import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Category, CompanySettings, Customer, Dashboard,
  Invoice, Product, ProductBundle, PurchaseOrder, StockMovement, Supplier, User
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Company
  getCompanySettings(): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(`${this.base}/company-settings`);
  }
  saveCompanySettings(data: CompanySettings): Observable<CompanySettings> {
    return this.http.put<CompanySettings>(`${this.base}/company-settings`, data);
  }

  // Categories
  getCategories(): Observable<Category[]> { return this.http.get<Category[]>(`${this.base}/categories`); }
  createCategory(data: Category): Observable<Category> { return this.http.post<Category>(`${this.base}/categories`, data); }
  updateCategory(id: number, data: Category): Observable<Category> { return this.http.put<Category>(`${this.base}/categories/${id}`, data); }
  deleteCategory(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/categories/${id}`); }

  // Products
  getProducts(q?: string): Observable<Product[]> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Product[]>(`${this.base}/products`, { params });
  }
  getLowStockProducts(): Observable<Product[]> { return this.http.get<Product[]>(`${this.base}/products/low-stock`); }
  getProduct(id: number): Observable<Product> { return this.http.get<Product>(`${this.base}/products/${id}`); }
  createProduct(data: Product): Observable<Product> { return this.http.post<Product>(`${this.base}/products`, data); }
  updateProduct(id: number, data: Product): Observable<Product> { return this.http.put<Product>(`${this.base}/products/${id}`, data); }
  deleteProduct(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/products/${id}`); }

  // Bundles (Paquets)
  getBundles(): Observable<ProductBundle[]> { return this.http.get<ProductBundle[]>(`${this.base}/bundles`); }
  getBundle(id: number): Observable<ProductBundle> { return this.http.get<ProductBundle>(`${this.base}/bundles/${id}`); }
  createBundle(data: ProductBundle): Observable<ProductBundle> { return this.http.post<ProductBundle>(`${this.base}/bundles`, data); }
  updateBundle(id: number, data: ProductBundle): Observable<ProductBundle> { return this.http.put<ProductBundle>(`${this.base}/bundles/${id}`, data); }
  deleteBundle(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/bundles/${id}`); }

  // Customers
  getCustomers(q?: string): Observable<Customer[]> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Customer[]>(`${this.base}/customers`, { params });
  }
  getCustomer(id: number): Observable<Customer> { return this.http.get<Customer>(`${this.base}/customers/${id}`); }
  createCustomer(data: Customer): Observable<Customer> { return this.http.post<Customer>(`${this.base}/customers`, data); }
  updateCustomer(id: number, data: Customer): Observable<Customer> { return this.http.put<Customer>(`${this.base}/customers/${id}`, data); }
  deleteCustomer(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/customers/${id}`); }

  // Suppliers
  getSuppliers(q?: string): Observable<Supplier[]> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Supplier[]>(`${this.base}/suppliers`, { params });
  }
  getSupplier(id: number): Observable<Supplier> { return this.http.get<Supplier>(`${this.base}/suppliers/${id}`); }
  createSupplier(data: Supplier): Observable<Supplier> { return this.http.post<Supplier>(`${this.base}/suppliers`, data); }
  updateSupplier(id: number, data: Supplier): Observable<Supplier> { return this.http.put<Supplier>(`${this.base}/suppliers/${id}`, data); }
  deleteSupplier(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/suppliers/${id}`); }

  // Invoices
  getInvoices(type?: string): Observable<Invoice[]> {
    const params = type ? new HttpParams().set('type', type) : undefined;
    return this.http.get<Invoice[]>(`${this.base}/invoices`, { params });
  }
  getInvoice(id: number): Observable<Invoice> { return this.http.get<Invoice>(`${this.base}/invoices/${id}`); }
  getInvoicePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/invoices/${id}/pdf`, { responseType: 'blob' });
  }
  getPublicInvoicePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/public/invoices/${id}/pdf`, { responseType: 'blob' });
  }
  createInvoice(data: Invoice): Observable<Invoice> { return this.http.post<Invoice>(`${this.base}/invoices`, data); }
  updateInvoice(id: number, data: Invoice): Observable<Invoice> { return this.http.put<Invoice>(`${this.base}/invoices/${id}`, data); }
  updateInvoiceStatus(id: number, status: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.base}/invoices/${id}/status`, null, { params: { status } });
  }
  deleteInvoice(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/invoices/${id}`); }

  // Purchase Orders
  getPurchaseOrders(): Observable<PurchaseOrder[]> { return this.http.get<PurchaseOrder[]>(`${this.base}/purchase-orders`); }
  getPurchaseOrder(id: number): Observable<PurchaseOrder> { return this.http.get<PurchaseOrder>(`${this.base}/purchase-orders/${id}`); }
  createPurchaseOrder(data: PurchaseOrder): Observable<PurchaseOrder> { return this.http.post<PurchaseOrder>(`${this.base}/purchase-orders`, data); }
  updatePurchaseOrder(id: number, data: PurchaseOrder): Observable<PurchaseOrder> { return this.http.put<PurchaseOrder>(`${this.base}/purchase-orders/${id}`, data); }
  updatePurchaseOrderStatus(id: number, status: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/purchase-orders/${id}/status`, null, { params: { status } });
  }
  deletePurchaseOrder(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/purchase-orders/${id}`); }

  // Stock Movements
  getStockMovements(): Observable<StockMovement[]> { return this.http.get<StockMovement[]>(`${this.base}/stock-movements`); }
  createStockMovement(data: StockMovement): Observable<StockMovement> { return this.http.post<StockMovement>(`${this.base}/stock-movements`, data); }

  // Dashboard
  getDashboard(): Observable<Dashboard> { return this.http.get<Dashboard>(`${this.base}/dashboard`); }
  getDashboardPeriod(from: string, to: string): Observable<{ ventes: number; achats: number; marge: number }> {
    return this.http.get<{ ventes: number; achats: number; marge: number }>(`${this.base}/dashboard/period`, { params: { from, to } });
  }

  // Users
  getUsers(): Observable<User[]> { return this.http.get<User[]>(`${this.base}/users`); }
  createUser(data: User): Observable<User> { return this.http.post<User>(`${this.base}/users`, data); }
  updateUser(id: number, data: User): Observable<User> { return this.http.put<User>(`${this.base}/users/${id}`, data); }
  deleteUser(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/users/${id}`); }
}
