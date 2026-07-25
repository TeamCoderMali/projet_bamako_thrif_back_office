// ─── Shared — Data Service ────────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection, collectionData, doc, docData, getDoc,
  updateDoc, deleteDoc, addDoc, setDoc,
  query, where, orderBy, limit,
  getDocs,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition?: string;
  status: string;
  sellerId: string;
  imageUrls: string[];
  createdAt: any;
  viewCount?: number;
  isVerified?: boolean;
}

export interface AppUser {
  id: string;
  uid?: string;
  // Flutter stores as 'fullName' — displayName kept for backwards compat
  fullName?: string;
  displayName?: string;
  email: string;
  // Flutter stores as 'avatarUrl' — photoURL kept for backwards compat
  avatarUrl?: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: any;   // can be Firestore Timestamp OR milliseconds integer
  isActive?: boolean;
  isBanned?: boolean;
  totalListings?: number;
  totalSales?: number;
  rating?: number;
  reviewCount?: number;
  isEmailVerified?: boolean;
}

// ── Helpers pour récupérer les champs quelle que soit la convention ────────────
export function getUserName(u: AppUser | null | undefined): string {
  if (!u) return 'Utilisateur inconnu';
  return u.fullName || u.displayName || u.email?.split('@')[0] || '—';
}
export function getUserAvatar(u: AppUser | null | undefined): string {
  return u?.avatarUrl || u?.photoURL || '';
}
export function getUserInitials(u: AppUser | null | undefined): string {
  const name = getUserName(u);
  return name.split(' ').map((n: string) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}
export function parseDate(ts: any): Date | null {
  if (!ts) return null;
  try {
    // Firestore Timestamp
    if (ts?.toDate) return ts.toDate();
    // Milliseconds integer (Flutter)
    if (typeof ts === 'number') return new Date(ts);
    // ISO string
    return new Date(ts);
  } catch { return null; }
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  createdAt: any;
}

export interface RelayCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  articlesCount?: number;
  createdAt: any;
}

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productTitle: string;
  reason: string;
  description?: string;
  status: 'open' | 'processing' | 'resolved' | 'closed';
  resolution?: string;
  createdAt: any;
  resolvedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private fs: Firestore = inject(Firestore);

  // ── Products ──────────────────────────────────────────────────────────────
  // Utilise getDocs (one-shot) — plus fiable que collectionData pour l'admin
  async getProductsAsync(limitN = 500): Promise<Product[]> {
    try {
      // Essai avec orderBy d'abord (nécessite que createdAt existe sur tous les docs)
      const q = query(
        collection(this.fs, 'product'),
        orderBy('createdAt', 'desc'),
        limit(limitN)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    } catch (err: any) {
      console.warn('[DataService] orderBy query failed, trying without orderBy:', err?.message);
      // Fallback : sans orderBy si l'index manque
      try {
        const q2 = query(collection(this.fs, 'product'), limit(limitN));
        const snap2 = await getDocs(q2);
        const products = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        // Tri côté client
        return products.sort((a, b) => {
          const getTs = (x: any) => x?.createdAt?.seconds ?? (x?.createdAt?.toMillis ? x.createdAt.toMillis() / 1000 : 0);
          return getTs(b) - getTs(a);
        });
      } catch (err2: any) {
        console.error('[DataService] getProductsAsync failed completely:', err2?.message, err2?.code);
        return [];
      }
    }
  }

  // Version Observable (pour compatibilité)
  getProducts(limitN = 500): Observable<Product[]> {
    return from(this.getProductsAsync(limitN));
  }

  getProduct(id: string): Observable<Product | undefined> {
    return (docData(doc(this.fs, 'product', id), { idField: 'id' }) as Observable<Product>).pipe(
      catchError(err => { console.error('[DataService] getProduct error:', err?.code, err?.message); return of(undefined); })
    );
  }

  updateProductStatus(id: string, status: string): Promise<void> {
    return updateDoc(doc(this.fs, 'product', id), { status, updatedAt: Timestamp.now() });
  }

  updateProductVerified(id: string, isVerified: boolean): Promise<void> {
    return updateDoc(doc(this.fs, 'product', id), { isVerified, updatedAt: Timestamp.now() });
  }

  deleteProduct(id: string): Promise<void> {
    return deleteDoc(doc(this.fs, 'product', id));
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  async getUsersAsync(limitN = 500): Promise<AppUser[]> {
    try {
      const q = query(collection(this.fs, 'users'), orderBy('createdAt', 'desc'), limit(limitN));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
    } catch (err: any) {
      console.warn('[DataService] users orderBy failed, fallback:', err?.message);
      try {
        const snap2 = await getDocs(query(collection(this.fs, 'users'), limit(limitN)));
        return snap2.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
      } catch (err2: any) {
        console.error('[DataService] getUsers failed:', err2?.message);
        return [];
      }
    }
  }

  getUsers(limitN = 500): Observable<AppUser[]> {
    return from(this.getUsersAsync(limitN));
  }

  getUser(id: string): Observable<AppUser | undefined> {
    return (docData(doc(this.fs, 'users', id), { idField: 'id' }) as Observable<AppUser>).pipe(
      catchError(err => { console.error('[DataService] getUser error:', err?.code, err?.message); return of(undefined); })
    );
  }

  banUser(id: string, banned: boolean): Promise<void> {
    return updateDoc(doc(this.fs, 'users', id), { isBanned: banned, updatedAt: Timestamp.now() });
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async getOrdersAsync(limitN = 200): Promise<Order[]> {
    try {
      const q = query(collection(this.fs, 'order'), orderBy('createdAt', 'desc'), limit(limitN));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    } catch (err: any) {
      console.warn('[DataService] orders orderBy failed:', err?.message);
      try {
        const snap2 = await getDocs(query(collection(this.fs, 'order'), limit(limitN)));
        return snap2.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      } catch { return []; }
    }
  }

  getOrders(limitN = 200): Observable<Order[]> {
    return from(this.getOrdersAsync(limitN));
  }

  getOrdersByBuyer(uid: string): Observable<Order[]> {
    return from(
      getDocs(query(collection(this.fs, 'order'), where('buyerId', '==', uid), limit(100)))
        .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        .catch(err => { console.error('[DataService] getOrdersByBuyer:', err?.message); return []; })
    );
  }

  // ── Relay Centers ─────────────────────────────────────────────────────────
  getRelayCenters(): Observable<RelayCenter[]> {
    return from(
      getDocs(query(collection(this.fs, 'relay_centers'), orderBy('name', 'asc')))
        .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as RelayCenter)))
        .catch(err => { console.warn('[DataService] getRelayCenters:', err?.message); return []; })
    );
  }

  saveRelayCenter(data: Partial<RelayCenter>, id?: string): Promise<void> {
    const payload = { ...data, updatedAt: Timestamp.now() };
    if (id) return updateDoc(doc(this.fs, 'relay_centers', id), payload);
    return addDoc(collection(this.fs, 'relay_centers'), {
      ...payload, createdAt: Timestamp.now(), isActive: true
    }).then(() => {});
  }

  deleteRelayCenter(id: string): Promise<void> {
    return deleteDoc(doc(this.fs, 'relay_centers', id));
  }

  // ── Disputes ──────────────────────────────────────────────────────────────
  getDisputes(): Observable<Dispute[]> {
    return from(
      getDocs(query(collection(this.fs, 'disputes'), orderBy('createdAt', 'desc')))
        .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Dispute)))
        .catch(err => { console.error('[DataService] getDisputes:', err?.message); return []; })
    );
  }

  resolveDispute(id: string, resolution: string, status: 'resolved' | 'closed'): Promise<void> {
    return updateDoc(doc(this.fs, 'disputes', id), {
      status, resolution, resolvedAt: Timestamp.now()
    });
  }

  // ── Finance / Wallet ──────────────────────────────────────────────────────
  async getFinanceSummary(): Promise<{ totalRevenue: number; totalTransactions: number }> {
    try {
      const snap = await getDocs(collection(this.fs, 'wallet'));
      let totalRevenue = 0;
      snap.forEach(d => { totalRevenue += (d.data() as any)['totalEarned'] ?? 0; });
      return { totalRevenue, totalTransactions: snap.size };
    } catch (err: any) {
      console.error('[DataService] getFinanceSummary:', err?.message);
      return { totalRevenue: 0, totalTransactions: 0 };
    }
  }


  // ── Counts — utilise getDocs().size (pas getCountFromServer) ──────────────
  async getCount(col: string): Promise<number> {
    try {
      const snap = await getDocs(query(collection(this.fs, col), limit(1000)));
      return snap.size;
    } catch (err: any) {
      console.warn('[DataService] getCount', col, ':', err?.message);
      return 0;
    }
  }

  async getCountWhere(col: string, field: string, value: string): Promise<number> {
    try {
      const snap = await getDocs(
        query(collection(this.fs, col), where(field, '==', value), limit(1000))
      );
      return snap.size;
    } catch (err: any) {
      console.warn('[DataService] getCountWhere', col, ':', err?.message);
      return 0;
    }
  }
}
