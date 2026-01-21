/**
 * Storage Service
 * Handles localStorage operations with type safety
 */

import { STORAGE_KEYS } from './constants';

class StorageService {
  /**
   * Set item in localStorage
   */
  setItem<T>(key: string, value: T): void {
    try {
      const stringValue = JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Error saving to storage (${key}):`, error);
      throw error;
    }
  }

  /**
   * Get item from localStorage
   */
  getItem<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
      throw error;
    }
  }

  /**
   * Clear all localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Save authentication tokens
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    this.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    this.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Save user data
   */
  saveUserData(userData: any): void {
    this.setItem(STORAGE_KEYS.USER_DATA, userData);
  }

  /**
   * Get user data
   */
  getUserData<T>(): T | null {
    return this.getItem<T>(STORAGE_KEYS.USER_DATA);
  }

  /**
   * Clear user data
   */
  clearUserData(): void {
    this.removeItem(STORAGE_KEYS.USER_DATA);
  }
}

export const storage = new StorageService();
