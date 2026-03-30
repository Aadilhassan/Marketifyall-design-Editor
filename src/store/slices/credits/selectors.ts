import { RootState } from '@/store/rootReducer'

export const selectCreditBalance = (state: RootState) => state.credits?.balance
export const selectCreditsLoading = (state: RootState) => state.credits?.loading
export const selectTotalCredits = (state: RootState) => state.credits?.balance?.total ?? 0
