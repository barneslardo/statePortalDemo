import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function DependentsList() {
  const navigate = useNavigate()
  const { authState } = useOktaAuth()
  const [dependents, setDependents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3051'
  const parentId = authState?.idToken?.claims.sub

  useEffect(() => {
    if (parentId) {
      fetchDependents()
    }
  }, [parentId])

  const fetchDependents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${apiUrl}/api/dependents/${parentId}`)

      if (!response.ok) {
        // If 404, treat as no dependents
        if (response.status === 404) {
          setDependents([])
          return
        }
        throw new Error('Unable to load dependents')
      }

      const data = await response.json()
      setDependents(data.dependents || [])
    } catch (err) {
      console.error('Error fetching dependents:', err)
      // Don't show error for network issues - just show empty state
      setDependents([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin h-5 w-5 border-2 border-state-blue border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-500 text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dependents.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-400 text-4xl mb-3">&#128106;</div>
          <p className="text-gray-500 mb-4">No dependents listed yet</p>
          {error && (
            <p className="text-xs text-gray-400 mb-4">
              (Could not connect to server - {error})
            </p>
          )}
          <button
            onClick={() => navigate('/mfa-challenge')}
            className="px-6 py-2 bg-state-blue text-white rounded-lg hover:bg-blue-800 transition"
          >
            + Add Dependent
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {dependents.map((child) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-state-blue text-white rounded-full flex items-center justify-center font-semibold">
                    {child.firstName?.[0]}{child.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{child.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {child.identityVerified ? (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      <span className="mr-1">&#10003;</span>
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Pending
                    </span>
                  )}
                  {child.error && (
                    <span className="text-red-500 text-xs">{child.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/mfa-challenge')}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-state-blue hover:text-state-blue transition"
          >
            + Add Another Dependent
          </button>
        </>
      )}
    </div>
  )
}

export default DependentsList
