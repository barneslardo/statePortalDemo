import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

// Helper to convert base64url to ArrayBuffer
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper to convert ArrayBuffer to base64url
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function SecureAccount() {
  const navigate = useNavigate()
  const { authState } = useOktaAuth()
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [factors, setFactors] = useState([])

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const userId = authState?.idToken?.claims?.sub
  const userEmail = authState?.idToken?.claims?.email

  // Check if user already has factors enrolled
  useEffect(() => {
    const checkFactors = async () => {
      if (!userId) return

      try {
        const response = await fetch(`${apiUrl}/api/user/${userId}/factors`)
        if (response.ok) {
          const data = await response.json()
          const activeFactors = data.factors?.filter(f => f.status === 'ACTIVE') || []
          setFactors(activeFactors)

          // If user already has factors, redirect to intended destination
          if (activeFactors.length > 0) {
            const redirectPath = sessionStorage.getItem('post_enrollment_redirect') || '/dashboard'
            sessionStorage.removeItem('post_enrollment_redirect')
            navigate(redirectPath)
            return
          }
        }
      } catch (err) {
        console.error('Error checking factors:', err)
      } finally {
        setLoading(false)
      }
    }

    checkFactors()
  }, [userId, apiUrl, navigate])

  // Get redirect destination (default to dashboard)
  const getRedirectPath = () => {
    const postEnrollmentRedirect = sessionStorage.getItem('post_enrollment_redirect')
    if (postEnrollmentRedirect) {
      sessionStorage.removeItem('post_enrollment_redirect')
      return postEnrollmentRedirect
    }
    return '/dashboard'
  }

  const handleSkip = () => {
    // Allow skip but mark in session that they skipped
    sessionStorage.setItem('mfa_enrollment_skipped', 'true')
    navigate(getRedirectPath())
  }

  const enrollWebAuthn = async () => {
    setEnrolling('webauthn')
    setError(null)

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser')
      }

      // Step 1: Start enrollment
      const enrollResponse = await fetch(`${apiUrl}/api/factors/webauthn/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!enrollResponse.ok) {
        const errorData = await enrollResponse.json()
        throw new Error(errorData.error || 'Failed to start enrollment')
      }

      const { factorId, activation } = await enrollResponse.json()

      // Step 2: Create credential
      const publicKeyCredentialCreationOptions = {
        challenge: base64urlToBuffer(activation.challenge),
        rp: {
          name: activation.rp.name,
          id: activation.rp.id
        },
        user: {
          id: base64urlToBuffer(activation.user.id),
          name: activation.user.name,
          displayName: activation.user.displayName
        },
        pubKeyCredParams: activation.pubKeyCredParams,
        authenticatorSelection: activation.authenticatorSelection,
        attestation: activation.attestation,
        excludeCredentials: (activation.excludeCredentials || []).map(cred => ({
          type: cred.type,
          id: base64urlToBuffer(cred.id)
        })),
        timeout: 60000
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      })

      if (!credential) {
        throw new Error('No credential created')
      }

      // Step 3: Activate factor
      const attestationResponse = credential.response
      const activateResponse = await fetch(`${apiUrl}/api/factors/webauthn/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          factorId,
          attestation: bufferToBase64url(attestationResponse.attestationObject),
          clientData: bufferToBase64url(attestationResponse.clientDataJSON)
        })
      })

      if (!activateResponse.ok) {
        const errorData = await activateResponse.json()
        throw new Error(errorData.error || 'Failed to activate factor')
      }

      setSuccess(true)
      const redirectPath = getRedirectPath()
      // Note: We intentionally do NOT set mfa_verified here
      // Enrolling a factor is not the same as verifying your identity
      // Users must complete an actual MFA challenge for sensitive actions
      setTimeout(() => navigate(redirectPath), 2000)

    } catch (err) {
      console.error('WebAuthn enrollment error:', err)
      let errorMessage = err.message
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Enrollment was cancelled or timed out. Please try again.'
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'This authenticator is already registered.'
      }
      setError(errorMessage)
      setEnrolling(null)
    }
  }

  const openOktaSettings = () => {
    const oktaSettingsUrl = import.meta.env.VITE_OKTA_ISSUER?.replace('/oauth2/default', '') + '/enduser/settings'
    window.open(oktaSettingsUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-state-blue border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Secured!</h2>
          <p className="text-gray-600">Your biometric authentication has been set up successfully.</p>
          <p className="text-gray-500 text-sm mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-state-blue text-white p-6 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold">Secure Your Account</h1>
            <p className="mt-2 text-blue-100">
              Add an extra layer of security to protect your account
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <p className="text-gray-600 text-center">
              Choose how you'd like to verify your identity when signing in:
            </p>

            {/* Factor Options */}
            <div className="space-y-4">
              {/* Biometric / Security Key - Recommended */}
              {window.PublicKeyCredential && (
                <button
                  onClick={enrollWebAuthn}
                  disabled={enrolling}
                  className="w-full flex items-center p-4 border-2 border-state-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition text-left relative"
                >
                  <span className="text-3xl mr-4">👆</span>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="font-semibold text-gray-900">Biometric / Security Key</p>
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Use Touch ID, Face ID, or a hardware security key
                    </p>
                  </div>
                  {enrolling === 'webauthn' && (
                    <div className="animate-spin h-5 w-5 border-2 border-state-blue border-t-transparent rounded-full"></div>
                  )}
                </button>
              )}

              {/* Okta Verify */}
              <button
                onClick={openOktaSettings}
                disabled={enrolling}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition text-left"
              >
                <span className="text-3xl mr-4">📱</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Okta Verify App</p>
                  <p className="text-sm text-gray-600">
                    Get push notifications on your phone
                  </p>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              {/* SMS */}
              <button
                onClick={openOktaSettings}
                disabled={enrolling}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition text-left"
              >
                <span className="text-3xl mr-4">💬</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">SMS Text Message</p>
                  <p className="text-sm text-gray-600">
                    Receive a code via text message
                  </p>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>

            {/* Enrolling State */}
            {enrolling === 'webauthn' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 font-medium">
                  Follow the prompts on your device...
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  Touch your fingerprint sensor or security key
                </p>
              </div>
            )}

            {/* Skip Option */}
            <div className="pt-4 border-t border-gray-200 text-center">
              <button
                onClick={handleSkip}
                disabled={enrolling}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip for now (not recommended)
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Multi-factor authentication helps protect your account from unauthorized access,
              even if your password is compromised.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecureAccount
