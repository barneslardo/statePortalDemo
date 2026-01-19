import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'
import DependentsList from '../components/DependentsList'

function Dashboard() {
  const { authState, oktaAuth } = useOktaAuth()
  const navigate = useNavigate()
  const [showTokens, setShowTokens] = useState(false)

  // Check verification from token claim OR sessionStorage (fallback for same-session verification)
  const isVerified = authState?.idToken?.claims?.identityVerified === true ||
    sessionStorage.getItem('identity_verified') === 'true'

  const handleStartVerification = () => {
    navigate('/verify')
  }

  const userInfo = authState?.idToken?.claims || {}
  const accessToken = authState?.accessToken?.accessToken
  const idToken = authState?.idToken?.idToken

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {userInfo.name || userInfo.email || 'User'}
          </h1>
          <p className="text-gray-600">
            You are authenticated via Okta
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">User Information</span>
            <span className="text-green-500 text-sm">Authenticated</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{userInfo.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{userInfo.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">User ID (sub)</label>
              <p className="text-gray-900 font-mono text-sm break-all">{userInfo.sub || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Token Toggle Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Authentication Tokens</h2>
            <button
              onClick={() => setShowTokens(!showTokens)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                showTokens
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-state-blue text-white hover:bg-blue-800'
              }`}
            >
              {showTokens ? 'Hide Tokens' : 'Show Tokens'}
            </button>
          </div>

          {showTokens && (
            <div className="space-y-4">
              {/* ID Token */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">ID Token</label>
                <div className="bg-gray-100 rounded p-3 overflow-auto max-h-40">
                  <code className="text-xs text-gray-800 break-all whitespace-pre-wrap">
                    {idToken || 'No ID token available'}
                  </code>
                </div>
              </div>

              {/* Access Token */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">Access Token</label>
                <div className="bg-gray-100 rounded p-3 overflow-auto max-h-40">
                  <code className="text-xs text-gray-800 break-all whitespace-pre-wrap">
                    {accessToken || 'No access token available'}
                  </code>
                </div>
              </div>

              {/* Decoded ID Token Claims */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">ID Token Claims (Decoded)</label>
                <div className="bg-gray-100 rounded p-3 overflow-auto max-h-60">
                  <pre className="text-xs text-gray-800">
                    {JSON.stringify(userInfo, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Identity Verification Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Identity Verification</h2>

          {isVerified ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <span className="mr-1">&#10003;</span>
                  Identity Verified
                </span>
                <span className="ml-3 text-gray-600">You can access all services</span>
              </div>
              <button
                onClick={() => navigate('/services')}
                className="px-4 py-2 bg-state-blue text-white rounded-lg font-medium hover:bg-blue-800 transition"
              >
                Go to Services
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 mb-2">
                    Complete identity verification with Socure DocV to access state services.
                  </p>
                  <p className="text-sm text-gray-500">
                    You'll need to capture your government-issued ID and a selfie.
                  </p>
                </div>
                <button
                  onClick={handleStartVerification}
                  className="px-6 py-3 bg-socure-orange text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center"
                >
                  <span className="mr-2">Start Verification</span>
                  <span>&#8594;</span>
                </button>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">
                      For demonstration purposes, use the simulated verification flow.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/demo-verify')}
                    className="px-6 py-3 bg-state-blue text-white rounded-lg font-semibold hover:bg-blue-800 transition flex items-center"
                  >
                    <span className="mr-2">Demo Verification</span>
                    <span>🪪</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dependents Section - Only show if parent is verified */}
        {isVerified && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Dependents</h2>
            <p className="text-gray-600 mb-4">
              Add and manage dependent children linked to your account.
            </p>
            <DependentsList />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            {isVerified && (
              <button
                onClick={() => navigate('/services')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Access Services
              </button>
            )}
            <button
              onClick={() => navigate('/account-settings')}
              className="px-4 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
            >
              Account Settings
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('identity_verified')
                sessionStorage.removeItem('socure_session_id')
                sessionStorage.removeItem('socure_verification_data')
                oktaAuth.signOut()
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
