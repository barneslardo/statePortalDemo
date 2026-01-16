import { useEffect } from 'react'
import { useOktaAuth } from '@okta/okta-react'
import { useNavigate } from 'react-router-dom'

function ProtectedRoute({ children, requireVerification = false }) {
  const { authState, oktaAuth } = useOktaAuth()
  const navigate = useNavigate()

  // Check verification from token claim OR sessionStorage (fallback for same-session verification)
  const isVerified = authState?.idToken?.claims?.identityVerified === true ||
    sessionStorage.getItem('identity_verified') === 'true'

  useEffect(() => {
    if (!authState) {
      return
    }

    if (!authState.isAuthenticated) {
      // Not authenticated, redirect to login
      oktaAuth.signInWithRedirect()
    } else if (requireVerification && !isVerified) {
      // Redirect to dashboard where user can initiate verification manually
      navigate('/dashboard')
    }
  }, [authState, oktaAuth, navigate, requireVerification, isVerified])

  if (!authState || !authState.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-state-blue"></div>
      </div>
    )
  }

  if (requireVerification && !isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-state-blue"></div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
