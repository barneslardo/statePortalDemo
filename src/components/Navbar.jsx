import { useOktaAuth } from '@okta/okta-react'
import { Link } from 'react-router-dom'

function Navbar() {
  const { authState, oktaAuth } = useOktaAuth()

  const handleLogout = async () => {
    sessionStorage.removeItem('identity_verified')
    await oktaAuth.signOut()
  }

  return (
    <nav className="bg-state-blue text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-xl font-bold">
              <img
                src="/state-seal.png"
                alt="State Seal"
                className="h-10 w-10 mr-3"
              />
              State Services Portal
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {authState?.isAuthenticated && (
              <>
                <Link to="/dashboard" className="hover:text-gray-200 transition">
                  Dashboard
                </Link>
                <Link to="/services" className="hover:text-gray-200 transition">
                  Services
                </Link>
                <Link to="/account-settings" className="hover:text-gray-200 transition">
                  Settings
                </Link>
                <span className="text-sm">
                  {authState.idToken?.claims.name || authState.idToken?.claims.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-white text-state-blue px-4 py-2 rounded hover:bg-gray-100 transition"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
