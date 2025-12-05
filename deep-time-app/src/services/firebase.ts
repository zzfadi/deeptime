/**
 * Firebase Service
 * Provides Firebase initialization, Firestore operations, and offline sync
 * Requirements: 2.5, 5.1
 */

import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  enableIndexedDbPersistence,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import type { CachedLocation, GeoCoordinate, GeologicalStack, Narrative } from 'deep-time-core/types';

// ============================================
// Types
// ============================================

export interface FirebaseService {
  /** Initialize Firebase with config */
  initialize(config: FirebaseConfig): Promise<void>;
  
  /** Check if Firebase is initialized */
  isInitialized(): boolean;
  
  /** Store location data */
  saveLocation(userId: string, data: CachedLocation): Promise<void>;
  
  /** Get user's cached locations */
  getLocations(userId: string): Promise<CachedLocation[]>;
  
  /** Delete cached location */
  deleteLocation(userId: string, locationId: string): Promise<void>;
  
  /** Subscribe to location changes for real-time sync */
  subscribeToLocations(
    userId: string,
    onUpdate: (locations: CachedLocation[]) => void,
    onError?: (error: FirebaseError) => void
  ): Unsubscribe;
  
  /** Check if currently offline */
  isOffline(): boolean;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type FirebaseErrorType =
  | 'not_initialized'
  | 'initialization_failed'
  | 'permission_denied'
  | 'network_error'
  | 'document_not_found'
  | 'quota_exceeded'
  | 'unknown';

export class FirebaseError extends Error {
  constructor(
    public readonly type: FirebaseErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'FirebaseError';
  }
}

// ============================================
// Firestore Document Types
// ============================================

/**
 * Firestore-compatible version of CachedLocation
 * Dates are stored as ISO strings for Firestore compatibility
 */
interface FirestoreCachedLocation {
  id: string;
  location: GeoCoordinate;
  geologicalStack: FirestoreGeologicalStack;
  narratives: Narrative[];
  cachedAt: string; // ISO date string
  lastAccessed: string; // ISO date string
  schemaVersion: number;
}

interface FirestoreGeologicalStack {
  location: GeoCoordinate;
  layers: GeologicalStack['layers'];
  queryTimestamp: string; // ISO date string
  dataSource: string;
  confidence: number;
}

// ============================================
// Conversion Utilities
// ============================================

/**
 * Converts CachedLocation to Firestore-compatible format
 */
function toFirestoreLocation(data: CachedLocation): FirestoreCachedLocation {
  return {
    id: data.id,
    location: data.location,
    geologicalStack: {
      ...data.geologicalStack,
      queryTimestamp: data.geologicalStack.queryTimestamp.toISOString(),
    },
    narratives: data.narratives,
    cachedAt: data.cachedAt.toISOString(),
    lastAccessed: data.lastAccessed.toISOString(),
    schemaVersion: data.schemaVersion,
  };
}

/**
 * Converts Firestore document to CachedLocation
 */
function fromFirestoreLocation(data: FirestoreCachedLocation): CachedLocation {
  return {
    id: data.id,
    location: data.location,
    geologicalStack: {
      ...data.geologicalStack,
      queryTimestamp: new Date(data.geologicalStack.queryTimestamp),
    },
    narratives: data.narratives,
    cachedAt: new Date(data.cachedAt),
    lastAccessed: new Date(data.lastAccessed),
    schemaVersion: data.schemaVersion,
  };
}

// ============================================
// Firebase Service State
// ============================================

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let offlineEnabled = false;
let isCurrentlyOffline = false;

// Track online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isCurrentlyOffline = false;
  });
  window.addEventListener('offline', () => {
    isCurrentlyOffline = true;
  });
  isCurrentlyOffline = !navigator.onLine;
}

// ============================================
// Firebase Service Implementation
// ============================================

