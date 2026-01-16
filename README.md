# State Services Portal - Okta + Socure Demo

A demonstration web application showcasing Okta authentication with Google social login and Socure identity verification for state government services.

## Features

- **Okta OIDC Authentication** with Google social login
- **Socure Identity Verification** (DocV) for enhanced security
- **Protected Routes** requiring authentication and verification
- **Three State Services**:
  - Child Support Management
  - SNAP Assistance
  - Vehicle Registration
- **User Profile Display** showing access token claims
- **Docker Deployment** ready for Blue infrastructure

## Tech Stack

- **Frontend**: React 18 + Vite
- **Authentication**: Okta React SDK (`@okta/okta-react`)
- **Identity Proofing**: Socure DocV SDK
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Deployment**: Docker + Express

## Prerequisites

- Node.js 20+
- Docker (for containerized deployment)
- Okta Developer Account (free)
- Socure Sandbox Account

## Setup Instructions

### 1. Clone and Install

```bash
cd ~/okta-socure-demo
npm install
```

### 2. Configure Okta

Follow the detailed guide in [OKTA_SETUP.md](./OKTA_SETUP.md) to:
- Create an Okta Developer account
- Set up OIDC application
- Configure Google social login
- Get your Client ID and Issuer URL

### 3. Configure Socure

- Contact Socure for sandbox access
- Obtain SDK key from Socure dashboard
- Note: Production requires backend API for token generation

### 4. Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
VITE_OKTA_CLIENT_ID=your_okta_client_id
VITE_OKTA_ISSUER=https://dev-xxxxxx.okta.com/oauth2/default
VITE_SOCURE_SDK_KEY=your_socure_sdk_key
VITE_OKTA_TESTING_DISABLEHTTPSCHECK=true  # Only for local dev
```

### 5. Local Development

```bash
npm run dev
```

Visit http://localhost:5173

### 6. Production Build

```bash
npm run build
npm run serve
```

Visit http://localhost:3050

## Deployment to Blue

### Docker Deployment

```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy to Blue server
./deploy.sh
```

The app will be available at: http://192.168.1.111:3050

### Manual Docker Deployment

```bash
# Build image with environment variables
docker build \
  --build-arg VITE_OKTA_CLIENT_ID="your_client_id" \
  --build-arg VITE_OKTA_ISSUER="your_issuer" \
  --build-arg VITE_SOCURE_SDK_KEY="your_sdk_key" \
  -t okta-socure-demo:latest .

# Run container
docker run -d \
  --name okta-socure-demo \
  --restart unless-stopped \
  -p 3050:3050 \
  okta-socure-demo:latest
```

### Docker Compose Deployment

```bash
# Set environment variables
export VITE_OKTA_CLIENT_ID="your_client_id"
export VITE_OKTA_ISSUER="your_issuer"
export VITE_SOCURE_SDK_KEY="your_sdk_key"

# Deploy
docker-compose up -d
```

## Application Flow

1. User visits home page (unauthenticated)
2. Clicks "Login with Google"
3. Redirected to Okta → Google OAuth
4. After authentication, redirected to callback
5. Redirected to Identity Verification page
6. Socure DocV captures document + selfie (simulated in demo)
7. After verification, access granted to services
8. User can view three service pages with profile information

## Project Structure

```
okta-socure-demo/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx              # Navigation with logout
│   │   └── ProtectedRoute.jsx      # Route guard component
│   ├── pages/
│   │   ├── Home.jsx                # Landing page
│   │   ├── Callback.jsx            # Okta redirect handler
│   │   ├── IdentityVerification.jsx  # Socure integration
│   │   ├── Services.jsx            # Service selection
│   │   ├── ChildSupport.jsx        # Service page
│   │   ├── SNAPAssistance.jsx      # Service page
│   │   └── VehicleRegistration.jsx # Service page
│   ├── config/
│   │   └── okta.js                 # Okta configuration
│   ├── App.jsx                     # Main app with routing
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Tailwind styles
├── Dockerfile                       # Multi-stage build
├── docker-compose.yml              # Container orchestration
├── web-server.js                   # Production server
├── deploy.sh                       # Deployment automation
└── package.json                    # Dependencies
```

## MCP Server Integration

This project includes a **Model Context Protocol (MCP) server** that enables Claude to manage and monitor the application directly.

### Features

With the MCP server, Claude can:

- ✅ Check application deployment status on Blue server
- ✅ View and analyze Docker container logs
- ✅ Restart the application remotely
- ✅ Verify Okta configuration
- ✅ Access setup documentation
- ✅ Test connectivity to deployment environment
- ✅ Provide deployment checklists and guidance

### Quick Setup

1. **Install MCP server dependencies:**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Configure Claude Desktop:**

   Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "okta-socure-demo": {
         "command": "node",
         "args": [
           "/Users/skylar/okta-socure-demo/mcp-server/index.js"
         ]
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Usage Examples

Once configured, you can ask Claude:

- "Check the status of the okta-socure demo app"
- "Show me the last 50 logs from the container"
- "Is my Okta configuration set up correctly?"
- "Restart the demo application on Blue"
- "What's the deployment URL?"

### Documentation

- **[MCP Server README](./mcp-server/README.md)** - Complete MCP server documentation
- **[MCP Setup Guide](./mcp-server/MCP_SETUP.md)** - Step-by-step installation instructions

## Available Scripts

- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run serve` - Serve production build (port 3050)

## Useful Docker Commands

```bash
# View logs
docker logs -f okta-socure-demo

# Restart container
docker restart okta-socure-demo

# Stop container
docker stop okta-socure-demo

# Remove container
docker stop okta-socure-demo && docker rm okta-socure-demo

# View container status
docker ps | grep okta-socure-demo
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_OKTA_CLIENT_ID` | Okta application client ID | Yes |
| `VITE_OKTA_ISSUER` | Okta authorization server issuer URL | Yes |
| `VITE_SOCURE_SDK_KEY` | Socure SDK key for web | Yes |
| `VITE_OKTA_TESTING_DISABLEHTTPSCHECK` | Disable HTTPS check for local dev | No (dev only) |

## Demo Mode Notes

This application includes demo/simulation features:

- **Socure Integration**: Uses mock verification flow. Production requires:
  - Backend API to generate transaction tokens
  - Socure API key stored server-side
  - Real DocV SDK initialization

- **Access Token Display**: Shows raw token claims for demonstration purposes

## Security Considerations

### Current Demo Setup
- HTTP acceptable for local testing
- Okta Client ID can be exposed (public by design)
- Mock Socure implementation

### Production Requirements
- Implement backend API for Socure token generation
- Store Socure API keys server-side only
- Enable HTTPS everywhere
- Add CSRF protection
- Implement rate limiting
- Add Content Security Policy headers
- Implement audit logging

## Troubleshooting

### Okta Redirect Fails
- Check redirect URIs match exactly in Okta config
- Verify CLIENT_ID and ISSUER in .env.local
- Check browser console for CORS errors

### Google Login Not Appearing
- Verify Google IdP configured in Okta
- Check routing rules include Google
- Clear browser cache

### Container Won't Start
```bash
# Check logs
ssh skylar@192.168.1.111 "docker logs okta-socure-demo"

# Common issues:
# - Port 3050 already in use
# - Missing environment variables
# - Build files missing from image
```

### Identity Verification Stuck
This is expected in demo mode. Production requires:
- Valid Socure SDK key
- Backend API for transaction tokens
- Proper Socure configuration

## Additional Resources

- [Okta Developer Documentation](https://developer.okta.com/)
- [Okta React SDK](https://github.com/okta/okta-react)
- [Socure DocV Documentation](https://developer.socure.com/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## Support

For issues or questions:
- Check [OKTA_SETUP.md](./OKTA_SETUP.md) for Okta configuration
- Review Docker logs for deployment issues
- Verify environment variables are set correctly

## License

Demo application for educational purposes.
