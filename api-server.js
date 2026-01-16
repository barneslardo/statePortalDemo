import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const app = express()
const PORT = process.env.API_PORT || 3051

// Helper to extract Okta domain from issuer URL
const getOktaDomain = () => {
  const issuer = process.env.VITE_OKTA_ISSUER || ''
  const match = issuer.match(/https?:\/\/([^/]+)/)
  return match ? match[1] : null
}

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'socure-api' })
})

// Generate Socure transaction token
app.post('/api/socure/token', async (req, res) => {
  try {
    const { userId, email, firstName, lastName } = req.body

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' })
    }

    const socureApiKey = process.env.SOCURE_API_KEY
    const socureBaseUrl = process.env.SOCURE_BASE_URL || 'https://service.socure.com'

    if (!socureApiKey) {
      console.error('SOCURE_API_KEY not configured')
      return res.status(500).json({ error: 'Socure not configured' })
    }

    // Create Socure DocV session
    const socureResponse = await fetch(`${socureBaseUrl}/api/5.0/documents/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SocureApiKey ${socureApiKey}`
      },
      body: JSON.stringify({
        referenceId: userId,
        email: email,
        firstName: firstName || '',
        lastName: lastName || ''
      })
    })

    if (!socureResponse.ok) {
      const errorText = await socureResponse.text()
      console.error('Socure API error:', socureResponse.status, errorText)
      return res.status(socureResponse.status).json({
        error: 'Failed to create Socure session',
        details: errorText
      })
    }

    const socureData = await socureResponse.json()

    console.log('Socure DocV response:', JSON.stringify(socureData, null, 2))

    // The docvTransactionToken is nested inside data object
    const docvToken = socureData.data?.docvTransactionToken || socureData.docvTransactionToken

    if (!docvToken) {
      console.error('No docvTransactionToken in Socure response:', socureData)
      return res.status(500).json({
        error: 'Socure did not return a transaction token',
        socureResponse: socureData
      })
    }

    res.json({
      transactionToken: docvToken,
      sessionId: socureData.referenceId || userId,
      status: 'success',
      qrCode: socureData.data?.qrcode,
      verifyUrl: socureData.data?.url,
      socureResponse: socureData
    })

  } catch (error) {
    console.error('Error generating Socure token:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

// Get verification status
app.get('/api/socure/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const socureApiKey = process.env.SOCURE_API_KEY
    const socureBaseUrl = process.env.SOCURE_BASE_URL || 'https://service.socure.com'

    const socureResponse = await fetch(`${socureBaseUrl}/api/3.0/EmailAuthScore/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': socureApiKey
      }
    })

    if (!socureResponse.ok) {
      return res.status(socureResponse.status).json({ error: 'Failed to get verification status' })
    }

    const data = await socureResponse.json()
    res.json(data)

  } catch (error) {
    console.error('Error getting verification status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// USER VERIFICATION ENDPOINTS
// ============================================

// Update user's verification status in Okta after Socure verification
app.post('/api/user/verify', async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    const verifiedDate = new Date().toISOString()

    // Update user's profile with verification status
    const updateResponse = await fetch(`https://${oktaDomain}/api/v1/users/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: {
          identityVerified: true,
          verifiedDate: verifiedDate
        }
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Failed to update user verification status:', errorText)
      return res.status(500).json({ error: 'Failed to update verification status in Okta' })
    }

    const updatedUser = await updateResponse.json()
    console.log('Updated user', userId, 'identityVerified=true, verifiedDate=', verifiedDate)

    res.json({
      success: true,
      userId,
      identityVerified: true,
      verifiedDate: verifiedDate
    })

  } catch (error) {
    console.error('Error updating user verification:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// ============================================
// MFA CHALLENGE ENDPOINTS
// ============================================

// Get user's enrolled MFA factors
app.get('/api/mfa/factors/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    const response = await fetch(`https://${oktaDomain}/api/v1/users/${userId}/factors`, {
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to get MFA factors:', errorText)
      return res.status(response.status).json({ error: 'Failed to get MFA factors' })
    }

    const factors = await response.json()

    // Filter to only active factors
    const activeFactors = factors.filter(f => f.status === 'ACTIVE').map(f => ({
      id: f.id,
      factorType: f.factorType,
      provider: f.provider,
      profile: f.profile
    }))

    console.log('User', userId, 'has', activeFactors.length, 'active MFA factors')

    res.json({ factors: activeFactors })

  } catch (error) {
    console.error('Error getting MFA factors:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// Send MFA challenge
app.post('/api/mfa/challenge', async (req, res) => {
  try {
    const { userId, factorId } = req.body

    if (!userId || !factorId) {
      return res.status(400).json({ error: 'userId and factorId are required' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Issue a challenge for the factor
    const response = await fetch(`https://${oktaDomain}/api/v1/users/${userId}/factors/${factorId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send MFA challenge:', errorText)
      return res.status(response.status).json({ error: 'Failed to send MFA challenge' })
    }

    const result = await response.json()
    console.log('MFA challenge sent for user', userId, 'factor', factorId)

    res.json({
      success: true,
      factorResult: result.factorResult,
      _links: result._links
    })

  } catch (error) {
    console.error('Error sending MFA challenge:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// Verify MFA code
app.post('/api/mfa/verify', async (req, res) => {
  try {
    const { userId, factorId, passCode } = req.body

    if (!userId || !factorId || !passCode) {
      return res.status(400).json({ error: 'userId, factorId, and passCode are required' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Verify the passcode
    const response = await fetch(`https://${oktaDomain}/api/v1/users/${userId}/factors/${factorId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passCode })
    })

    const result = await response.json()

    if (!response.ok || result.factorResult !== 'SUCCESS') {
      console.error('MFA verification failed:', result)
      return res.status(401).json({
        error: 'MFA verification failed',
        factorResult: result.factorResult || 'FAILED'
      })
    }

    console.log('MFA verified successfully for user', userId)

    // Generate a short-lived token to prove MFA was completed
    const mfaToken = Buffer.from(JSON.stringify({
      userId,
      verified: true,
      timestamp: Date.now()
    })).toString('base64')

    res.json({
      success: true,
      factorResult: result.factorResult,
      mfaToken
    })

  } catch (error) {
    console.error('Error verifying MFA:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// WebAuthn challenge - get challenge for biometric verification
app.post('/api/mfa/webauthn/challenge', async (req, res) => {
  try {
    const { userId, factorId } = req.body

    if (!userId || !factorId) {
      return res.status(400).json({ error: 'userId and factorId are required' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Get the factor details to retrieve credentialId
    const factorResponse = await fetch(`https://${oktaDomain}/api/v1/users/${userId}/factors/${factorId}`, {
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json'
      }
    })

    if (!factorResponse.ok) {
      return res.status(500).json({ error: 'Failed to get factor details' })
    }

    const factor = await factorResponse.json()

    // Issue a challenge
    const challengeResponse = await fetch(`https://${oktaDomain}/api/v1/users/${userId}/factors/${factorId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (!challengeResponse.ok) {
      const errorText = await challengeResponse.text()
      console.error('Failed to get WebAuthn challenge:', errorText)
      return res.status(500).json({ error: 'Failed to get WebAuthn challenge' })
    }

    const challengeData = await challengeResponse.json()
    console.log('WebAuthn challenge issued for user', userId)

    res.json({
      challenge: challengeData._embedded?.challenge?.challenge || challengeData.challenge,
      credentialId: factor.profile?.credentialId,
      rpId: oktaDomain,
      factorResult: challengeData.factorResult
    })

  } catch (error) {
    console.error('Error getting WebAuthn challenge:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// WebAuthn verify - verify the signed assertion
app.post('/api/mfa/webauthn/verify', async (req, res) => {
  try {
    const { userId, factorId, clientDataJSON, authenticatorData, signature } = req.body

    if (!userId || !factorId || !clientDataJSON || !authenticatorData || !signature) {
      return res.status(400).json({ error: 'Missing required WebAuthn parameters' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Verify the WebAuthn assertion with Okta
    const response = await fetch(`https://${oktaDomain}/api/v1/users/${userId}/factors/${factorId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientData: clientDataJSON,
        authenticatorData: authenticatorData,
        signatureData: signature
      })
    })

    const result = await response.json()

    if (!response.ok || result.factorResult !== 'SUCCESS') {
      console.error('WebAuthn verification failed:', result)
      return res.status(401).json({
        error: 'WebAuthn verification failed',
        factorResult: result.factorResult || 'FAILED'
      })
    }

    console.log('WebAuthn verified successfully for user', userId)

    // Generate a short-lived token to prove MFA was completed
    const mfaToken = Buffer.from(JSON.stringify({
      userId,
      verified: true,
      method: 'webauthn',
      timestamp: Date.now()
    })).toString('base64')

    res.json({
      success: true,
      factorResult: result.factorResult,
      mfaToken
    })

  } catch (error) {
    console.error('Error verifying WebAuthn:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// ============================================
// DEPENDENT MANAGEMENT ENDPOINTS
// ============================================

// Check if child email exists in Okta
app.post('/api/dependents/check', async (req, res) => {
  try {
    const { email, parentId } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      console.error('Okta not configured:', { hasToken: !!oktaApiToken, domain: oktaDomain })
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Search for user by email
    const searchUrl = `https://${oktaDomain}/api/v1/users?filter=profile.email+eq+"${encodeURIComponent(email)}"`

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Okta search error:', response.status, errorText)
      return res.status(response.status).json({ error: 'Failed to search Okta' })
    }

    const users = await response.json()

    if (users.length === 0) {
      return res.json({ exists: false, canLink: true })
    }

    const existingUser = users[0]
    const existingParent = existingUser.profile?.parentId

    // Check if already linked to a different parent
    if (existingParent && existingParent !== parentId) {
      return res.json({
        exists: true,
        userId: existingUser.id,
        canLink: false,
        reason: 'This child is already linked to another parent'
      })
    }

    return res.json({
      exists: true,
      userId: existingUser.id,
      canLink: true,
      profile: {
        firstName: existingUser.profile.firstName,
        lastName: existingUser.profile.lastName,
        email: existingUser.profile.email,
        identityVerified: existingUser.profile.identityVerified || false
      }
    })

  } catch (error) {
    console.error('Error checking dependent:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// Create a new child account in Okta
app.post('/api/dependents/create', async (req, res) => {
  try {
    const { parentId, parentEmail, firstName, lastName, email } = req.body

    if (!parentId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields: parentId, firstName, lastName, email' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Generate a temporary password for the child account
    const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 100)}`

    // Create user in Okta with activation
    const createUrl = `https://${oktaDomain}/api/v1/users?activate=true`

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: {
          firstName,
          lastName,
          email,
          login: email,
          secondEmail: parentEmail || null,
          parentId: parentId
        },
        credentials: {
          password: { value: tempPassword }
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Okta create user error:', response.status, errorData)
      return res.status(response.status).json({
        error: 'Failed to create child account',
        details: errorData.errorCauses || errorData.errorSummary || 'Unknown error'
      })
    }

    const newUser = await response.json()

    console.log('Created child account:', newUser.id, newUser.profile.email)

    res.json({
      userId: newUser.id,
      status: newUser.status,
      temporaryPassword: tempPassword,
      profile: {
        firstName: newUser.profile.firstName,
        lastName: newUser.profile.lastName,
        email: newUser.profile.email
      }
    })

  } catch (error) {
    console.error('Error creating dependent:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// Complete verification and link child to parent
app.post('/api/dependents/complete-verification', async (req, res) => {
  try {
    const { childId, parentId } = req.body

    if (!childId || !parentId) {
      return res.status(400).json({ error: 'childId and parentId are required' })
    }

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    const verifiedDate = new Date().toISOString()

    // 1. Update child's profile to mark as verified
    const updateChildResponse = await fetch(`https://${oktaDomain}/api/v1/users/${childId}`, {
      method: 'POST',
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: {
          identityVerified: true,
          verifiedDate: verifiedDate
        }
      })
    })

    if (!updateChildResponse.ok) {
      const errorText = await updateChildResponse.text()
      console.error('Failed to update child profile:', errorText)
      return res.status(500).json({ error: 'Failed to update child verification status' })
    }

    const updatedChild = await updateChildResponse.json()
    console.log('Updated child', childId, 'identityVerified=true, verifiedDate=', verifiedDate)

    // 2. Get parent's current dependents array
    const parentResponse = await fetch(`https://${oktaDomain}/api/v1/users/${parentId}`, {
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json'
      }
    })

    if (!parentResponse.ok) {
      console.error('Failed to get parent profile')
      return res.status(500).json({ error: 'Failed to get parent profile' })
    }

    const parent = await parentResponse.json()
    const currentDependents = parent.profile?.dependents || []

    // 3. Add child to parent's dependents if not already there
    if (!currentDependents.includes(childId)) {
      const updateParentResponse = await fetch(`https://${oktaDomain}/api/v1/users/${parentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `SSWS ${oktaApiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: {
            dependents: [...currentDependents, childId]
          }
        })
      })

      if (!updateParentResponse.ok) {
        const errorText = await updateParentResponse.text()
        console.error('Failed to update parent dependents:', errorText)
        return res.status(500).json({ error: 'Failed to link child to parent' })
      }

      console.log('Added child', childId, 'to parent', parentId, 'dependents')
    }

    res.json({
      success: true,
      childId,
      parentId,
      child: {
        id: updatedChild.id,
        firstName: updatedChild.profile.firstName,
        lastName: updatedChild.profile.lastName,
        email: updatedChild.profile.email,
        identityVerified: updatedChild.profile.identityVerified,
        verifiedDate: updatedChild.profile.verifiedDate
      }
    })

  } catch (error) {
    console.error('Error completing verification:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

// Get list of dependents for a parent
app.get('/api/dependents/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params

    const oktaApiToken = process.env.OKTA_API_TOKEN
    const oktaDomain = getOktaDomain()

    if (!oktaApiToken || !oktaDomain) {
      return res.status(500).json({ error: 'Okta not configured' })
    }

    // Search for users whose parentId matches
    const searchUrl = `https://${oktaDomain}/api/v1/users?search=profile.parentId+eq+"${encodeURIComponent(parentId)}"`

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `SSWS ${oktaApiToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Okta search error:', response.status, errorText)
      return res.status(response.status).json({ error: 'Failed to search dependents' })
    }

    const users = await response.json()

    const dependents = users.map(user => ({
      id: user.id,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      email: user.profile.email,
      identityVerified: user.profile.identityVerified || false,
      verifiedDate: user.profile.verifiedDate || null,
      status: user.status
    }))

    res.json({ dependents })

  } catch (error) {
    console.error('Error getting dependents:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Socure API server running on http://0.0.0.0:${PORT}`)
  console.log(`✓ Health check: http://0.0.0.0:${PORT}/health`)
})
