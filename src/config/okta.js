const oktaConfig = {
  clientId: import.meta.env.VITE_OKTA_CLIENT_ID,
  issuer: import.meta.env.VITE_OKTA_ISSUER,
  redirectUri: `${window.location.origin}/callback`,
  scopes: ['openid', 'profile', 'email'],
  pkce: true,
  disableHttpsCheck: import.meta.env.VITE_OKTA_TESTING_DISABLEHTTPSCHECK === 'true'
}

export default oktaConfig
