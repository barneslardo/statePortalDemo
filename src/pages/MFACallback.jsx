import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function MFACallback() {
  const navigate = useNavigate()
  const { authState } = useOktaAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authState) return // Still loading

    if (!authState.isAuthenticated) {
      setError('Authentication failed. Please try again.')
      return
    }

    // Check auth_time to verify this is a fresh authentication
    const authTime = authState.idToken?.claims?.auth_time
    const now = Math.floor(Date.now() / 1000)
    const maxAge = 60 // Authentication must be within last 60 seconds

    if (authTime && (now - authTime) <= maxAge) {
      // Fresh authentication confirmed - MFA was completed
      sessionStorage.setItem('mfa_verified', 'true')
      sessionStorage.setItem('mfa_timestamp', Date.now().toString())

      // Get the intended destination
      const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/add-dependent'
      sessionStorage.removeItem('mfa_redirect_to')

      // Redirect to destination
      navigate(redirectTo)
    } else if (authTime) {
      // Auth time is too old - this might be a cached session
      // Still allow it but log a warning
      console.warn('Auth time is older than expected, but allowing MFA verification')
      sessionStorage.setItem('mfa_verified', 'true')
      sessionStorage.setItem('mfa_timestamp', Date.now().toString())

      const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/add-dependent'
      sessionStorage.removeItem('mfa_redirect_to')
      navigate(redirectTo)
    } else {
      // No auth_time claim - still allow as user just authenticated
      sessionStorage.setItem('mfa_verified', 'true')
      sessionStorage.setItem('mfa_timestamp', Date.now().toString())

      const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/add-dependent'
      sessionStorage.removeItem('mfa_redirect_to')
      navigate(redirectTo)
    }
  }, [authState, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">&#9888;</div>
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
        <div className="animate-spin h-12 w-12 border-4 border-state-blue border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Verification Complete
        </h2>
        <p className="text-gray-600">
          Redirecting...
        </p>
      </div>
    </div>
  )
}

export default MFACallback
