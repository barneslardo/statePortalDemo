import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'
import OktaSignIn from '@okta/okta-signin-widget'
import '@okta/okta-signin-widget/css/okta-sign-in.min.css'

function Login() {
  const { oktaAuth, authState } = useOktaAuth()
  const navigate = useNavigate()
  const widgetRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (authState?.isAuthenticated) {
      navigate('/dashboard')
      return
    }

    // Don't initialize if we don't have the container or widget already exists
    if (!containerRef.current) return

    // Extract base URL from issuer (remove /oauth2/default)
    const issuer = import.meta.env.VITE_OKTA_ISSUER || ''
    const baseUrl = issuer.replace(/\/oauth2\/.*$/, '')

    const widget = new OktaSignIn({
      baseUrl: baseUrl,
      clientId: import.meta.env.VITE_OKTA_CLIENT_ID,
      redirectUri: `${window.location.origin}/callback`,
      logo: '/state-seal.png',
      authParams: {
        issuer: issuer,
        scopes: ['openid', 'profile', 'email'],
        pkce: true,
        responseType: 'code'
      },
      // External Identity Providers
      idps: [
        { type: 'GOOGLE', id: '0oatw2n3hyZLGWfLv1d7' }
      ],
      idpDisplay: 'PRIMARY',
      features: {
        registration: true,
        rememberMe: true,
        selfServiceUnlock: true,
        selfServicePasswordReset: true,
        webauthn: false,  // Disabled during registration - users enroll via Account Settings
        autoPush: true,
        multiOptionalFactorEnroll: true
      },
      i18n: {
        en: {
          'primaryauth.title': 'Sign In to State Services',
          'primaryauth.username.placeholder': 'Email Address',
          'registration.signup.text': 'Don\'t have an account?',
          'registration.signup.label': 'Sign Up'
        }
      },
      colors: {
        brand: '#1e3a5f'
      }
    })

    widgetRef.current = widget

    // Use renderEl for redirect-based flow
    widget.renderEl(
      { el: containerRef.current },
      (res) => {
        if (res.status === 'SUCCESS') {
          // Tokens are returned, handle redirect
          oktaAuth.handleLoginRedirect(res.tokens)
        }
      },
      (err) => {
        console.error('Sign-in widget error:', err)
      }
    )

    // Cleanup
    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove()
      }
    }
  }, [oktaAuth, authState, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-state-blue mb-2">
            State Services Portal
          </h1>
          <p className="text-gray-600">
            Sign in or create an account to access services
          </p>
        </div>

        {/* Okta Sign-In Widget Container */}
        <div
          ref={containerRef}
          id="okta-signin-widget"
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Secure authentication powered by Okta</p>
        </div>
      </div>
    </div>
  )
}

export default Login
