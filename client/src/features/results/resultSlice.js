import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchResults = createAsyncThunk('results/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/results', { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to fetch results' });
  }
});

export const createResult = createAsyncThunk('results/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/results', payload);
    return data.result;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to create result' });
  }
});

export const updateResult = createAsyncThunk('results/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/results/${id}`, payload);
    return data.result;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to update result' });
  }
});

export const transitionResult = createAsyncThunk('results/transition', async ({ id, action }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/results/${id}/transition`, { action });
    return data.result;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to transition result' });
  }
});

export const bulkPublish = createAsyncThunk('results/bulkPublish', async (examId, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/results/exam/${examId}/publish`);
    return { examId, count: data.count };
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || { message: 'Failed to bulk publish' });
  }
});

const resultSlice = createSlice({
  name: 'results',
  initialState: { items: [], pagination: null, loading: false, error: null, concurrencyError: null, tripwireError: null },
  reducers: {
    clearResultErrors(state) { state.error = null; state.concurrencyError = null; state.tripwireError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResults.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchResults.fulfilled, (s, a) => { s.loading = false; s.items = a.payload.results; s.pagination = a.payload.pagination; })
      .addCase(fetchResults.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(createResult.pending, (s) => { s.tripwireError = null; s.error = null; })
      .addCase(createResult.fulfilled, (s, a) => { s.items.unshift(a.payload); })
      .addCase(createResult.rejected, (s, a) => {
        if (a.payload?.code === 'EXAM_NOT_COMPLETED') s.tripwireError = a.payload;
        else s.error = a.payload;
      })
      .addCase(updateResult.fulfilled, (s, a) => {
        const idx = s.items.findIndex((r) => r.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(updateResult.rejected, (s, a) => {
        if (a.payload?.code === 'CONCURRENCY_CONFLICT') s.concurrencyError = a.payload;
        else if (a.payload?.code === 'EXAM_NOT_COMPLETED') s.tripwireError = a.payload;
        else s.error = a.payload;
      })
      .addCase(transitionResult.fulfilled, (s, a) => {
        const idx = s.items.findIndex((r) => r.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(bulkPublish.fulfilled, (s, a) => {
        s.items = s.items.map((r) =>
          r.examId === a.payload.examId && r.status === 'ready'
            ? { ...r, status: 'published' }
            : r
        );
      });
  },
});

export const { clearResultErrors } = resultSlice.actions;
export default resultSlice.reducer;
