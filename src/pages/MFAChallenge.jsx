import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function MFAChallenge() {
  const { authState } = useOktaAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('loading') // loading, select-factor, challenge, verifying, success, error
  const [factors, setFactors] = useState([])
  const [selectedFactor, setSelectedFactor] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState(null)
  const [pollInterval, setPollInterval] = useState(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/add-dependent'

  // Get user's enrolled MFA factors
  const loadFactors = useCallback(async () => {
    try {
      setStep('loading')
      setError(null)

      const userId = authState?.idToken?.claims?.sub
      if (!userId) {
        setError('Unable to get user information. Please log in again.')
        setStep('error')
        return
      }

      console.log('Loading MFA factors for user:', userId)

      const response = await fetch(`${apiUrl}/api/mfa/factors/${userId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load MFA factors')
      }

      const data = await response.json()
      console.log('Loaded factors:', data.factors)

      if (!data.factors || data.factors.length === 0) {
        setError('No MFA factors enrolled. Please enroll an authenticator in Okta first.')
        setStep('error')
        return
      }

      setFactors(data.factors)
      setStep('select-factor')

    } catch (err) {
      console.error('Error loading factors:', err)
      setError(err.message || 'Failed to load MFA factors')
      setStep('error')
    }
  }, [authState, apiUrl])

  // Send challenge to selected factor
  const selectFactor = async (factor) => {
    try {
      setError(null)
      setSelectedFactor(factor)

      const userId = authState?.idToken?.claims?.sub

      // For push-based factors (Okta Verify Push), start polling immediately
      if (factor.factorType === 'push') {
        setStep('push-waiting')
        await sendChallengeAndPoll(userId, factor.id)
        return
      }

      // For OTP-based factors, send challenge and show input
      console.log('Sending challenge for factor:', factor.id)

      const response = await fetch(`${apiUrl}/api/mfa/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, factorId: factor.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send challenge')
      }

      const data = await response.json()
      console.log('Challenge sent:', data)

      setStep('challenge')

    } catch (err) {
      console.error('Error sending challenge:', err)
      setError(err.message || 'Failed to send verification challenge')
      setStep('select-factor')
    }
  }

  // Send challenge and poll for push notification result
  const sendChallengeAndPoll = async (userId, factorId) => {
    try {
      // Send the challenge
      const challengeResponse = await fetch(`${apiUrl}/api/mfa/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, factorId })
      })

      if (!challengeResponse.ok) {
        const data = await challengeResponse.json()
        throw new Error(data.error || 'Failed to send push notification')
      }

      // Start polling for result
      const interval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`${apiUrl}/api/mfa/challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, factorId })
          })

          const result = await pollResponse.json()
          console.log('Push poll result:', result)

          if (result.factorResult === 'SUCCESS') {
            clearInterval(interval)
            setPollInterval(null)
            handleSuccess()
          } else if (result.factorResult === 'REJECTED' || result.factorResult === 'TIMEOUT') {
            clearInterval(interval)
            setPollInterval(null)
            setError('Push notification was rejected or timed out')
            setStep('error')
          }
          // WAITING - continue polling
        } catch (err) {
          console.error('Push poll error:', err)
        }
      }, 3000)

      setPollInterval(interval)

      // Timeout after 60 seconds
      setTimeout(() => {
        if (pollInterval) {
          clearInterval(interval)
          setPollInterval(null)
          setError('Push notification timed out')
          setStep('error')
        }
      }, 60000)

    } catch (err) {
      console.error('Push challenge error:', err)
      setError(err.message)
      setStep('error')
    }
  }

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  // Verify OTP code
  const submitVerificationCode = async (e) => {
    e.preventDefault()

    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    try {
      setStep('verifying')
      setError(null)

      const userId = authState?.idToken?.claims?.sub

      const response = await fetch(`${apiUrl}/api/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          factorId: selectedFactor.id,
          passCode: verificationCode.trim()
        })
      })

      const data = await response.json()
      console.log('Verification result:', data)

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid verification code')
        setStep('challenge')
        setVerificationCode('')
        return
      }

      handleSuccess()

    } catch (err) {
      console.error('Verification error:', err)
      setError(err.message || 'Verification failed')
      setStep('challenge')
      setVerificationCode('')
    }
  }

  // Resend challenge
  const resendCode = async () => {
    if (selectedFactor) {
      await selectFactor(selectedFactor)
    }
  }

  // Handle successful MFA
  const handleSuccess = () => {
    setStep('success')

    sessionStorage.setItem('mfa_verified', 'true')
    sessionStorage.setItem('mfa_timestamp', Date.now().toString())
    sessionStorage.removeItem('mfa_redirect_to')

    setTimeout(() => {
      navigate(redirectTo)
    }, 1500)
  }

  // Cancel and go back
  const handleCancel = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
    }
    navigate('/dashboard')
  }

  // Load factors on mount
  useEffect(() => {
    if (authState?.isAuthenticated) {
      loadFactors()
    }
  }, [authState, loadFactors])

  // Get factor icon
  const getFactorIcon = (factor) => {
    switch (factor.factorType) {
      case 'push':
        return '📱'
      case 'sms':
        return '💬'
      case 'email':
        return '📧'
      case 'token:software:totp':
      case 'token:hotp':
        return '🔐'
      case 'question':
        return '❓'
      case 'webauthn':
        return '🔑'
      default:
        return '🔑'
    }
  }

  // Get factor display name
  const getFactorName = (factor) => {
    switch (factor.factorType) {
      case 'push':
        return 'Okta Verify Push'
      case 'sms':
        return `SMS (${factor.profile?.phoneNumber || 'Phone'})`
      case 'email':
        return `Email (${factor.profile?.email || 'Email'})`
      case 'token:software:totp':
        if (factor.provider === 'OKTA') {
          return 'Okta Verify TOTP'
        }
        return 'Authenticator App'
      case 'token:hotp':
        return 'Hardware Token'
      case 'question':
        return 'Security Question'
      case 'webauthn':
        return 'Security Key / Biometric'
      default:
        return factor.factorType
    }
  }

  // Get challenge instructions
  const getChallengeInstructions = () => {
    if (!selectedFactor) return 'Enter your verification code'

    switch (selectedFactor.factorType) {
      case 'sms':
        return `Enter the code sent to ${selectedFactor.profile?.phoneNumber || 'your phone'}`
      case 'email':
        return `Enter the code sent to ${selectedFactor.profile?.email || 'your email'}`
      case 'token:software:totp':
        return 'Enter the code from your authenticator app'
      default:
        return 'Enter your verification code'
    }
  }

  // Render content based on step
  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-state-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Loading Verification Options
            </h2>
            <p className="text-gray-600">
              Please wait...
            </p>
          </div>
        )

      case 'select-factor':
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
              Additional Verification Required
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Select how you'd like to verify your identity
            </p>
            <div className="space-y-3">
              {factors.map((factor) => (
                <button
                  key={factor.id}
                  onClick={() => selectFactor(factor)}
                  className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-state-blue hover:bg-blue-50 transition"
                >
                  <span className="text-2xl mr-4">{getFactorIcon(factor)}</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-800">
                      {getFactorName(factor)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {factor.provider}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 'challenge':
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
              Enter Verification Code
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              {getChallengeInstructions()}
            </p>
            <form onSubmit={submitVerificationCode} className="space-y-4">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter code"
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-200 rounded-lg focus:border-state-blue focus:outline-none"
                maxLength={6}
                autoFocus
                inputMode="numeric"
              />
              <button
                type="submit"
                className="w-full py-3 bg-state-blue text-white rounded-lg font-semibold hover:bg-blue-800 transition"
              >
                Verify
              </button>
            </form>
            {(selectedFactor?.factorType === 'sms' || selectedFactor?.factorType === 'email') && (
              <button
                onClick={resendCode}
                className="w-full mt-3 text-state-blue hover:underline text-sm"
              >
                Resend code
              </button>
            )}
            <button
              onClick={() => {
                setSelectedFactor(null)
                setVerificationCode('')
                setStep('select-factor')
              }}
              className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Choose a different method
            </button>
          </div>
        )

      case 'push-waiting':
        return (
          <div className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Push Notification Sent
            </h2>
            <p className="text-gray-600 mb-4">
              Open Okta Verify on your device and approve the request
            </p>
            <div className="animate-pulse flex justify-center space-x-2 mb-4">
              <div className="h-3 w-3 bg-state-blue rounded-full"></div>
              <div className="h-3 w-3 bg-state-blue rounded-full"></div>
              <div className="h-3 w-3 bg-state-blue rounded-full"></div>
            </div>
            <button
              onClick={() => {
                if (pollInterval) clearInterval(pollInterval)
                setPollInterval(null)
                setSelectedFactor(null)
                setStep('select-factor')
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Choose a different method
            </button>
          </div>
        )

      case 'verifying':
        return (
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-state-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Verifying...
            </h2>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Verification Complete
            </h2>
            <p className="text-gray-600">
              Redirecting...
            </p>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={loadFactors}
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
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {error && step !== 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {renderContent()}

        {step !== 'success' && step !== 'error' && step !== 'loading' && step !== 'verifying' && (
          <button
            onClick={handleCancel}
            className="w-full mt-6 text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel and go back
          </button>
        )}
      </div>
    </div>
  )
}

export default MFAChallenge
