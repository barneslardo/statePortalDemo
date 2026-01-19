import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'
import OktaSignIn from '@okta/okta-signin-widget'
import '@okta/okta-signin-widget/css/okta-sign-in.min.css'

function MFAChallenge() {
  const { oktaAuth, authState } = useOktaAuth()
  const navigate = useNavigate()
  const widgetRef = useRef(null)
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/add-dependent'

  useEffect(() => {
    // Wait for auth state to load
    if (!authState) return

    // If not authenticated, redirect to login
    if (!authState.isAuthenticated) {
      navigate('/login')
      return
    }

    // Don't initialize if we don't have the container
    if (!containerRef.current) return

    // Clean up any existing widget
    if (widgetRef.current) {
      widgetRef.current.remove()
      widgetRef.current = null
    }

    // Extract base URL from issuer
    const issuer = import.meta.env.VITE_OKTA_ISSUER || ''
    const baseUrl = issuer.replace(/\/oauth2\/.*$/, '')

    // Configure widget for step-up MFA
    const widget = new OktaSignIn({
      baseUrl: baseUrl,
      clientId: import.meta.env.VITE_OKTA_CLIENT_ID,
      redirectUri: `${window.location.origin}/mfa-callback`,
      logo: '/state-seal.png',
      authParams: {
        issuer: issuer,
        scopes: ['openid', 'profile', 'email'],
        pkce: true,
        responseType: 'code',
        // Request step-up MFA
        acrValues: 'urn:okta:loa:2fa:any'
      },
      // Force re-authentication to trigger MFA
      prompt: 'login',
      features: {
        rememberMe: false,
        // Enable WebAuthn/biometric
        webauthn: true
      },
      i18n: {
        en: {
          'primaryauth.title': 'Additional Verification Required',
          'primaryauth.username.placeholder': 'Email Address'
        }
      },
      colors: {
        brand: '#1e3a5f'
      }
    })

    widgetRef.current = widget

    // Render the widget
    widget.showSignInAndRedirect({
      el: containerRef.current,
      scopes: ['openid', 'profile', 'email'],
      acrValues: 'urn:okta:loa:2fa:any'
    }).catch((err) => {
      console.error('Sign-in widget error:', err)
      if (err.message !== 'User closed the widget') {
        setError(err.message || 'Failed to initialize verification')
      }
    })

    // Cleanup
    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch (e) {
          // Widget may already be removed
        }
        widgetRef.current = null
      }
    }
  }, [authState, navigate, oktaAuth])

  const handleCancel = () => {
    if (widgetRef.current) {
      try {
        widgetRef.current.remove()
      } catch (e) {
        // Ignore
      }
    }
    sessionStorage.removeItem('mfa_redirect_to')
    navigate('/dashboard')
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Verification Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
            >
              Try Again
            </button>
            <button
              onClick={handleCancel}
              className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-state-blue mb-2">
            Additional Verification Required
          </h1>
          <p className="text-gray-600">
            Please verify your identity to continue
          </p>
        </div>

        {/* Okta Sign-In Widget Container */}
        <div
          ref={containerRef}
          id="okta-mfa-widget"
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        />

        {/* Cancel button */}
        <div className="mt-4 text-center">
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel and go back
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Secure verification powered by Okta</p>
        </div>
      </div>
    </div>
  )
}

export default MFAChallenge
