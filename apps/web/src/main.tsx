import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../packages/app/src/index.css'
import App from '../../../packages/app/src/App'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
