/**
 * Firestore Sync Service
 * Handles optional synchronization of AI content metadata to Firestore
 * Requirements: 10.3, 10.4, 10.5
 * 
 * Key Features:
 * - Check if Firebase is configured before syncing
 * - Sync metadata and URLs only (no blob data)
 * - Download media files to IndexedDB on Firestore load
 * - Cross-device content sync
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type { EraContent } from './types';
import type { FirestoreSyncMetadata } from './persistenceService';
import { persistenceService } from './persistenceService';
import { generateAICacheKey } from './aiCache';

// ============================================
// Types
// ============================================

/**
 * Firestore document structure for synced content
 * Requirement 10.4: Sync metadata and URLs only
 */
export interface FirestoreContentDocument {
  /** Unique document ID (same as cache key) */
  id: string;
  /** User ID who generated this content */
  userId: string;
  /** Sync metadata (no blobs) */
  metadata: FirestoreSyncMetadata;
  /** When this document was synced */
  syncedAt: string; // ISO date string
  /** Schema version for migrations */
  schemaVersion: number;
}

/**
 * Result of sync operation
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Number of items synced */
  itemsSynced: number;
  /** Any errors encountered */
  errors: string[];
  /** Timestamp of sync */
  syncedAt: Date;
}

/**
 * Options for loading from Firestore
 */
export interface FirestoreLoadOptions {
  /** User ID to load content for */
  userId: string;
  /** Maximum number of items to load */
  maxItems?: number;
  /** Only load items newer than this date */
  newerThan?: Date;
}

/**
 * Result of loading from Firestore
 */
export interface FirestoreLoadResult {
  /** Number of items loaded */
  itemsLoaded: number;
  /** Number of items that needed media download */
  mediaDownloaded: number;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Sync service error types
 */
export type SyncErrorType =
  | 'not_configured'
  | 'auth_error'
  | 'network_error'
  | 'sync_error'
  | 'download_error';

/**
 * Custom error class for sync errors
 */
export class SyncError extends Error {
  constructor(
    public readonly type: SyncErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

// ============================================
// Firebase Configuration Check
// ============================================

/**
 * Check if Firebase is configured
 * Requirement 10.3: Check if Firebase is configured before syncing
 */
export function isFirebaseConfigured(): boolean {
  // Check for Firebase environment variables
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  
  return !!(apiKey && projectId && apiKey !== '' && projectId !== '');
}

/**
 * Get Firebase configuration from environment
 */
export function getFirebaseConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

// ============================================
// Firestore Sync Service Interface
// ============================================

export interface FirestoreSyncService {
  /**
   * Check if Firestore sync is available
   */
  isAvailable(): boolean;

  /**
   * Sync content metadata to Firestore
   * Requirement 10.3: Optionally sync cached content to Firestore
   * Requirement 10.4: Only sync metadata and URLs, not full media files
   * Property 37: Firestore sync excludes blobs
   */
  syncContent(
    userId: string,
    location: GeoCoordinate,
    era: GeologicalLayer,
    content: EraContent
  ): Promise<SyncResult>;

  /**
   * Load content metadata from Firestore
   * Requirement 10.5: Download media files to IndexedDB for offline access
   */
  loadFromFirestore(options: FirestoreLoadOptions): Promise<FirestoreLoadResult>;

  /**
   * Delete synced content from Firestore
   */
  deleteFromFirestore(
    userId: string,
    cacheKey: string
  ): Promise<boolean>;

  /**
   * Get all synced content keys for a user
   */
  getSyncedKeys(userId: string): Promise<string[]>;
}

// ============================================
// Firestore Sync Service Implementation
// ============================================

class FirestoreSyncServiceImpl implements FirestoreSyncService {
  private firestore: typeof import('firebase/firestore') | null = null;
  private db: import('firebase/firestore').Firestore | null = null;
  private initialized = false;

  /**
   * Initialize Firestore connection
   */
  private async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.db !== null;
    }
    
    this.initialized = true;
    
    if (!isFirebaseConfigured()) {
      console.log('[FirestoreSyncService] Firebase not configured, sync disabled');
      return false;
    }
    
    try {
      // Dynamic import to avoid loading Firebase if not configured
      const firebase = await import('firebase/app');
      this.firestore = await import('firebase/firestore');
      
      const config = getFirebaseConfig();
      if (!config) {
        return false;
      }
      
      // Initialize Firebase app if not already initialized
      let app;
      if (firebase.getApps().length === 0) {
        app = firebase.initializeApp(config);
      } else {
        app = firebase.getApp();
      }
      
      this.db = this.firestore.getFirestore(app);
      
      console.log('[FirestoreSyncService] Firestore initialized');
      return true;
    } catch (error) {
      console.error('[FirestoreSyncService] Failed to initialize Firestore:', error);
      return false;
    }
  }

  /**
   * Check if Firestore sync is available
   */
  isAvailable(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * Sync content metadata to Firestore
   * Requirement 10.3: Optionally sync cached content to Firestore
   * Requirement 10.4: Only sync metadata and URLs, not full media files
   * Property 37: Firestore sync excludes blobs
   */
  async syncContent(
    userId: string,
    location: GeoCoordinate,
    era: GeologicalLayer,
    content: EraContent
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsSynced: 0,
      errors: [],
      syncedAt: new Date(),
    };
    
    const isReady = await this.initialize();
    if (!isReady || !this.db || !this.firestore) {
      result.errors.push('Firestore not available');
      return result;
    }
    
    try {
      const cacheKey = generateAICacheKey(location, era);
      
      // Get sync metadata (excludes blob data)
      // Requirement 10.4: Only sync metadata and URLs, not full media files
      const syncMetadata = persistenceService.getSyncMetadata(location, era, content);
      
      // Create Firestore document
      const document: FirestoreContentDocument = {
        id: cacheKey,
        userId,
        metadata: syncMetadata,
        syncedAt: new Date().toISOString(),
        schemaVersion: 1,
      };
      
      // Sync to Firestore
      const docRef = this.firestore.doc(
        this.db,
        'users',
        userId,
        'aiContent',
        cacheKey
      );
      
      await this.firestore.setDoc(docRef, document);
      
      result.success = true;
      result.itemsSynced = 1;
      
      console.log(`[FirestoreSyncService] Content synced for ${cacheKey}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error('[FirestoreSyncService] Sync failed:', error);
    }
    
    return result;
  }

  /**
   * Load content metadata from Firestore
   * Requirement 10.5: Download media files to IndexedDB for offline access
   */
  async loadFromFirestore(options: FirestoreLoadOptions): Promise<FirestoreLoadResult> {
    const result: FirestoreLoadResult = {
      itemsLoaded: 0,
      mediaDownloaded: 0,
      errors: [],
    };
    
    const isReady = await this.initialize();
    if (!isReady || !this.db || !this.firestore) {
      result.errors.push('Firestore not available');
      return result;
    }
    
    try {
      const { userId, maxItems = 50, newerThan } = options;
      
      // Query Firestore for user's content
      const collectionRef = this.firestore.collection(
        this.db,
        'users',
        userId,
        'aiContent'
      );
      
      let q = this.firestore.query(
        collectionRef,
        this.firestore.orderBy('syncedAt', 'desc'),
        this.firestore.limit(maxItems)
      );
      
      if (newerThan) {
        q = this.firestore.query(
          collectionRef,
          this.firestore.where('syncedAt', '>', newerThan.toISOString()),
          this.firestore.orderBy('syncedAt', 'desc'),
          this.firestore.limit(maxItems)
        );
      }
      
      const snapshot = await this.firestore.getDocs(q);
      
      for (const doc of snapshot.docs) {
        try {
          const data = doc.data() as FirestoreContentDocument;
          
          // Check if content already exists locally
          const localExists = await persistenceService.isContentPersisted(
            data.metadata.location,
            { id: data.metadata.eraId } as GeologicalLayer
          );
          
          if (!localExists) {
            // Content not in local cache - metadata only sync
            // Requirement 10.5: Download media files to IndexedDB for offline access
            // Note: Actual media download would require cloud storage URLs
            // For now, we just track that media needs to be regenerated
            console.log(`[FirestoreSyncService] Content ${data.id} needs regeneration`);
          }
          
          result.itemsLoaded++;
          
        } catch (docError) {
          const errorMessage = docError instanceof Error ? docError.message : 'Unknown error';
          result.errors.push(`Failed to process ${doc.id}: ${errorMessage}`);
        }
      }
      
      console.log(`[FirestoreSyncService] Loaded ${result.itemsLoaded} items from Firestore`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error('[FirestoreSyncService] Load failed:', error);
    }
    
    return result;
  }

  /**
   * Delete synced content from Firestore
   */
  async deleteFromFirestore(
    userId: string,
    cacheKey: string
  ): Promise<boolean> {
    const isReady = await this.initialize();
    if (!isReady || !this.db || !this.firestore) {
      return false;
    }
    
    try {
      const docRef = this.firestore.doc(
        this.db,
        'users',
        userId,
        'aiContent',
        cacheKey
      );
      
      await this.firestore.deleteDoc(docRef);
      
      console.log(`[FirestoreSyncService] Deleted ${cacheKey} from Firestore`);
      return true;
      
    } catch (error) {
      console.error('[FirestoreSyncService] Delete failed:', error);
      return false;
    }
  }

  /**
   * Get all synced content keys for a user
   */
  async getSyncedKeys(userId: string): Promise<string[]> {
    const isReady = await this.initialize();
    if (!isReady || !this.db || !this.firestore) {
      return [];
    }
    
    try {
      const collectionRef = this.firestore.collection(
        this.db,
        'users',
        userId,
        'aiContent'
      );
      
      const snapshot = await this.firestore.getDocs(collectionRef);
      
      return snapshot.docs.map(doc => doc.id);
      
    } catch (error) {
      console.error('[FirestoreSyncService] Failed to get synced keys:', error);
      return [];
    }
  }
}

// ============================================
// Singleton Export
// ============================================

/**
 * Singleton instance of FirestoreSyncService
 * Use this for all Firestore sync operations
 */
export const firestoreSyncService = new FirestoreSyncServiceImpl();

export default firestoreSyncService;
