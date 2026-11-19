import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Session } from './session';

export type AuthState = {
  session: Session | null;
  generation: number;
  reason: 'expired' | null;
};

const initialState: AuthState = { session: null, generation: 0, reason: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<Session>) {
      state.session = action.payload;
      state.generation += 1;
      state.reason = null;
    },
    sessionEnded(state, action: PayloadAction<'expired' | 'logout'>) {
      state.session = null;
      state.generation += 1;
      state.reason = action.payload === 'expired' ? 'expired' : null;
    },
  },
});

export const { sessionStarted, sessionEnded } = authSlice.actions;
export const authReducer = authSlice.reducer;
