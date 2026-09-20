import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'fishlensai_jwt_token';
const USER_KEY = 'fishlensai_auth_user';
const API_URL_KEY = 'fishlensai_custom_api_url';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export class AuthStorage {
  // Securely save JWT
  static async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to save token:', e);
    }
  }

  // Retrieve stored JWT
  static async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY);
        }
        return null;
      } else {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to retrieve token:', e);
      return null;
    }
  }

  // Check if currently authenticated
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Remove stored JWT
  static async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to remove token:', e);
    }
  }

  // Save logged in user details
  static async saveUser(user: AuthUser): Promise<void> {
    try {
      const serialized = JSON.stringify(user);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(USER_KEY, serialized);
        }
      } else {
        await SecureStore.setItemAsync(USER_KEY, serialized);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to save user:', e);
    }
  }

  // Retrieve logged in user details
  static async getUser(): Promise<AuthUser | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          raw = window.localStorage.getItem(USER_KEY);
        }
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[AuthStorage] Failed to retrieve user:', e);
      return null;
    }
  }

  // Custom API URL configuration
  static async saveCustomApiUrl(url: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(API_URL_KEY, url);
        }
      } else {
        await SecureStore.setItemAsync(API_URL_KEY, url);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to save custom API URL:', e);
    }
  }

  static async getCustomApiUrl(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(API_URL_KEY);
        }
        return null;
      } else {
        return await SecureStore.getItemAsync(API_URL_KEY);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to retrieve custom API URL:', e);
      return null;
    }
  }

  // Clear all auth state
  static async clearAuth(): Promise<void> {
    await this.removeToken();
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(USER_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch (e) {
      console.warn('[AuthStorage] Failed to clear user:', e);
    }
  }
}

export default AuthStorage;
