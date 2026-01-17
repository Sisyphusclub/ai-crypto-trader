import SystemStatus from './components/SystemStatus'
import SignalsPanel from './components/SignalsPanel'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          AI Crypto Trader
        </h1>
        <p className="text-gray-400 mb-8">
          AI-driven crypto perpetual trading platform (MVP)
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <SystemStatus />

          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-3">Quick Links</h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/dashboard"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Real-time Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/traders"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  AI Traders
                </a>
              </li>
              <li>
                <a
                  href="/logs"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Decision Logs
                </a>
              </li>
              <li>
                <a
                  href="/replay"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Trade Replay / Audit
                </a>
              </li>
              <li>
                <a
                  href="/strategies"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Strategy Studio
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  API Documentation (OpenAPI)
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:8000/redoc"
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  API Reference (ReDoc)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <SignalsPanel />
        </div>

        <div className="mt-8 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <h3 className="text-yellow-400 font-semibold mb-2">Security Notice</h3>
          <ul className="text-yellow-200/80 text-sm space-y-1">
            <li>• API keys are encrypted at rest and never returned by APIs</li>
            <li>• Use exchange API keys without withdrawal permissions</li>
            <li>• Service refuses to start with default/weak secrets</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
