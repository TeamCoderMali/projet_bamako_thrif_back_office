// ─── Core — Auth Service ──────────────────────────────────────────────────────
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AdminUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly currentUser = signal<AdminUser | null>(null);
  readonly isLoading = signal(true);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly userRole = computed(() => this.currentUser()?.role ?? null);

  constructor() {
    this.initAuthListener();
  }

  // ── Auth state listener ───────────────────────────────────────────────────
  private initAuthListener(): void {
    onAuthStateChanged(this.auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const adminUser = await this.fetchAdminUser(firebaseUser.uid);
        this.currentUser.set(adminUser);
      } else {
        this.currentUser.set(null);
      }
      this.isLoading.set(false);
    });
  }

  // ── Fetch admin user from Firestore ───────────────────────────────────────
  private async fetchAdminUser(uid: string): Promise<AdminUser | null> {
    try {
      const ref = doc(this.firestore, `admin_users/${uid}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Omit<AdminUser, 'uid'>;
        return { uid, ...data, createdAt: (data as any).createdAt?.toDate() ?? new Date() };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const user = await this.fetchAdminUser(cred.user.uid);
    if (!user) throw new Error('Compte administrateur introuvable.');
    this.currentUser.set(user);
    this.redirectAfterLogin(user.role);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ── Redirect by role ──────────────────────────────────────────────────────
  redirectAfterLogin(role: string): void {
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'relay_manager') {
      this.router.navigate(['/relay/dashboard']);
    } else {
      this.router.navigate(['/unauthorized']);
    }
  }
}
