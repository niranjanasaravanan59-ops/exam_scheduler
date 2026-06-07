import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Registration failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch {
    return rejectWithValue(null);
  }
});

const getUserFromStorage = () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) { localStorage.clear(); return null; }
    return payload;
  } catch { return null; }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: getUserFromStorage(),
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    logout(state) {
      state.user = null;
      localStorage.clear();
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(login.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; })
      .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(register.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(register.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; })
      .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; s.initialized = true; })
      .addCase(fetchMe.rejected, (s) => { s.user = null; s.initialized = true; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
