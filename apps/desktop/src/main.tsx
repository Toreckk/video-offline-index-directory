import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installVoidPlatform } from '@void/core'
import { createDesktopPlatform } from '@void/platform-desktop'
import '../../../packages/app/src/index.css'
import App from '../../../packages/app/src/App'

installVoidPlatform(createDesktopPlatform())

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
