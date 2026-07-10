import '@ant-design/v5-patch-for-react-19'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initObservability, Sentry } from './observability/sentry'

initObservability()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div role="alert">Произошла ошибка. Обновите страницу.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
