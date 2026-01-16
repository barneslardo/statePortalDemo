import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function DependentVerification() {
  const navigate = useNavigate()
  const { childId } = useParams()
  const { authState } = useOktaAuth()
  const [step, setStep] = useState('intro') // intro, preparing, document, selfie, processing, success, error
  const [error, setError] = useState(null)
  const [childInfo, setChildInfo] = useState(null)
  const [tempPassword, setTempPassword] = useState(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const parentId = authState?.idToken?.claims.sub

  useEffect(() => {
    // Load pending child info from session storage
    const pendingChild = sessionStorage.getItem('pending_child')
    if (pendingChild) {
      const parsed = JSON.parse(pendingChild)
      if (parsed.childId === childId) {
        setChildInfo(parsed)
      }
    }

    // Load temp password if new account
    const tempPwd = sessionStorage.getItem('pending_child_temp_password')
    if (tempPwd) {
      setTempPassword(tempPwd)
    }
  }, [childId])

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
      const response = await fetch(`${apiUrl}/api/dependents/complete-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          parentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      setStep('success')

      // Clean up session storage
      sessionStorage.removeItem('pending_child')

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
            <div className="text-6xl">&#128100;</div>
            <h2 className="text-2xl font-bold text-gray-800">
              Verify {childInfo?.firstName || 'Child'}'s Identity
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              We'll need to verify your child's identity using their government-issued ID.
              Please have the document ready before proceeding.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Demo Mode:</strong> This is a simulated verification for demonstration purposes.
                No actual documents will be captured.
              </p>
            </div>
            <button
              onClick={startVerification}
              className="px-8 py-3 bg-state-blue text-white rounded-lg font-semibold hover:bg-blue-800 transition"
            >
              Start Verification
            </button>
          </div>
        )

      case 'preparing':
        return (
          <div className="text-center space-y-6">
            <div className="animate-spin h-16 w-16 border-4 border-state-blue border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-semibold text-gray-800">Preparing verification...</h2>
            <p className="text-gray-600">Setting up secure connection</p>
          </div>
        )

      case 'document':
        return (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-state-blue rounded-lg animate-pulse"></div>
              <span className="text-4xl">&#127463;</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Capturing Document...</h2>
            <p className="text-gray-600">Scanning government ID</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-state-blue rounded-full animate-progress"></div>
            </div>
          </div>
        )

      case 'selfie':
        return (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-pulse"></div>
              <span className="text-4xl">&#128247;</span>
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
            <div className="animate-bounce text-6xl">&#9989;</div>
            <h2 className="text-xl font-semibold text-gray-800">Processing Results...</h2>
            <p className="text-gray-600">Almost done!</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="text-green-500 text-6xl">&#10003;</div>
            <h2 className="text-2xl font-bold text-gray-800">Verification Complete!</h2>
            <p className="text-gray-600">
              {childInfo?.firstName}'s identity has been verified and linked to your account.
            </p>

            {tempPassword && childInfo?.isNew && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto text-left">
                <h3 className="font-semibold text-yellow-800 mb-2">Child Account Created</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  A new account has been created for {childInfo.firstName}. They can log in with:
                </p>
                <div className="bg-white rounded p-2 font-mono text-sm">
                  <p><strong>Email:</strong> {childInfo.email}</p>
                  <p><strong>Temporary Password:</strong> {tempPassword}</p>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Please save this information. They will be prompted to change their password on first login.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                sessionStorage.removeItem('pending_child_temp_password')
                navigate('/dashboard')
              }}
              className="px-8 py-3 bg-state-blue text-white rounded-lg font-semibold hover:bg-blue-800 transition"
            >
              Back to Dashboard
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="text-red-500 text-6xl">&#9888;</div>
            <h2 className="text-2xl font-bold text-gray-800">Verification Failed</h2>
            <p className="text-gray-600">{error || 'An error occurred during verification.'}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  setStep('intro')
                }}
                className="px-6 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-state-blue text-white p-6">
            <h1 className="text-2xl font-bold">Child Identity Verification</h1>
            <p className="mt-1 text-blue-100">
              {childInfo ? `Verifying: ${childInfo.firstName} ${childInfo.lastName}` : 'Demo Mode'}
            </p>
          </div>

          {/* Content */}
          <div className="p-8 min-h-[400px] flex items-center justify-center">
            {getStepContent()}
          </div>

          {/* Progress indicator */}
          {step !== 'intro' && step !== 'success' && step !== 'error' && (
            <div className="px-6 pb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span className={step === 'preparing' ? 'text-state-blue font-medium' : ''}>Preparing</span>
                <span className={step === 'document' ? 'text-state-blue font-medium' : ''}>Document</span>
                <span className={step === 'selfie' ? 'text-state-blue font-medium' : ''}>Selfie</span>
                <span className={step === 'processing' ? 'text-state-blue font-medium' : ''}>Complete</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-state-blue rounded-full transition-all duration-500"
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
              &#8592; Back to Dashboard
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

export default DependentVerification
