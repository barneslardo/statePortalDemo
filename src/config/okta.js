const oktaConfig = {
  clientId: import.meta.env.VITE_OKTA_CLIENT_ID,
  issuer: import.meta.env.VITE_OKTA_ISSUER,
  redirectUri: `${window.location.origin}/callback`,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  pkce: true,
  disableHttpsCheck: import.meta.env.VITE_OKTA_TESTING_DISABLEHTTPSCHECK === 'true',
  tokenManager: {
    autoRenew: true,
    expireEarlySeconds: 120 // Renew tokens 2 minutes before expiry
  }
}

export default oktaConfig
