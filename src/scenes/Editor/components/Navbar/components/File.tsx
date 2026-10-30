import { editorTheme } from '@/theme/baseTheme'
import { Button, KIND } from 'baseui/button'
import { styled, ThemeProvider } from 'baseui'
import { ListItem, ListItemLabel } from 'baseui/list'

import { StatefulPopover, PLACEMENT } from 'baseui/popover'

const Container = styled('div', props => ({
  background: props.$theme.colors.background,
  color: props.$theme.colors.primary,
  width: '240px',
  fontFamily: 'Poppins',
  padding: '1rem 1rem',
}))
export default function Resize() {
  return (
    <StatefulPopover
      focusLock
      placement={PLACEMENT.bottomLeft}
      content={({ close }) => (
        <ThemeProvider theme={editorTheme}>
          <Container>
            <ListItem>
              <ListItemLabel description="description">Facebook cover</ListItemLabel>
            </ListItem>
            <ListItem>
              <ListItemLabel description="description">Facebook add</ListItemLabel>
            </ListItem>
            <ListItem>
              <ListItemLabel description="description">Facebook post</ListItemLabel>
            </ListItem>
          </Container>
        </ThemeProvider>
      )}
    >
      <Button kind={KIND.tertiary}>File</Button>
    </StatefulPopover>
  )
}
