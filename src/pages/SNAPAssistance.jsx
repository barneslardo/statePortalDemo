import { Link } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function SNAPAssistance() {
  const { authState } = useOktaAuth()
  const userClaims = authState?.idToken?.claims || {}

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/services"
          className="text-state-blue hover:underline mb-6 inline-block"
        >
          ← Back to Services
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="border-b pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  SNAP Assistance
                </h1>
                <p className="text-gray-600">
                  Supplemental Nutrition Assistance Program
                </p>
              </div>
              <div className="text-6xl">🛒</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                User Profile Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-semibold text-gray-900">
                    {userClaims.name || 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">
                    {userClaims.email || 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-mono text-sm text-gray-900">
                    {userClaims.sub || 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email Verified</p>
                  <p className="font-semibold text-gray-900">
                    {userClaims.email_verified ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Access Token Claims
              </h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify(userClaims, null, 2)}
              </pre>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> This is a demonstration interface. In a production
                environment, this page would allow users to apply for SNAP benefits, check
                application status, and manage their benefits.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition">
                Apply for Benefits
              </button>
              <button className="bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition">
                Check Application Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SNAPAssistance
