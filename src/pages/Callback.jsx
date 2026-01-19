import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function Callback() {
  const { oktaAuth, authState } = useOktaAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle the OAuth callback
        if (oktaAuth.isLoginRedirect()) {
          await oktaAuth.handleLoginRedirect()
          return // Will trigger a re-render with updated authState
        }

        // Once authenticated, check for MFA factors
        if (authState?.isAuthenticated) {
          const userId = authState.idToken?.claims?.sub

          if (userId) {
            setStatus('Checking account security...')

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'

            try {
              const response = await fetch(`${apiUrl}/api/user/${userId}/factors`)

              if (response.ok) {
                const data = await response.json()
                const activeFactors = data.factors?.filter(f => f.status === 'ACTIVE') || []

                // Check if user skipped enrollment before
                const skippedEnrollment = sessionStorage.getItem('mfa_enrollment_skipped')

                if (activeFactors.length === 0 && !skippedEnrollment) {
                  // New user without MFA - redirect to secure account
                  navigate('/secure-account', { replace: true })
                  return
                }
              }
            } catch (err) {
              console.error('Error checking factors:', err)
              // Continue to dashboard on error
            }
          }

          // User has factors or we couldn't check - go to dashboard
          navigate('/dashboard', { replace: true })
        }
      } catch (err) {
        console.error('Callback error:', err)
        setStatus('Authentication error. Redirecting...')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
      }
    }

    handleCallback()
  }, [oktaAuth, authState, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-state-blue mx-auto"></div>
        <p className="text-xl text-gray-600">{status}</p>
      </div>
    </div>
  )
}

export default Callback
