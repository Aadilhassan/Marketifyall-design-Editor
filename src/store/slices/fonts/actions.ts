import { IFontFamily } from '@/interfaces/editor'
import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import api from '@services/api'
import { AxiosError } from 'axios'

export const setFonts = createAction<IFontFamily[]>('fonts/setFonts')

export const getFonts = createAsyncThunk<void, never, { rejectValue: Record<string, string[]> }>(
  'fonts/getFonts',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const fonts = await api.getFonts()
      // Always dispatch fonts, even if it's an empty array or default fonts
      // The API method now handles errors gracefully and returns fallback data
      dispatch(setFonts(fonts || []))
    } catch (err) {
      // Since api.getFonts() now always returns an array (never throws),
      // this catch block is mainly for unexpected errors
      console.warn('Unexpected error loading fonts:', err)
      // Dispatch empty array to prevent UI issues
      dispatch(setFonts([]))
      return rejectWithValue((err as AxiosError).response?.data?.error.data || null)
    }
  }
)
