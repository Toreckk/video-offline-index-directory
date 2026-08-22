import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installVoidPlatform } from '@void/core'
import { createWebPlatform } from '@void/platform-web'
import '../../../packages/app/src/index.css'
import App from '../../../packages/app/src/App'

installVoidPlatform(createWebPlatform())

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
