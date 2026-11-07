import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/models';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule,
    PasswordModule, DialogModule, ConfirmDialogModule, ToastModule, DropdownModule],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="page-header">
      <h2><i class="pi pi-user"></i>Utilisateurs</h2>
      <p-button label="Nouvel utilisateur" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <div class="card-content">
      <p-table [value]="users" [loading]="loading" [paginator]="true" [rows]="10"
               [scrollable]="true" styleClass="p-datatable-sm p-datatable-gridlines">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="fullName">Nom complet</th>
            <th class="hide-mobile" pSortableColumn="email">Email</th>
            <th class="hide-mobile">Rôle</th>
            <th>Statut</th>
            <th class="hide-tablet">Créé le</th>
            <th style="width:110px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-u>
          <tr>
            <td>
              <strong>{{ u.fullName }}</strong>
              <div class="sub-info hide-desktop">{{ u.email }}</div>
            </td>
            <td class="hide-mobile">{{ u.email }}</td>
            <td class="hide-mobile">
              <span [class]="'status-badge ' + (u.role === 'ADMIN' ? 'status-sent' : 'status-draft')">
                {{ u.role === 'ADMIN' ? 'Admin' : 'Utilisateur' }}
              </span>
            </td>
            <td>
              <span [class]="'status-badge ' + (u.active ? 'status-paid' : 'status-cancelled')">
                {{ u.active ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td class="hide-tablet">{{ u.createdAt | date:'dd/MM/yyyy' }}</td>
            <td>
              <div class="action-buttons">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info"
                          pTooltip="Modifier" (onClick)="edit(u)" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          pTooltip="Supprimer" (onClick)="delete(u)" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="empty-state">
              <i class="pi pi-user empty-icon"></i>
              <div class="empty-title">Aucun utilisateur trouvé</div>
              <div class="empty-sub">Ajoutez des utilisateurs pour partager l'accès</div>
              <p-button label="Nouvel utilisateur" icon="pi pi-plus" size="small" (onClick)="openNew()" />
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true"
              [style]="{width:'500px'}" [breakpoints]="{'768px':'95vw'}"
              [header]="dialogHeader"
              [draggable]="false" [resizable]="false">
      <form [formGroup]="form" class="dialog-form">
        <div class="field">
          <label>Nom complet <span class="required">*</span></label>
          <input pInputText formControlName="fullName" class="w-full" />
        </div>
        <div class="field">
          <label>Email <span class="required">*</span></label>
          <input pInputText formControlName="email" type="email" class="w-full" [readonly]="editMode" />
        </div>
        <div class="field">
          <label>Mot de passe {{ editMode ? '(laisser vide pour ne pas changer)' : '*' }}</label>
          <p-password formControlName="password" [toggleMask]="true" [feedback]="false"
                      styleClass="w-full" inputStyleClass="w-full" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Rôle</label>
            <p-dropdown formControlName="role" [options]="roleOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Statut</label>
            <p-dropdown formControlName="active" [options]="statusOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" icon="pi pi-times" [text]="true" severity="secondary"
                  (onClick)="showDialog=false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="save()" [loading]="saving" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .text-muted { color: #7f8c8d; font-size: 0.88rem; }
    .text-center { text-align: center; }
    .required { color: #e74c3c; }
    .dialog-form { padding: 0.25rem 0; }
    .sub-info { font-size: 0.78rem; color: #7f8c8d; margin-top: 2px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (min-width: 601px) { .hide-desktop { display: none; } }
    @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; } }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true; showDialog = false; editMode = false; saving = false;
  form: FormGroup;
  roleOptions   = [{ label: 'Administrateur', value: 'ADMIN' }, { label: 'Utilisateur', value: 'USER' }];
  statusOptions = [{ label: 'Actif', value: true }, { label: 'Inactif', value: false }];
  private editId?: number;
  get dialogHeader() { return this.editMode ? "Modifier l'utilisateur" : 'Nouvel utilisateur'; }

  constructor(private api: ApiService, private fb: FormBuilder,
              private msg: MessageService, private confirm: ConfirmationService) {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      password: [''],
      role:     ['USER'],
      active:   [true]
    });
  }

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.getUsers().subscribe({ next: d => { this.users = d; this.loading = false; }, error: () => { this.loading = false; } });
  }
  openNew() { this.editMode = false; this.editId = undefined; this.form.reset({ role: 'USER', active: true }); this.showDialog = true; }
  edit(u: User) { this.editMode = true; this.editId = u.id; this.form.patchValue({ ...u, password: '' }); this.showDialog = true; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const obs = this.editMode ? this.api.updateUser(this.editId!, this.form.value) : this.api.createUser(this.form.value);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', detail: 'Utilisateur enregistré' }); this.showDialog = false; this.saving = false; this.load(); },
      error: err => { this.msg.add({ severity: 'error', detail: err.error?.message || 'Erreur serveur' }); this.saving = false; }
    });
  }

  delete(u: User) {
    this.confirm.confirm({
      message: `Supprimer l'utilisateur <strong>${u.fullName}</strong> ?`,
      header: 'Confirmation', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.deleteUser(u.id!).subscribe({
        next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé' }); this.load(); },
        error: err => this.msg.add({ severity: 'error', detail: err.error?.message })
      })
    });
  }
}
