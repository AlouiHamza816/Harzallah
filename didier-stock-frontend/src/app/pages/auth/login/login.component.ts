import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <i class="pi pi-box logo-icon"></i>
          <h1>NEW-BAT HARZALLAH</h1>
          <p>Gestion des stocks & facturation</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="email">Adresse email</label>
            <input id="email" type="email" pInputText formControlName="email"
                   placeholder="admin@didier.com" class="w-full" autocomplete="email" />
          </div>
          <div class="field">
            <label for="password">Mot de passe</label>
            <p-password id="password" formControlName="password"
                        placeholder="••••••••" [toggleMask]="true"
                        [feedback]="false" styleClass="w-full" inputStyleClass="w-full" />
          </div>
          <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3" />
          <p-button type="submit" label="Se connecter" icon="pi pi-sign-in"
                    styleClass="w-full" [loading]="loading" />
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a2332 0%, #2c3e50 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .login-card {
      background: white;
      border-radius: 14px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
      .logo-icon { font-size: 2.8rem; color: #3498db; }
      h1 { font-size: 1.75rem; font-weight: 700; color: #2c3e50; margin: 0.4rem 0 0; }
      p  { color: #7f8c8d; margin: 0.2rem 0 0; font-size: 0.88rem; }
    }
    .field {
      margin-bottom: 1.25rem;
      label { display: block; margin-bottom: 0.4rem; font-weight: 500; color: #444; font-size: 0.88rem; }
    }

    @media (max-width: 480px) {
      .login-card { padding: 2rem 1.25rem; border-radius: 10px; }
      .login-header h1 { font-size: 1.5rem; }
      .login-header .logo-icon { font-size: 2.2rem; }
    }
  `]
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.error = err.error?.message || 'Email ou mot de passe incorrect';
        this.loading = false;
      }
    });
  }
}
