import { useOktaAuth } from '@okta/okta-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
  const { authState, oktaAuth } = useOktaAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authState?.isAuthenticated) {
      // Always go to dashboard first - user can manually trigger verification
      navigate('/dashboard')
    }
  }, [authState, navigate])

  const handleLogin = () => {
    navigate('/login')
  }

  if (!authState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-state-blue"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-state-blue">
            State Services Portal
          </h1>
          <p className="text-xl text-gray-600">
            Secure access to government services with identity verification
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-xl space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Available Services
            </h2>
            <ul className="text-left space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Child Support Management
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                SNAP Assistance Application
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Vehicle Registration Services
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleLogin}
              className="w-full bg-state-blue text-white py-3 px-6 rounded-lg text-lg font-semibold hover:bg-blue-900 transition-colors shadow-md"
            >
              Sign In or Register
            </button>
            <p className="mt-3 text-sm text-gray-600">
              Sign in with Google or create a local account
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Powered by Okta Authentication & Socure Identity Verification
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Demo Environment - Sandbox Credentials</p>
        </div>
      </div>
    </div>
  )
}

export default Home
