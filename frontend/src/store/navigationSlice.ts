import { createSlice } from '@reduxjs/toolkit';

const navigationSlice = createSlice({
  name: 'navigation',
  initialState: { mobileMenuOpen: false },
  reducers: {
    openMobileMenu(state) {
      state.mobileMenuOpen = true;
    },
    closeMobileMenu(state) {
      state.mobileMenuOpen = false;
    },
  },
});

export const { openMobileMenu, closeMobileMenu } = navigationSlice.actions;
export const navigationReducer = navigationSlice.reducer;
