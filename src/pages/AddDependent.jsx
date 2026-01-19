import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function AddDependent() {
  const navigate = useNavigate()
  const { authState } = useOktaAuth()
  const [checkingMfa, setCheckingMfa] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [childInfo, setChildInfo] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [confirmed, setConfirmed] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const parentId = authState?.idToken?.claims.sub
  const parentEmail = authState?.idToken?.claims.email

  // Check if user has MFA factors and if MFA was verified
  useEffect(() => {
    const checkMfaStatus = async () => {
      if (!parentId) return

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'

      try {
        // First check if user has any MFA factors enrolled
        const factorsResponse = await fetch(`${apiUrl}/api/user/${parentId}/factors`)
        if (factorsResponse.ok) {
          const factorsData = await factorsResponse.json()
          const activeFactors = factorsData.factors?.filter(f => f.status === 'ACTIVE') || []

          if (activeFactors.length === 0) {
            // No factors enrolled - redirect to secure account to enroll
            sessionStorage.setItem('post_enrollment_redirect', '/add-dependent')
            navigate('/secure-account')
            return
          }
        }

        // User has factors - check if MFA was recently verified
        const mfaVerified = sessionStorage.getItem('mfa_verified')
        const mfaTimestamp = sessionStorage.getItem('mfa_timestamp')

        if (!mfaVerified || !mfaTimestamp) {
          sessionStorage.setItem('mfa_redirect_to', '/add-dependent')
          navigate('/mfa-challenge')
          return
        }

        // Check if MFA verification is still valid (5 minute window)
        const elapsed = Date.now() - parseInt(mfaTimestamp)
        const fiveMinutes = 5 * 60 * 1000

        if (elapsed > fiveMinutes) {
          sessionStorage.removeItem('mfa_verified')
          sessionStorage.removeItem('mfa_token')
          sessionStorage.removeItem('mfa_timestamp')
          sessionStorage.setItem('mfa_redirect_to', '/add-dependent')
          navigate('/mfa-challenge')
          return
        }

        // MFA check passed - allow access to the form
        setCheckingMfa(false)
      } catch (err) {
        console.error('Error checking MFA status:', err)
        // On error, be safe and require MFA
        sessionStorage.setItem('mfa_redirect_to', '/add-dependent')
        navigate('/mfa-challenge')
      }
    }

    checkMfaStatus()
  }, [navigate, parentId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setChildInfo(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!confirmed) {
      setError('Please confirm you are the legal guardian')
      return
    }

    if (!childInfo.firstName || !childInfo.lastName || !childInfo.email) {
      setError('All fields are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Check if child exists
      const checkResponse = await fetch(`${apiUrl}/api/dependents/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: childInfo.email,
          parentId
        })
      })

      if (!checkResponse.ok) {
        throw new Error('Failed to check child account')
      }

      const checkData = await checkResponse.json()

      if (checkData.exists && !checkData.canLink) {
        setError(checkData.reason || 'This child cannot be linked to your account')
        setLoading(false)
        return
      }

      let childId = checkData.userId

      // Step 2: If child doesn't exist, create account
      if (!checkData.exists) {
        const createResponse = await fetch(`${apiUrl}/api/dependents/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId,
            parentEmail,
            firstName: childInfo.firstName,
            lastName: childInfo.lastName,
            email: childInfo.email
          })
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create child account')
        }

        const createData = await createResponse.json()
        childId = createData.userId

        // Store temp password to show user later
        sessionStorage.setItem('pending_child_temp_password', createData.temporaryPassword)
      }

      // Store child info for verification page
      sessionStorage.setItem('pending_child', JSON.stringify({
        childId,
        firstName: childInfo.firstName,
        lastName: childInfo.lastName,
        email: childInfo.email,
        parentId,
        isNew: !checkData.exists
      }))

      // Navigate to verification
      navigate(`/verify-dependent/${childId}`)

    } catch (err) {
      console.error('Error adding dependent:', err)
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking MFA
  if (checkingMfa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-state-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying security status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-state-blue text-white p-6">
            <h1 className="text-2xl font-bold">Add Dependent Child</h1>
            <p className="mt-1 text-blue-100">
              Register and verify your child's identity
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Child's First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={childInfo.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-state-blue focus:border-transparent"
                placeholder="Enter first name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Child's Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={childInfo.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-state-blue focus:border-transparent"
                placeholder="Enter last name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Child's Email Address
              </label>
              <input
                type="email"
                name="email"
                value={childInfo.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-state-blue focus:border-transparent"
                placeholder="child@example.com"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be used for the child's login credentials
              </p>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="guardian-confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 text-state-blue focus:ring-state-blue border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="guardian-confirm" className="ml-2 text-sm text-gray-600">
                I confirm that I am the legal parent or guardian of this child and have the authority to create an account on their behalf.
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Processing...
                  </span>
                ) : (
                  'Continue to Verification'
                )}
              </button>
            </div>
          </form>

          {/* Info Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-500">
              After submitting, you will need to verify your child's identity using a government-issued ID.
              Have the child's documentation ready before proceeding.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddDependent
