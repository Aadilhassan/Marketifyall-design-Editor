import { Template } from '@/interfaces/editor'
import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import api from '@services/api'

export const setCreations = createAction<Template[]>('creations/setCreations')
export const updateCreationsList = createAction<Template>('creations/updateCreationList')

export const getCreations = createAsyncThunk(
  'creations/getCreations',
  async (_, { dispatch }) => {
    try {
      const creations = await api.getCreations()
      dispatch(setCreations(creations as unknown as Template[]))
    } catch (err) {
      // silently fail
    }
  }
)

export const createCreation = createAsyncThunk<void, { creation: Template }, any>(
  'creations/createCreation',
  async (args, { dispatch }) => {
    const savedCreation = await api.createCreation(args.creation as any)
    dispatch(setCreations([savedCreation as unknown as Template]))
  }
)
