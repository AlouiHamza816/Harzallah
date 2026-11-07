import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Category } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    DialogModule, ConfirmDialogModule, ToastModule, InputTextareaModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-tags"></i>Catégorie</h2>
      <p-button label="Nouvelle catégorie" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="categories" [loading]="loading" [paginator]="true" [rows]="10"
               [globalFilterFields]="['name','description']"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines" #dt>
        <ng-template pTemplate="caption">
          <div class="caption-row">
            <input pInputText type="text"
                   (input)="dt.filterGlobal($any($event.target).value,'contains')"
                   placeholder="Rechercher une catégorie..." class="table-search" />
            <span class="item-count"><i class="pi pi-tags" style="margin-right:4px"></i>{{ categories.length }} catégorie(s)</span>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Nom <p-sortIcon field="name" /></th>
            <th class="hide-mobile">Description</th>
            <th style="width:110px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-cat>
          <tr>
            <td><strong>{{ cat.name }}</strong></td>
            <td class="hide-mobile text-muted">{{ cat.description || '—' }}</td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" (onClick)="edit(cat)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(cat)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="3">
            <div class="empty-state">
              <i class="pi pi-tags empty-icon"></i>
              <div class="empty-title">Aucune catégorie trouvée</div>
              <div class="empty-sub">Organisez vos produits en créant des catégories</div>
              <p-button label="Nouvelle catégorie" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'480px'}" [breakpoints]="{'768px':'95vw'}"
              [header]="editMode ? 'Modifier la catégorie' : 'Nouvelle catégorie'"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form">
        <div class="field">
          <label>Nom <span class="required">*</span></label>
          <input pInputText formControlName="name" class="w-full"
                 placeholder="Ex : Informatique" />
          <small class="p-error" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">
            Le nom est requis.
          </small>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea pTextarea formControlName="description" rows="3" class="w-full"
                    placeholder="Description optionnelle..."></textarea>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" icon="pi pi-times" [text]="true" severity="secondary"
                  (onClick)="showDialog=false" />
        <p-button label="Enregistrer" icon="pi pi-check"
                  (onClick)="save()" [loading]="saving" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .text-muted { color: #7f8c8d; font-size: 0.88rem; }
    .text-center { text-align: center; }
    .required { color: #e74c3c; }
    .dialog-form { padding: 0.25rem 0; }
  `]
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  loading = true;
  showDialog = false;
  editMode = false;
  saving = false;
  form: FormGroup;
  private editId?: number;

  constructor(private api: ApiService, private fb: FormBuilder,
              private msg: MessageService, private confirm: ConfirmationService) {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getCategories().subscribe({
      next: d => { this.categories = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openNew() {
    this.editMode = false;
    this.editId = undefined;
    this.form.reset();
    this.showDialog = true;
  }

  edit(cat: Category) {
    this.editMode = true;
    this.editId = cat.id;
    this.form.patchValue(cat);
    this.showDialog = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const obs = this.editMode
      ? this.api.updateCategory(this.editId!, this.form.value)
      : this.api.createCategory(this.form.value);
    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Succès', detail: 'Catégorie enregistrée' });
        this.showDialog = false; this.saving = false; this.load();
      },
      error: err => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur serveur' });
        this.saving = false;
      }
    });
  }

  delete(cat: Category) {
    this.confirm.confirm({
      message: `Supprimer la catégorie <strong>${cat.name}</strong> ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteCategory(cat.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