export const firebaseService: FirebaseService = {
  /**
   * Initialize Firebase with configuration
   * Enables offline persistence for Firestore
   */
  async initialize(config: FirebaseConfig): Promise<void> {
    try {
      // Check if already initialized
      if (getApps().length > 0) {
        firebaseApp = getApp();
        firestoreDb = getFirestore(firebaseApp);
        return;
      }

      // Initialize Firebase app
      firebaseApp = initializeApp(config);
      firestoreDb = getFirestore(firebaseApp);

      // Enable offline persistence
      // This allows the app to work offline and sync when back online
      // Requirement 5.1: Cache geological data to Firebase
      if (!offlineEnabled) {
        try {
          await enableIndexedDbPersistence(firestoreDb);
          offlineEnabled = true;
        } catch (err) {
          const error = err as { code?: string };
          if (error.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab
            console.warn('Firebase persistence unavailable: multiple tabs open');
          } else if (error.code === 'unimplemented') {
            // Browser doesn't support persistence
            console.warn('Firebase persistence unavailable: browser not supported');
          }
          // Continue without persistence - not a fatal error
        }
      }
    } catch (error) {
      throw new FirebaseError(
        'initialization_failed',
        'Failed to initialize Firebase. Please check your configuration.',
        error
      );
    }
  },

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return firebaseApp !== null && firestoreDb !== null;
  },

  /**
   * Save location data to Firestore
   * Requirement 2.5: Cache narrative in Firebase for offline access
   * Requirement 5.1: Cache geological data to Firebase
   */
  async saveLocation(userId: string, data: CachedLocation): Promise<void> {
    if (!firestoreDb) {
      throw new FirebaseError(
        'not_initialized',
        'Firebase is not initialized. Call initialize() first.'
      );
    }

    try {
      const locationRef = doc(
        firestoreDb,
        'users',
        userId,
        'locations',
        data.id
      );

      const firestoreData = toFirestoreLocation(data);
      await setDoc(locationRef, firestoreData);
    } catch (error) {
      throw mapFirestoreError(error);
    }
  },

  /**
   * Get all cached locations for a user
   * Returns locations sorted by lastAccessed (most recent first)
   */
  async getLocations(userId: string): Promise<CachedLocation[]> {
    if (!firestoreDb) {
      throw new FirebaseError(
        'not_initialized',
        'Firebase is not initialized. Call initialize() first.'
      );
    }

    try {
      const locationsRef = collection(
        firestoreDb,
        'users',
        userId,
        'locations'
      );

      const q = query(locationsRef, orderBy('lastAccessed', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreCachedLocation;
        return fromFirestoreLocation(data);
      });
    } catch (error) {
      throw mapFirestoreError(error);
    }
  },

  /**
   * Delete a cached location
   */
  async deleteLocation(userId: string, locationId: string): Promise<void> {
    if (!firestoreDb) {
      throw new FirebaseError(
        'not_initialized',
        'Firebase is not initialized. Call initialize() first.'
      );
    }

    try {
      const locationRef = doc(
        firestoreDb,
        'users',
        userId,
        'locations',
        locationId
      );

      await deleteDoc(locationRef);
    } catch (error) {
      throw mapFirestoreError(error);
    }
  },

  /**
   * Subscribe to real-time location updates
   * Useful for syncing across devices and handling offline/online transitions
   */
  subscribeToLocations(
    userId: string,
    onUpdate: (locations: CachedLocation[]) => void,
    onError?: (error: FirebaseError) => void
  ): Unsubscribe {
    if (!firestoreDb) {
      const error = new FirebaseError(
        'not_initialized',
        'Firebase is not initialized. Call initialize() first.'
      );
      onError?.(error);
      return () => {}; // Return no-op unsubscribe
    }

    const locationsRef = collection(
      firestoreDb,
      'users',
      userId,
      'locations'
    );

    const q = query(locationsRef, orderBy('lastAccessed', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const locations = snapshot.docs.map((doc) => {
          const data = doc.data() as FirestoreCachedLocation;
          return fromFirestoreLocation(data);
        });
        onUpdate(locations);
      },
      (error) => {
        onError?.(mapFirestoreError(error));
      }
    );
  },

  /**
   * Check if the app is currently offline
   */
  isOffline(): boolean {
    return isCurrentlyOffline;
  },
};

// ============================================
// Error Mapping
// ============================================

/**
 * Maps Firestore errors to our FirebaseError type
 */
function mapFirestoreError(error: unknown): FirebaseError {
  const firestoreError = error as { code?: string; message?: string };
  const code = firestoreError.code || '';
  const message = firestoreError.message || 'An unknown error occurred';

  if (code.includes('permission-denied')) {
    return new FirebaseError(
      'permission_denied',
      'You do not have permission to access this data.',
      error
    );
  }

  if (code.includes('unavailable') || code.includes('network')) {
    return new FirebaseError(
      'network_error',
      'Network error. Your changes will sync when you are back online.',
      error
    );
  }

  if (code.includes('not-found')) {
    return new FirebaseError(
      'document_not_found',
      'The requested data was not found.',
      error
    );
  }

  if (code.includes('resource-exhausted')) {
    return new FirebaseError(
      'quota_exceeded',
      'Storage quota exceeded. Please delete some cached locations.',
      error
    );
  }

  return new FirebaseError('unknown', message, error);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a unique location ID from coordinates
 * Uses 5 decimal places (~1.1m precision)
 */
export function generateLocationId(location: GeoCoordinate): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `loc_${lat}_${lon}`;
}

/**
 * Create a new CachedLocation object
 */
export function createCachedLocation(
  location: GeoCoordinate,
  geologicalStack: GeologicalStack,
  narratives: Narrative[] = []
): CachedLocation {
  const now = new Date();
  return {
    id: generateLocationId(location),
    location,
    geologicalStack,
    narratives,
    cachedAt: now,
    lastAccessed: now,
    schemaVersion: 1,
  };
}

export default firebaseService;
