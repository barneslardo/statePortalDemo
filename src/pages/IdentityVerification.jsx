import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function IdentityVerification() {
  const [loading, setLoading] = useState(true)
  const [verificationStep, setVerificationStep] = useState('initializing')
  const [error, setError] = useState(null)
  const [transactionToken, setTransactionToken] = useState(null)
  const navigate = useNavigate()
  const { authState } = useOktaAuth()

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'

  // Check if already verified (token claim OR sessionStorage fallback)
  useEffect(() => {
    const isVerified = authState?.idToken?.claims?.identityVerified === true ||
      sessionStorage.getItem('identity_verified') === 'true'
    if (isVerified) {
      navigate('/services')
      return
    }
  }, [navigate, authState])

  // Get transaction token from backend
  const getTransactionToken = useCallback(async () => {
    const userEmail = authState?.idToken?.claims.email
    const userId = authState?.idToken?.claims.sub
    const firstName = authState?.idToken?.claims.given_name || ''
    const lastName = authState?.idToken?.claims.family_name || ''

    if (!userEmail || !userId) {
      throw new Error('User information not available')
    }

    console.log('Requesting transaction token from backend...')

    const response = await fetch(`${apiUrl}/api/socure/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        email: userEmail,
        firstName,
        lastName
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Backend error:', errorData)
      throw new Error(errorData.error || 'Failed to get verification token')
    }

    const data = await response.json()
    console.log('Transaction token received:', data)
    return data
  }, [authState, apiUrl])

  // Load Socure SDK script
  const loadSocureSDK = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.SocureDocVSDK) {
        console.log('Socure SDK already loaded')
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://websdk.socure.com/bundle.js'
      script.async = true
      script.onload = () => {
        console.log('Socure SDK loaded successfully')
        console.log('Available globals:', {
          SocureDocVSDK: typeof window.SocureDocVSDK,
          SocureInitializer: typeof window.SocureInitializer
        })
        resolve()
      }
      script.onerror = (err) => {
        console.error('Failed to load Socure SDK:', err)
        reject(new Error('Failed to load Socure SDK. Check network connection.'))
      }
      document.head.appendChild(script)
    })
  }, [])

  // Initialize Socure with transaction token
  const initializeSocureWidget = useCallback(async (token) => {
    const sdkKey = import.meta.env.VITE_SOCURE_SDK_KEY

    if (!sdkKey) {
      throw new Error('Socure SDK key not configured')
    }

    if (!token) {
      throw new Error('Transaction token not provided')
    }

    console.log('Initializing Socure widget with:', { sdkKey: sdkKey.substring(0, 8) + '...', token: token.substring(0, 20) + '...' })

    // Show the container
    const container = document.getElementById('socure-docv-container')
    if (container) {
      container.classList.remove('hidden')
      container.style.minHeight = '600px'
    }

    setLoading(false)
    setVerificationStep('verifying')

    try {
      // Config with callbacks
      const config = {
        onProgress: (event) => {
          console.log('Socure progress:', event)
        },
        onSuccess: (response) => {
          console.log('Socure verification SUCCESS:', response)
          handleVerificationSuccess(response)
        },
        onError: (error) => {
          console.error('Socure verification ERROR:', error)
          setError(`Verification error: ${error.message || JSON.stringify(error)}`)
          setLoading(false)
        },
        qrCodeNeeded: true,
        disableSmsInput: false
      }

      // Use the correct API: SocureDocVSDK.launch(sdkKey, token, selector, config)
      if (window.SocureDocVSDK && typeof window.SocureDocVSDK.launch === 'function') {
        console.log('Launching Socure DocV SDK...')
        window.SocureDocVSDK.launch(sdkKey, token, '#socure-docv-container', config)
      } else {
        // Log what's actually available for debugging
        console.error('SocureDocVSDK.launch not found. Available:', {
          SocureDocVSDK: window.SocureDocVSDK,
          SocureDocVSDKType: typeof window.SocureDocVSDK,
          keys: window.SocureDocVSDK ? Object.keys(window.SocureDocVSDK) : 'N/A'
        })
        throw new Error('Socure SDK not available. SocureDocVSDK.launch not found.')
      }
    } catch (err) {
      console.error('Socure widget init error:', err)
      throw err
    }
  }, [])

  const handleVerificationSuccess = async (verificationData) => {
    try {
      setVerificationStep('success')

      const userId = authState?.idToken?.claims.sub

      // Update Okta profile with verification status
      if (userId) {
        try {
          const response = await fetch(`${apiUrl}/api/user/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          })

          if (response.ok) {
            const data = await response.json()
            console.log('Okta profile updated with verification:', data)
          } else {
            console.error('Failed to update Okta profile')
          }
        } catch (err) {
          console.error('Error updating Okta profile:', err)
        }
      }

      // Mark as verified in session storage
      sessionStorage.setItem('identity_verified', 'true')
      sessionStorage.setItem('socure_verification_data', JSON.stringify(verificationData))

      // Redirect to services after a brief delay
      setTimeout(() => {
        navigate('/services')
      }, 2000)

    } catch (err) {
      console.error('Error handling verification success:', err)
      setError('Verification completed but failed to save. Please try again.')
    }
  }

  // Main initialization flow
  useEffect(() => {
    if (!authState?.isAuthenticated) return

    const initFlow = async () => {
      try {
        setVerificationStep('getting_token')

        // Step 1: Get transaction token from backend
        const tokenData = await getTransactionToken()
        setTransactionToken(tokenData.transactionToken)

        setVerificationStep('loading_sdk')

        // Step 2: Load Socure SDK
        await loadSocureSDK()

        setVerificationStep('initializing_widget')

        // Step 3: Initialize widget with token
        await initializeSocureWidget(tokenData.transactionToken)

      } catch (err) {
        console.error('Verification flow error:', err)
        setError(err.message || 'Failed to initialize verification')
        setLoading(false)
      }
    }

    initFlow()
  }, [authState, getTransactionToken, loadSocureSDK, initializeSocureWidget])

  const getStepMessage = () => {
    switch (verificationStep) {
      case 'initializing':
        return 'Initializing verification...'
      case 'getting_token':
        return 'Preparing secure session...'
      case 'loading_sdk':
        return 'Loading verification module...'
      case 'initializing_widget':
        return 'Starting verification widget...'
      case 'verifying':
        return 'Please complete verification below'
      case 'success':
        return 'Verification successful! Redirecting...'
      default:
        return 'Setting up verification...'
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center space-y-4">
          <div className="text-red-500 text-5xl">&#9888;</div>
          <h2 className="text-2xl font-bold text-gray-800">Verification Error</h2>
          <p className="text-gray-600">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-state-blue text-white py-2 px-4 rounded hover:bg-blue-900 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-state-blue text-white p-6">
          <h1 className="text-3xl font-bold">Identity Verification</h1>
          <p className="mt-2 text-blue-100">
            Powered by Socure DocV
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading || verificationStep !== 'verifying' ? (
            <div className="flex flex-col items-center space-y-4 py-8">
              {verificationStep === 'success' ? (
                <div className="text-green-500 text-6xl">&#10003;</div>
              ) : (
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-state-blue"></div>
              )}

              <p className="text-lg font-medium text-gray-800">
                {getStepMessage()}
              </p>

              {verificationStep !== 'success' && verificationStep !== 'verifying' && (
                <div className="w-full max-w-md bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-state-blue h-2 rounded-full transition-all duration-500"
                    style={{
                      width:
                        verificationStep === 'initializing' ? '10%' :
                        verificationStep === 'getting_token' ? '30%' :
                        verificationStep === 'loading_sdk' ? '60%' :
                        verificationStep === 'initializing_widget' ? '85%' : '10%'
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}

          {/* Socure SDK Container */}
          <div
            id="socure-docv-container"
            className="hidden"
            style={{ minHeight: '600px' }}
          >
            {/* Socure SDK will inject UI here */}
          </div>

          {/* User Info */}
          <div className="mt-6 text-sm text-gray-600 text-center">
            <p>
              Verifying: {authState?.idToken?.claims.name || authState?.idToken?.claims.email}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            &#8592; Back to Dashboard
          </button>
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer font-medium">
              About Verification
            </summary>
            <div className="mt-2 space-y-1 text-xs text-left">
              <p>&#8226; Real-time document verification</p>
              <p>&#8226; Government ID + selfie required</p>
              <p>&#8226; Liveness detection for security</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default IdentityVerification
