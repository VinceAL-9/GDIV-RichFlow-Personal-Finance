// API utility functions for making authenticated requests

const API_BASE_URL = 'http://localhost:5000/api';

// Store access token in memory (not localStorage for security)
let accessToken: string | null = null;

// Get stored access token from memory
export const getAccessToken = (): string | null => {
  return accessToken;
};

// Set access token in memory
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

// Clear access token from memory
export const clearAccessToken = (): void => {
  accessToken = null;
};

// Broadcast an auth change event (used to reset in-memory stores)
const broadcastAuthChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:changed'));
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!accessToken;
};

// API request wrapper with authentication
interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiRequest = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> => {
  const { requiresAuth = false, headers = {}, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Only add Authorization header if authentication is required
  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      // If no token in memory, try to refresh before making the request
      const refreshed = await refreshAccessToken();
      const newToken = getAccessToken();
      if (refreshed && newToken) {
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
      }
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include' // Always include cookies (for refresh token)
    });

    const data = await response.json();

    if (!response.ok) {
      // Only try to refresh tokens if auth is actually required
      if (requiresAuth && (response.status === 401 || response.status === 403)) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          const newToken = getAccessToken();
          if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
          } else {
            delete requestHeaders['Authorization'];
          }

          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...restOptions,
            headers: requestHeaders,
            credentials: 'include'
          });

          const retryData = await retryResponse.json();
          if (!retryResponse.ok) {
            throw new Error(retryData.error || 'Request failed');
          }
          return retryData;
        } else {
          // Refresh failed, clear token and notify app; do not force redirect here
          clearAccessToken();
          broadcastAuthChanged();
          throw new Error('Session expired. Please login again.');
        }
      }

      // For non-auth endpoints, just throw the error without trying to refresh
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error: any) {
    console.error('API request error:', error);
    throw error;
  }
};

// Refresh access token using refresh token cookie
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Send refresh token cookie
    });

    // If 401 or 403, it means no refresh token or expired - this is normal for logged out users
    if (response.status === 401 || response.status === 403) {
      return false;
    }

    const data = await response.json();

    if (!response.ok) {
      return false;
    }

    // Store new access token in memory
    setAccessToken(data.accessToken);
    console.log('Access token refreshed successfully');
    return true;
  } catch (error) {
    // Silent fail - no refresh token is normal for logged out users
    return false;
  }
};

// Auth API calls
export const authAPI = {
  // Login
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include' // Include cookies (refresh token will be set)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    console.log('Login response:', data);
    console.log('Access token received:', data.accessToken);

    // Store access token in memory
    setAccessToken(data.accessToken);

    console.log('Access token stored, current token:', getAccessToken());

    // Notify app that auth/user context changed (reset stores)
    broadcastAuthChanged();

    return data;
  },

  // Signup
  signup: async (name: string, email: string, password: string) => {
    const response = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return response;
  },

  // Get user profile
  getProfile: async () => {
    const response = await apiRequest('/auth/profile', {
      method: 'GET',
      requiresAuth: true,
    });
    return response;
  },

  // Logout
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include' // Send refresh token cookie
      });
    } finally {
      clearAccessToken();
      broadcastAuthChanged();
    }
  },

  // Logout all devices
  logoutAll: async () => {
    try {
      await apiRequest('/auth/logout-all', {
        method: 'POST',
        requiresAuth: true,
      });
    } finally {
      clearAccessToken();
      broadcastAuthChanged();
    }
  },
  
  // Update username (persisted)
  updateUsername: async (name: string) => {
    return await apiRequest('/auth/username', {
      method: 'PUT',
      body: JSON.stringify({ name }),
      requiresAuth: true,
    });
  },
  // Update email (persisted)
  updateEmail: async (email: string) => {
    return await apiRequest('/auth/email', {
      method: 'PUT',
      body: JSON.stringify({ email }),
      requiresAuth: true,
    });
  },

  // Update password (persisted)
  updatePassword: async (currentPassword: string, newPassword: string) => {
    return await apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
      requiresAuth: true,
    });
  },
};

