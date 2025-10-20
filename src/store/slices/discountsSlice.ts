import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DiscountRule {
  id: number;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  discount_display: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  min_orders: number;
  min_total_spent: number;
  work_types: Array<{
    id: number;
    name: string;
  }>;
}

interface UserStats {
  total_orders: number;
  total_spent: number;
}

export interface UserDiscounts {
  available_discounts: DiscountRule[];
  nearly_available: Array<{
    discount: DiscountRule;
    orders_remaining: number;
    spent_remaining: number;
  }>;
  user_stats: UserStats;
}

interface DiscountsState {
  discounts: UserDiscounts | null;
  loading: boolean;
  error: string | null;
}

const initialState: DiscountsState = {
  discounts: null,
  loading: false,
  error: null,
};

const discountsSlice = createSlice({
  name: 'discounts',
  initialState,
  reducers: {
    setDiscounts: (state, action: PayloadAction<UserDiscounts>) => {
      state.discounts = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setDiscounts, setLoading, setError } = discountsSlice.actions;
export default discountsSlice.reducer; 