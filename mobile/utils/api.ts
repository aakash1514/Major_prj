/**
 * API Utility for React Native (Expo)
 * 
 * IMPORTANT: Configure the API_URL for your environment:
 * 
 * Android Emulator:
 *   Use 10.0.2.2 (special alias for localhost on Android emulator)
 * 
 * iOS Simulator:
 *   Use 127.0.0.1 or localhost
 * 
 * Physical Device (Android/iOS):
 *   Replace 192.168.x.x with your machine's local IP address.
 *   Find your IP: 
 *     - Windows: Run `ipconfig` in cmd, look for IPv4 Address
 *     - Mac/Linux: Run `ifconfig` in terminal, look for inet
 *   Example: http://192.168.1.105:5000/api
 */

import * as SecureStore from 'expo-secure-store';

// ─── NETWORK CONFIG ─────────────────────────────────────────────────────────
// For Expo Go on a physical device: set this to your machine's local IP.
// Find it with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
// Your phone and computer must be on the same Wi-Fi network.
//
// For Android emulator: use '10.0.2.2'
// For iOS simulator:    use 'localhost'
// For physical device:  use '192.168.X.X'  ← put your local IP here

const API_URL = 'https://tasha-unglutted-anisha.ngrok-free.dev/api';
export const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Makes authenticated API requests to the backend
 * Uses Expo SecureStore for JWT token storage
 */
export const api = {
  async parseResponse(response: Response) {
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (contentType.includes('application/json')) {
      try {
        return rawText ? JSON.parse(rawText) : null;
      } catch {
        return { error: 'Invalid JSON response', raw: rawText };
      }
    }

    return { error: 'Non-JSON response', raw: rawText };
  },
  /**
   * GET request
   */
  async get(endpoint: string) {
    const token = await SecureStore.getItemAsync('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const responseData = await this.parseResponse(response);

    if (!response.ok) {
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        responseData?.raw ||
        `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData;
  },

  /**
   * POST request
   */
  async post(endpoint: string, data: any) {
    const token = await SecureStore.getItemAsync('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    const responseData = await this.parseResponse(response);

    if (!response.ok) {
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        responseData?.raw ||
        `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData;
  },

  /**
   * PUT request
   */
  async put(endpoint: string, data: any) {
    const token = await SecureStore.getItemAsync('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    const responseData = await this.parseResponse(response);

    if (!response.ok) {
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        responseData?.raw ||
        `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData;
  },

  /**
   * DELETE request
   */
  async delete(endpoint: string) {
    const token = await SecureStore.getItemAsync('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const responseData = await this.parseResponse(response);

    if (!response.ok) {
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        responseData?.raw ||
        `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData;
  },
};
