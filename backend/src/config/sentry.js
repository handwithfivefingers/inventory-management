const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");
console.log("process.env.SENTRY_DSN", process.env.SENTRY_DSN);
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration(), Sentry.captureConsoleIntegration(["warn", "error", "assert"])],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
Sentry.profiler.startProfiler();

// Calls to stopProfiling are optional - if you don't stop the profiler, it will keep profiling
// your application until the process exits or stopProfiling is called.
Sentry.profiler.stopProfiler();
