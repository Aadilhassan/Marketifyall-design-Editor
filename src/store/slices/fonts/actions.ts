import { IFontFamily } from '@/interfaces/editor'
import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import api from '@services/api'

export const setFonts = createAction<IFontFamily[]>('fonts/setFonts')

export const getFonts = createAsyncThunk(
  'fonts/getFonts',
  async (_, { dispatch }) => {
    try {
      const fonts = await api.getFonts()
      dispatch(setFonts(fonts || []))
    } catch (err) {
      dispatch(setFonts([]))
    }
  }
)
