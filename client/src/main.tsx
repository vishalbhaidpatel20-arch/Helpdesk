import './instrument'
import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Client errors (401/403/404...) won't succeed on retry; only retry network/server failures
      retry: (failureCount, error) =>
        !(axios.isAxiosError(error) && error.response && error.response.status < 500) && failureCount < 2,
    },
  },
})

createRoot(document.getElementById('root')!, {
  // React 19 error hooks: report errors that no error boundary caught, that one caught, and that React recovered from
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
