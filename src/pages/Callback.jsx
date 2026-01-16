import { LoginCallback } from '@okta/okta-react'

function Callback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-state-blue mx-auto"></div>
        <p className="text-xl text-gray-600">Completing authentication...</p>
      </div>
      <LoginCallback />
    </div>
  )
}

export default Callback
