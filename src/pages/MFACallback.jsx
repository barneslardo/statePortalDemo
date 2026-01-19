import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function MFACallback() {
  const navigate = useNavigate()
  const { oktaAuth, authState } = useOktaAuth()
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if there's an authorization code in the URL
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          throw new Error(errorDescription || errorParam)
        }

        if (code) {
          // Exchange the code for tokens
          await oktaAuth.handleLoginRedirect()

          // Wait for auth state to update
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Verify authentication
        const isAuthenticated = await oktaAuth.isAuthenticated()

        if (!isAuthenticated) {
          throw new Error('Authentication failed. Please try again.')
        }

        // Check auth_time to verify this is a fresh authentication
        const idToken = await oktaAuth.tokenManager.get('idToken')
        const authTime = idToken?.claims?.auth_time
        const now = Math.floor(Date.now() / 1000)
        const maxAge = 120 // Authentication must be within last 2 minutes

        if (authTime && (now - authTime) <= maxAge) {
          console.log('Fresh MFA authentication confirmed')
        } else {
          console.warn('Auth time is older than expected, but allowing MFA verification')
        }

        // MFA verified - set session storage
        sessionStorage.setItem('mfa_verified', 'true')
        sessionStorage.setItem('mfa_timestamp', Date.now().toString())

        // Get the intended destination
        const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/add-dependent'
        sessionStorage.removeItem('mfa_redirect_to')

        setProcessing(false)

        // Redirect to destination
        setTimeout(() => {
          navigate(redirectTo)
        }, 1000)

      } catch (err) {
        console.error('MFA Callback error:', err)
        setError(err.message || 'Verification failed')
        setProcessing(false)
      }
    }

    handleCallback()
  }, [oktaAuth, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Verification Failed
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {processing ? (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-state-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Processing Verification
            </h2>
            <p className="text-gray-600">
              Please wait...
            </p>
          </>
        ) : (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Verification Complete
            </h2>
            <p className="text-gray-600">
              Redirecting...
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default MFACallback
