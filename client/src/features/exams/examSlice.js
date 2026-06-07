import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchExams = createAsyncThunk('exams/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/exams', { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to fetch exams' });
  }
});

export const createExam = createAsyncThunk('exams/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/exams', payload);
    return data.exam;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to create exam' });
  }
});

export const updateExam = createAsyncThunk('exams/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/exams/${id}`, payload);
    return data.exam;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to update exam' });
  }
});

export const deleteExam = createAsyncThunk('exams/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/exams/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to delete exam' });
  }
});

const examSlice = createSlice({
  name: 'exams',
  initialState: { items: [], pagination: null, loading: false, error: null, conflictError: null, concurrencyError: null },
  reducers: {
    clearExamErrors(state) { state.error = null; state.conflictError = null; state.concurrencyError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExams.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchExams.fulfilled, (s, a) => { s.loading = false; s.items = a.payload.exams; s.pagination = a.payload.pagination; })
      .addCase(fetchExams.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(createExam.pending, (s) => { s.conflictError = null; s.error = null; })
      .addCase(createExam.fulfilled, (s, a) => { s.items.unshift(a.payload); })
      .addCase(createExam.rejected, (s, a) => {
        if (a.payload?.code === 'SCHEDULE_CONFLICT') s.conflictError = a.payload;
        else s.error = a.payload;
      })
      .addCase(updateExam.fulfilled, (s, a) => {
        const idx = s.items.findIndex((e) => e.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(updateExam.rejected, (s, a) => {
        if (a.payload?.code === 'SCHEDULE_CONFLICT') s.conflictError = a.payload;
        else if (a.payload?.code === 'CONCURRENCY_CONFLICT') s.concurrencyError = a.payload;
        else s.error = a.payload;
      })
      .addCase(deleteExam.fulfilled, (s, a) => { s.items = s.items.filter((e) => e.id !== a.payload); });
  },
});

export const { clearExamErrors } = examSlice.actions;
export default examSlice.reducer;
