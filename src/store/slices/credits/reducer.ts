import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { CreditBalance } from '@/services/marketifyall-api'

export interface CreditsState {
  balance: CreditBalance | null
  loading: boolean
  error: string | null
}

const initialState: CreditsState = {
  balance: null,
  loading: false,
  error: null,
}

const creditsSlice = createSlice({
  name: 'credits',
  initialState,
  reducers: {
    setBalance(state, action: PayloadAction<CreditBalance>) {
      state.balance = action.payload
      state.loading = false
      state.error = null
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload
      state.loading = false
    },
    clearCredits(state) {
      state.balance = null
      state.loading = false
      state.error = null
    },
  },
})

export const { setBalance, setLoading, setError, clearCredits } = creditsSlice.actions
export const creditsReducer = creditsSlice.reducer
