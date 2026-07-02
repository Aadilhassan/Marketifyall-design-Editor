import { Template } from '@/interfaces/editor'
import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import api from '@services/api'
import { log } from '@/lib/logger'

export const setTemplates = createAction<Template[]>('templates/setTemplates')

export const getTemplates = createAsyncThunk(
  'templates/getTemplates',
  async (_, { dispatch }) => {
    try {
      const templates = await api.getTemplates()
      dispatch(setTemplates(templates as unknown as Template[]))
    } catch (err) {
      log.warn('store', 'templates persistence failed', err)
    }
  }
)
