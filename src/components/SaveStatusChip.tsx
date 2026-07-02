import { useEffect, useState } from 'react'
import { styled } from 'baseui'
import type { SaveManager, SaveState } from '@/utils/saveManager'

const Chip = styled('button', ({ $tone }: { $tone: string }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  borderRadius: '14px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: $tone === 'error' ? 'pointer' : 'default',
  background: $tone === 'error' ? '#fee2e2' : $tone === 'saving' ? '#eef2ff' : '#ecfdf5',
  color: $tone === 'error' ? '#b91c1c' : $tone === 'saving' ? '#4338ca' : '#047857',
}))

const Dot = styled('span', ({ $tone }: { $tone: string }) => ({
  width: '7px', height: '7px', borderRadius: '50%',
  background: $tone === 'error' ? '#dc2626' : $tone === 'saving' ? '#6366f1' : '#10b981',
}))

function label(s: SaveState): string {
  if (s.status === 'error') return 'Save failed — retry'
  if (s.status === 'saving') return 'Saving…'
  if (s.status === 'dirty') return 'Unsaved changes'
  return 'All changes saved'
}

/** Navbar chip bound to a SaveManager. Click retries when in the error state. */
export default function SaveStatusChip({ manager }: { manager: SaveManager | null }) {
  const [state, setState] = useState<SaveState>(manager ? manager.getState() : { status: 'saved' })
  useEffect(() => {
    if (!manager) return
    setState(manager.getState())
    return manager.subscribe(setState)
  }, [manager])
  if (!manager) return null
  const tone = state.status === 'error' ? 'error' : state.status === 'saving' ? 'saving' : 'saved'
  return (
    <Chip $tone={tone} type="button" onClick={() => { if (state.status === 'error') manager.retryNow() }}
      title={state.lastError ? `Save failed: ${state.lastError}` : label(state)}>
      <Dot $tone={tone} />
      {label(state)}
    </Chip>
  )
}
