import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import examReducer from '../features/exams/examSlice';
import resultReducer from '../features/results/resultSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exams: examReducer,
    results: resultReducer,
  },
});