// Income API calls
export const incomeAPI = {
  // Get all income lines
  getIncomeLines: async () => {
    return await apiRequest('/income', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Add new income line
  addIncomeLine: async (name: string, amount: number, type: string, quadrant?: string) => {
    return await apiRequest('/income', {
      method: 'POST',
      body: JSON.stringify({ name, amount, type, quadrant }),
      requiresAuth: true,
    });
  },

  // Update income line
  updateIncomeLine: async (id: number, name: string, amount: number, type: string, quadrant?: string) => {
    return await apiRequest(`/income/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, amount, type, quadrant }),
      requiresAuth: true,
    });
  },

  // Delete income line
  deleteIncomeLine: async (id: number) => {
    return await apiRequest(`/income/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

// Expenses API calls
export const expensesAPI = {
  // Get all expenses
  getExpenses: async () => {
    return await apiRequest('/expenses', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Add new expense
  addExpense: async (name: string, amount: number) => {
    return await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify({ name, amount }),
      requiresAuth: true,
    });
  },

  // Update expense
  updateExpense: async (id: number, name: string, amount: number) => {
    return await apiRequest(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, amount }),
      requiresAuth: true,
    });
  },

  // Delete expense
  deleteExpense: async (id: number) => {
    return await apiRequest(`/expenses/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

// Cash Savings API calls
export const cashSavingsAPI = {
  // Get cash savings
  getCashSavings: async () => {
    return await apiRequest('/cash-savings', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Update cash savings amount
  updateCashSavings: async (amount: number) => {
    return await apiRequest('/cash-savings', {
      method: 'PUT',
      body: JSON.stringify({ amount }),
      requiresAuth: true,
    });
  },
};


// Balance Sheet API calls
export const balanceSheetAPI = {
  // Get balance sheet
  getBalanceSheet: async () => {
    return await apiRequest('/balance-sheet', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Create balance sheet
  createBalanceSheet: async () => {
    return await apiRequest('/balance-sheet', {
      method: 'POST',
      requiresAuth: true,
    });
  },
};

// Assets API calls
export const assetsAPI = {
  // Get all assets
  getAssets: async () => {
    return await apiRequest('/assets', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Add new asset
  addAsset: async (name: string, value: number) => {
    return await apiRequest('/assets', {
      method: 'POST',
      body: JSON.stringify({ name, value }),
      requiresAuth: true,
    });
  },

  // Update asset
  updateAsset: async (id: number, name: string, value: number) => {
    return await apiRequest(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, value }),
      requiresAuth: true,
    });
  },

  // Delete asset
  deleteAsset: async (id: number) => {
    return await apiRequest(`/assets/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

// Liabilities API calls
export const liabilitiesAPI = {
  // Get all liabilities
  getLiabilities: async () => {
    return await apiRequest('/liabilities', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Add new liability
  addLiability: async (name: string, value: number) => {
    return await apiRequest('/liabilities', {
      method: 'POST',
      body: JSON.stringify({ name, value }),
      requiresAuth: true,
    });
  },

  // Update liability
  updateLiability: async (id: number, name: string, value: number) => {
    return await apiRequest(`/liabilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, value }),
      requiresAuth: true,
    });
  },

  // Delete liability
  deleteLiability: async (id: number) => {
    return await apiRequest(`/liabilities/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

// Financial Analysis API call
export const aiAPI = {
  getFinancialAnalysis: async (includeBalanceSheet: boolean = true) => {
    return await apiRequest(`/ai/showinformation?includeBalanceSheet=${includeBalanceSheet}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }
}

// Analysis API calls
export const analysisAPI = {
  getFinancialSnapshot: async (date?: string) => {
    const url = date ? `/analysis/snapshot?date=${date}` : '/analysis/snapshot';
    return await apiRequest(url, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

// Events API calls
export const eventsAPI = {
  // Get events for the authenticated user with optional filters
  getEvents: async (params?: {
    entityType?: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'CASH_SAVINGS' | 'USER';
    startDate?: string; // ISO or YYYY-MM-DD
    endDate?: string;   // ISO or YYYY-MM-DD
    limit?: number;
    offset?: number;
  }) => {
    const q: string[] = [];
    if (params?.entityType) q.push(`entityType=${encodeURIComponent(params.entityType)}`);
    if (params?.startDate) q.push(`startDate=${encodeURIComponent(params.startDate)}`);
    if (params?.endDate) q.push(`endDate=${encodeURIComponent(params.endDate)}`);
    if (typeof params?.limit === 'number') q.push(`limit=${params.limit}`);
    if (typeof params?.offset === 'number') q.push(`offset=${params.offset}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    return await apiRequest(`/events${qs}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

// Admin API calls
export const adminAPI = {
  // Get all users
  getUsers: async () => {
    return await apiRequest('/admin/users', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Get single user by ID
  getUser: async (userId: number) => {
    return await apiRequest(`/admin/users/${userId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Delete user by ID
  deleteUser: async (userId: number) => {
    return await apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  // Get user's financial data
  getUserFinancials: async (userId: number) => {
    return await apiRequest(`/admin/users/${userId}/financial`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

// Events API calls
export const eventsAPI = {
  // Get all events for the authenticated user
  getEvents: async (params?: {
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.entityType) queryParams.append('entityType', params.entityType);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/events?${queryString}` : '/events';
    
    return await apiRequest(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Get events for a specific entity
  getEntityEvents: async (entityType: string, entityId: number) => {
    return await apiRequest(`/events/${entityType}/${entityId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

// Currency API calls
export const currencyAPI = {
  // Get all available currencies (public endpoint)
  getCurrencies: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/currency`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch currencies' }));
        throw new Error(errorData.error || 'Failed to fetch currencies');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw error;
    }
  },

  // Get user's preferred currency
  getUserCurrency: async () => {
    return await apiRequest('/currency/user', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // Update user's preferred currency
  updateUserCurrency: async (currencyId: number) => {
    return await apiRequest('/currency/user', {
      method: 'PUT',
      body: JSON.stringify({ currencyId }),
      requiresAuth: true,
    });
  },
};