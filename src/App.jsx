import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Security } from '@okta/okta-react'
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js'
import { useNavigate } from 'react-router-dom'
import oktaConfig from './config/okta'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Callback from './pages/Callback'
import Dashboard from './pages/Dashboard'
import IdentityVerification from './pages/IdentityVerification'
import AddDependent from './pages/AddDependent'
import MFAChallenge from './pages/MFAChallenge'
import MFACallback from './pages/MFACallback'
import DependentVerification from './pages/DependentVerification'
import Services from './pages/Services'
import ChildSupport from './pages/ChildSupport'
import SNAPAssistance from './pages/SNAPAssistance'
import VehicleRegistration from './pages/VehicleRegistration'
import DemoVerification from './pages/DemoVerification'

const oktaAuth = new OktaAuth(oktaConfig)

function App() {
  return (
    <Router>
      <AppWithRouter />
    </Router>
  )
}

function AppWithRouter() {
  const navigate = useNavigate()

  const restoreOriginalUri = async (_oktaAuth, originalUri) => {
    // After auth, redirect to dashboard instead of home
    navigate(toRelativeUrl(originalUri || '/dashboard', window.location.origin), { replace: true })
  }

  return (
    <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify"
            element={
              <ProtectedRoute>
                <IdentityVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo-verify"
            element={
              <ProtectedRoute>
                <DemoVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mfa-challenge"
            element={
              <ProtectedRoute requireVerification>
                <MFAChallenge />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mfa-callback"
            element={
              <ProtectedRoute requireVerification>
                <MFACallback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-dependent"
            element={
              <ProtectedRoute requireVerification>
                <AddDependent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify-dependent/:childId"
            element={
              <ProtectedRoute requireVerification>
                <DependentVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedRoute requireVerification>
                <Services />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services/child-support"
            element={
              <ProtectedRoute requireVerification>
                <ChildSupport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services/snap-assistance"
            element={
              <ProtectedRoute requireVerification>
                <SNAPAssistance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services/vehicle-registration"
            element={
              <ProtectedRoute requireVerification>
                <VehicleRegistration />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Security>
  )
}

export default App
