import { createAsyncThunk } from '@reduxjs/toolkit'
import { marketifyallApi } from '@/services/marketifyall-api'
import { setBalance, setLoading, setError } from './reducer'

export const fetchCreditBalance = createAsyncThunk(
  'credits/fetchBalance',
  async (_, { dispatch }) => {
    dispatch(setLoading(true))
    try {
      const balance = await marketifyallApi.getCreditsBalance()
      dispatch(setBalance(balance))
      return balance
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to fetch credits'))
      throw err
    }
  }
)
