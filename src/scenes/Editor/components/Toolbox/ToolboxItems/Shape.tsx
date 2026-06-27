import Common from './components/Common'

function Shape() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} />
      <Common />
    </div>
  )
}

export default Shape
