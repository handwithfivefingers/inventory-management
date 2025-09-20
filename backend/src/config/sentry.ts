import { init, captureConsoleIntegration, profiler } from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration(), captureConsoleIntegration({ levels: ['error'] })],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0
})

export { profiler }
