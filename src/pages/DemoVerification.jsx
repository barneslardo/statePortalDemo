import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function DemoVerification() {
  const navigate = useNavigate()
  const { authState } = useOktaAuth()
  const [step, setStep] = useState('intro') // intro, preparing, document, selfie, processing, success, error
  const [error, setError] = useState(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const userId = authState?.idToken?.claims?.sub
  const userName = authState?.idToken?.claims?.name || authState?.idToken?.claims?.email || 'User'

  const startVerification = () => {
    setStep('preparing')

    // Simulate verification flow with delays
    setTimeout(() => setStep('document'), 1500)
    setTimeout(() => setStep('selfie'), 3500)
    setTimeout(() => setStep('processing'), 5500)
    setTimeout(() => completeVerification(), 7000)
  }

  const completeVerification = async () => {
    try {
      // Call the backend to update the user's identityVerified attribute in Okta
      const response = await fetch(`${apiUrl}/api/user/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      // Set sessionStorage for immediate use (token will have updated claim on next login)
      sessionStorage.setItem('identity_verified', 'true')
      sessionStorage.setItem('identity_verified_timestamp', Date.now().toString())

      setStep('success')

      // Note: Token renewal is not needed - sessionStorage provides immediate access
      // The identityVerified claim will be present in the token on next login

    } catch (err) {
      console.error('Verification completion error:', err)
      setError(err.message)
      setStep('error')
    }
  }

  const getStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl">🪪</div>
            <h2 className="text-2xl font-bold text-gray-800">
              Demo Identity Verification
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This is a simulated identity verification process for demonstration purposes.
              In a production environment, this would use Socure's DocV SDK to capture and verify documents.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-orange-800">
                <strong>Demo Mode:</strong> No actual documents will be captured.
                This will mark your account as identity verified.
              </p>
            </div>
            <button
              onClick={startVerification}
              className="px-8 py-3 bg-socure-orange text-white rounded-lg font-semibold hover:opacity-90 transition"
            >
              Start Demo Verification
            </button>
          </div>
        )

      case 'preparing':
        return (
          <div className="text-center space-y-6">
            <div className="animate-spin h-16 w-16 border-4 border-socure-orange border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-semibold text-gray-800">Preparing verification...</h2>
            <p className="text-gray-600">Setting up secure connection</p>
          </div>
        )

      case 'document':
        return (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-socure-orange rounded-lg animate-pulse"></div>
              <span className="text-4xl">🪪</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Capturing Document...</h2>
            <p className="text-gray-600">Scanning government ID</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-socure-orange rounded-full animate-progress"></div>
            </div>
          </div>
        )

      case 'selfie':
        return (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-pulse"></div>
              <span className="text-4xl">📸</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Verifying Liveness...</h2>
            <p className="text-gray-600">Confirming identity match</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-progress"></div>
            </div>
          </div>
        )

      case 'processing':
        return (
          <div className="text-center space-y-6">
            <div className="animate-bounce text-6xl">✅</div>
            <h2 className="text-xl font-semibold text-gray-800">Processing Results...</h2>
            <p className="text-gray-600">Almost done!</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="text-green-500 text-6xl">✓</div>
            <h2 className="text-2xl font-bold text-gray-800">Verification Complete!</h2>
            <p className="text-gray-600">
              Your identity has been verified. You can now access all state services.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-green-800">
                <strong>Account Updated:</strong> Your Okta profile now shows <code className="bg-green-100 px-1 rounded">identityVerified: true</code>
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/services')}
                className="px-6 py-3 bg-state-blue text-white rounded-lg font-semibold hover:bg-blue-800 transition"
              >
                Go to Services
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="text-red-500 text-6xl">⚠</div>
            <h2 className="text-2xl font-bold text-gray-800">Verification Failed</h2>
            <p className="text-gray-600">{error || 'An error occurred during verification.'}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  setStep('intro')
                }}
                className="px-6 py-2 bg-socure-orange text-white rounded-lg hover:opacity-90 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-socure-orange text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Demo Identity Verification</h1>
                <p className="mt-1 text-orange-100">
                  Powered by Socure DocV
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-100">Verifying</p>
                <p className="font-semibold">{userName}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 min-h-[400px] flex items-center justify-center">
            {getStepContent()}
          </div>

          {/* Progress indicator */}
          {step !== 'intro' && step !== 'success' && step !== 'error' && (
            <div className="px-6 pb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span className={step === 'preparing' ? 'text-socure-orange font-medium' : ''}>Preparing</span>
                <span className={step === 'document' ? 'text-socure-orange font-medium' : ''}>Document</span>
                <span className={step === 'selfie' ? 'text-socure-orange font-medium' : ''}>Selfie</span>
                <span className={step === 'processing' ? 'text-socure-orange font-medium' : ''}>Complete</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-socure-orange rounded-full transition-all duration-500"
                  style={{
                    width: step === 'preparing' ? '25%' :
                           step === 'document' ? '50%' :
                           step === 'selfie' ? '75%' :
                           step === 'processing' ? '100%' : '0%'
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* CSS for progress animation */}
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default DemoVerification
