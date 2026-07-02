import { IElement } from '@/interfaces/editor'
import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import api from '@services/api'
import { log } from '@/lib/logger'

export const setElements = createAction<IElement[]>('elements/setlements')

export const getElements = createAsyncThunk(
  'elements/getElements',
  async (_, { dispatch }) => {
    try {
      const elements = await api.getElements()
      dispatch(setElements(elements))
    } catch (err) {
      log.warn('store', 'elements persistence failed', err)
    }
  }
)
