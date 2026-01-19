import { useEffect, useState } from 'react'
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

function AccountSettings() {
  const { authState } = useOktaAuth()
  const navigate = useNavigate()
  const [factors, setFactors] = useState([])
  const [availableFactors, setAvailableFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [enrollingFactor, setEnrollingFactor] = useState(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const userId = authState?.idToken?.claims?.sub

  // Fetch user's enrolled factors
  const fetchFactors = async () => {
    if (!userId) return

    try {
      const response = await fetch(`${apiUrl}/api/user/${userId}/factors`)
      if (!response.ok) throw new Error('Failed to fetch factors')
      const data = await response.json()
      setFactors(data.factors || [])
      setAvailableFactors(data.availableFactors || [])
    } catch (err) {
      console.error('Error fetching factors:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFactors()
  }, [userId, apiUrl])

  // Handle WebAuthn enrollment
  const startWebAuthnEnrollment = async () => {
    setEnrollingFactor('webauthn')
    setEnrollmentStatus('starting')
    setError(null)

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser')
      }

      // Step 1: Start enrollment with backend
      setEnrollmentStatus('Getting challenge from server...')
      const enrollResponse = await fetch(`${apiUrl}/api/factors/webauthn/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!enrollResponse.ok) {
        const errorData = await enrollResponse.json()
        throw new Error(errorData.error || 'Failed to start enrollment')
      }

      const enrollData = await enrollResponse.json()
      const { factorId, activation } = enrollData

      // Step 2: Create credential using browser WebAuthn API
      setEnrollmentStatus('Touch your fingerprint sensor or security key...')

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

      // Step 3: Send credential to backend to complete enrollment
      setEnrollmentStatus('Completing enrollment...')

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

      // Success!
      setEnrollmentStatus('success')
      setSuccessMessage('Biometric / Security Key enrolled successfully!')

      // Refresh factors list
      await fetchFactors()

      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccessMessage(null)
        setEnrollingFactor(null)
        setEnrollmentStatus(null)
      }, 3000)

    } catch (err) {
      console.error('WebAuthn enrollment error:', err)

      // Handle specific WebAuthn errors
      let errorMessage = err.message
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Enrollment was cancelled or timed out. Please try again.'
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'This authenticator is already registered.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'This authenticator type is not supported.'
      }

      setError(errorMessage)
      setEnrollmentStatus('error')
    }
  }

  const cancelEnrollment = () => {
    setEnrollingFactor(null)
    setEnrollmentStatus(null)
    setError(null)
  }

  const getFactorIcon = (factorType) => {
    const icons = {
      'push': '📱',
      'sms': '💬',
      'call': '📞',
      'email': '📧',
      'token:software:totp': '🔢',
      'token:hotp': '🔑',
      'webauthn': '👆',
      'signed_nonce': '🔐',
      'question': '❓'
    }
    return icons[factorType] || '🔒'
  }

  const getFactorName = (factorType) => {
    const names = {
      'push': 'Okta Verify Push',
      'sms': 'SMS',
      'call': 'Voice Call',
      'email': 'Email',
      'token:software:totp': 'Authenticator App (TOTP)',
      'token:hotp': 'Hardware Token',
      'webauthn': 'Biometric / Security Key',
      'signed_nonce': 'Okta FastPass',
      'question': 'Security Question'
    }
    return names[factorType] || factorType
  }

  const userInfo = authState?.idToken?.claims || {}
  const oktaSettingsUrl = import.meta.env.VITE_OKTA_ISSUER?.replace('/oauth2/default', '') + '/enduser/settings'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-state-blue border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your security settings and authentication factors</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-green-500 text-xl mr-2">✓</span>
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !enrollingFactor && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{userInfo.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{userInfo.email}</p>
            </div>
          </div>
        </div>

        {/* Enrolled Factors */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Enrolled Authentication Factors
          </h2>
          <p className="text-gray-600 mb-4">
            These are the methods you can use to verify your identity.
          </p>

          {factors.length === 0 ? (
            <p className="text-gray-500 italic">No factors enrolled yet.</p>
          ) : (
            <div className="space-y-3">
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{getFactorIcon(factor.factorType)}</span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getFactorName(factor.factorType)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {factor.profile?.email || factor.profile?.phoneNumber || factor.profile?.credentialId?.slice(0, 20) + '...' || factor.provider}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    factor.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {factor.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enroll New Factor */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Add Authentication Factor
          </h2>
          <p className="text-gray-600 mb-4">
            Enroll additional factors to secure your account. WebAuthn allows you to use
            Touch ID, Face ID, or a security key.
          </p>

          {enrollingFactor === 'webauthn' ? (
            <div className="space-y-4">
              {enrollmentStatus === 'error' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 mb-4">{error}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={startWebAuthnEnrollment}
                      className="px-4 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={cancelEnrollment}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : enrollmentStatus === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="text-green-500 text-4xl mb-2">✓</div>
                  <p className="text-green-800 font-medium">Enrollment successful!</p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <div className="animate-pulse text-4xl mb-4">👆</div>
                  <p className="text-blue-800 font-medium mb-2">{enrollmentStatus}</p>
                  <p className="text-blue-600 text-sm">
                    Follow the prompts on your device to complete enrollment.
                  </p>
                  <button
                    onClick={cancelEnrollment}
                    className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {window.PublicKeyCredential && (
                <button
                  onClick={startWebAuthnEnrollment}
                  className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-state-blue hover:bg-blue-50 transition text-left"
                >
                  <span className="text-2xl">👆</span>
                  <div>
                    <p className="font-medium text-gray-900">Biometric / Security Key</p>
                    <p className="text-sm text-gray-500">Touch ID, Face ID, or FIDO2 key</p>
                  </div>
                </button>
              )}

              <a
                href={oktaSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-state-blue hover:bg-blue-50 transition"
              >
                <span className="text-2xl">⚙️</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Okta Settings</p>
                  <p className="text-sm text-gray-500">Manage all factors in Okta</p>
                </div>
              </a>
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Password</h2>
          <p className="text-gray-600 mb-4">
            Change your password or reset it if you've forgotten it.
          </p>
          <a
            href={oktaSettingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
          >
            Change Password
          </a>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountSettings
