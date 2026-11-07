export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  fullName: string;
  role: string;
}

export interface User {
  id?: number;
  email: string;
  password?: string;
  fullName: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
  createdAt?: string;
}

export interface CompanySettings {
  id?: number;
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  nif?: string;
  rib?: string;
  logo?: string;
  currency: 'TND' | 'XAF' | 'EUR' | 'USD';
  taxRate: number;
}

export interface Category {
  id?: number;
  name: string;
  description?: string;
}

export interface Product {
  id?: number;
  reference: string;
  name: string;
  description?: string;
  categoryId?: number;
  categoryName?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  alertThreshold: number;
  unit: string;
  active: boolean;
  lowStock?: boolean;
}

export interface BundleItem {
  id?: number;
  productId: number;
  productName?: string;
  productUnit?: string;
  quantity: number;
}

export interface ProductBundle {
  id?: number;
  reference: string;
  name: string;
  description?: string;
  sellingPrice: number;
  active: boolean;
  items: BundleItem[];
}

export interface Customer {
  id?: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  nif?: string;
  type: 'INDIVIDUAL' | 'COMPANY';
}

export interface Supplier {
  id?: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  nif?: string;
  contactPerson?: string;
}

export interface InvoiceLine {
  id?: number;
  productId?: number;
  productName?: string;
  description: string;
  dimension?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalHT: number;
}

export interface Invoice {
  id?: number;
  number?: string;
  type: 'FACTURE' | 'DEVIS' | 'BON_LIVRAISON';
  date: string;
  dueDate?: string;
  customerId?: number;
  customerName?: string;
  customerNif?: string;
  customerAddress?: string;
  passengerName?: string;
  passengerAddress?: string;
  passengerNif?: string;
  supplierId?: number;
  supplierName?: string;
  supplierAddress?: string;
  lines: InvoiceLine[];
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  notes?: string;
  totalHT?: number;
  taxRate: number;
  totalTVA?: number;
  totalTTC?: number;
  stampDuty?: number;
  driverName?: string;
  truckPlate?: string;
  createdAt?: string;
}

export interface PurchaseOrderLine {
  id?: number;
  productId?: number;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalHT: number;
}

export interface PurchaseOrder {
  id?: number;
  number?: string;
  date: string;
  supplierId: number;
  supplierName?: string;
  supplierNif?: string;
  lines: PurchaseOrderLine[];
  status?: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  totalHT?: number;
  taxRate: number;
  totalTTC?: number;
  createdAt?: string;
}

export interface StockMovement {
  id?: number;
  date?: string;
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
  productId: number;
  productName?: string;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface Dashboard {
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  lowStockProducts: number;
  monthlyVentes: number;
  monthlyAchats: number;
  monthlyMarge: number;
  weeklyVentes: number;
  weeklyAchats: number;
  weeklyMarge: number;
  dailyMarge: number;
  lowStockAlerts: Product[];
}

export interface PagedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
