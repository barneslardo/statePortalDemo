# Okta + Socure Demo MCP Server

Model Context Protocol (MCP) server for managing and monitoring the Okta + Socure demo application.

## Overview

This MCP server provides tools and resources for:
- Checking deployment status on Blue server
- Viewing container logs
- Restarting the application
- Accessing setup documentation
- Testing connectivity
- Verifying Okta configuration
- **Managing Okta resources** (users, applications, identity providers)
- **Monitoring Okta system logs** and authentication events
- **Querying Okta API** for user and application information

## Features

### Resources

The server exposes the following resources:

1. **Project Information** (`okta-socure://project/info`)
   - Basic project details and technology stack
   - Deployment configuration
   - Available services list

2. **Deployment Status** (`okta-socure://deployment/status`)
   - Container status on Blue server
   - Accessibility check
   - Current deployment state

3. **Setup Instructions** (`okta-socure://setup/instructions`)
   - Complete README.md content
   - Setup and deployment guide

4. **Okta Configuration Guide** (`okta-socure://okta/setup-guide`)
   - Detailed Okta setup steps
   - Google social login configuration
   - Troubleshooting tips

### Tools

The server provides these interactive tools:

#### `get_app_status`
Get the current status of the application on Blue server.

**Usage:**
```javascript
// No parameters required
{}
```

**Returns:** Container status including name, state, and ports.

#### `get_container_logs`
Retrieve Docker container logs from Blue server.

**Parameters:**
- `lines` (number, optional): Number of log lines to retrieve (default: 50)

**Usage:**
```javascript
{
  "lines": 100
}
```

**Returns:** Container logs for debugging and monitoring.

#### `restart_container`
Restart the Docker container on Blue server.

**Usage:**
```javascript
// No parameters required
{}
```

**Returns:** Restart confirmation and new container status.

#### `get_deployment_info`
Get comprehensive deployment information.

**Usage:**
```javascript
// No parameters required
{}
```

**Returns:**
- Local development URLs and commands
- Blue deployment configuration
- Required setup steps
- Documentation references

#### `check_okta_config`
Check if Okta configuration is properly set up.

**Usage:**
```javascript
// No parameters required
{}
```

**Returns:**
- Environment file status
- Configuration variables status
- Missing configuration warnings

#### `get_setup_checklist`
Get a complete setup and deployment checklist.

**Usage:**
```javascript
// No parameters required
{}
```

**Returns:** Structured checklist with:
- Setup steps
- Testing procedures
- Deployment tasks
- Post-deployment configuration

#### `test_connectivity`
Test connectivity to Blue server and application endpoints.

**Usage:**
```javascript
// No parameters required
{}
```

**Returns:** Test results for:
- SSH connection to Blue
- HTTP endpoint accessibility
- Docker availability

### Okta API Management Tools

These tools require `OKTA_API_TOKEN` to be configured in `.env.local`. Get your API token from: **Okta Admin Console** → **Security** → **API** → **Tokens**.

#### `okta_list_users`
List users in your Okta organization.

**Parameters:**
- `limit` (number, optional): Maximum users to return (default: 10)
- `search` (string, optional): Search query (e.g., `profile.email eq "user@example.com"`)

**Usage:**
```javascript
{
  "limit": 20,
  "search": "profile.email sw \"@example.com\""
}
```

**Returns:** List of users with ID, email, name, status, and login info.

#### `okta_get_application`
Get details about your configured Okta application (uses `VITE_OKTA_CLIENT_ID` from `.env.local`).

**Usage:**
```javascript
{}
```

**Returns:** Application configuration including settings, credentials, and status.

#### `okta_list_apps`
List all applications in your Okta organization.

**Parameters:**
- `limit` (number, optional): Maximum apps to return (default: 20)

**Usage:**
```javascript
{
  "limit": 10
}
```

**Returns:** List of applications with names, status, and sign-on modes.

#### `okta_get_user`
Get detailed information about a specific user.

**Parameters:**
- `userId` (string, required): User ID or email address

**Usage:**
```javascript
{
  "userId": "user@example.com"
}
```

**Returns:** User profile, status, creation date, and last login.

#### `okta_list_identity_providers`
List identity providers (like Google) configured in Okta.

**Usage:**
```javascript
{}
```

**Returns:** List of IdPs with names, types, protocols, and status.

#### `okta_get_system_log`
Retrieve recent system log events from Okta.

**Parameters:**
- `limit` (number, optional): Number of events to return (default: 20)
- `filter` (string, optional): Event filter (e.g., `eventType eq "user.session.start"`)

**Usage:**
```javascript
{
  "limit": 50,
  "filter": "eventType eq \"user.authentication.sso\""
}
```

**Returns:** Log events with timestamps, event types, actors, and outcomes.

## Installation

### 1. Install Dependencies

From the `mcp-server` directory:

```bash
cd ~/okta-socure-demo/mcp-server
npm install
```

### 2. Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### 3. Configure Okta API Token (Optional)

To use Okta API management tools, add your API token to `.env.local`:

1. **Get API Token from Okta:**
   - Log into Okta Admin Console
   - Go to **Security** → **API** → **Tokens**
   - Click **Create Token**
   - Name it "MCP Server"
   - Copy the token (you'll only see it once!)

2. **Add to .env.local:**
   ```bash
   echo "OKTA_API_TOKEN=your_token_here" >> ~/okta-socure-demo/.env.local
   ```

Without this token, deployment and Docker management tools will still work, but Okta API tools will be unavailable.

### 4. Restart Claude Desktop

After adding the configuration, restart Claude Desktop to load the MCP server.

## Usage Examples

### Example 1: Check Application Status

```
Claude, can you check the status of the Okta+Socure demo app?
```

Claude will use the `get_app_status` tool to check if the container is running on Blue.

### Example 2: View Recent Logs

```
Claude, show me the last 100 lines of logs from the demo app
```

Claude will use `get_container_logs` with `lines: 100`.

### Example 3: Verify Configuration

```
Claude, check if my Okta configuration is set up correctly
```

Claude will use `check_okta_config` to verify `.env.local` settings.

### Example 4: Get Setup Instructions

```
Claude, how do I set up the Okta+Socure demo?
```

Claude will read the `okta-socure://setup/instructions` resource.

### Example 5: Restart Application

```
Claude, restart the Okta+Socure demo container on Blue
```

Claude will use `restart_container` to restart the Docker container.

### Example 6: List Okta Users

```
Claude, show me the users in my Okta organization
```

Claude will use `okta_list_users` to retrieve user information.

### Example 7: View Okta Application Details

```
Claude, get details about my Okta application configuration
```

Claude will use `okta_get_application` to show the configured application settings.

### Example 8: Monitor Authentication Events

```
Claude, show me recent login events from Okta
```

Claude will use `okta_get_system_log` with appropriate filters.

### Example 9: Check Identity Providers

```
Claude, what identity providers are configured in Okta?
```

Claude will use `okta_list_identity_providers` to show Google and other IdPs.

### Example 10: Find a Specific User

```
Claude, get information about the user user@example.com in Okta
```

Claude will use `okta_get_user` with the email address.

## Development

### Project Structure

```
mcp-server/
├── package.json          # Dependencies and metadata
├── index.js              # Main MCP server implementation
└── README.md            # This file
```

### Server Configuration

Key settings in `index.js`:

```javascript
const SERVER_HOST = '192.168.1.111';      // Blue server IP
const SERVER_USER = 'skylar';              // SSH user
const CONTAINER_NAME = 'okta-socure-demo'; // Docker container
const APP_PORT = 3050;                     // Application port
```

### Testing the Server Locally

Test the MCP server directly:

```bash
cd ~/okta-socure-demo/mcp-server
node index.js
```

The server runs on stdio and communicates via JSON-RPC. Test with MCP Inspector or Claude Desktop.

## Troubleshooting

### Server Not Showing in Claude

1. Check configuration file syntax:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq
   ```

2. Verify file path is absolute and correct

3. Check server logs in Claude Desktop Developer Tools

4. Restart Claude Desktop

### SSH Connection Issues

The server uses SSH to communicate with Blue server. Ensure:

1. SSH key is set up for passwordless access:
   ```bash
   ssh skylar@192.168.1.111 "echo test"
   ```

2. SSH config is correct in `~/.ssh/config`

3. Blue server is accessible on the network

### Tool Execution Errors

If tools fail:

1. Check that Docker is running on Blue
2. Verify container name matches: `okta-socure-demo`
3. Ensure SSH user has Docker permissions
4. Check network connectivity with `test_connectivity` tool

## Security Notes

- The MCP server uses SSH for remote operations
- Ensure SSH keys are properly secured
- Container logs may contain sensitive information
- Environment variables are read but values are masked in config checks

## Integration with Claude Desktop

Once configured, Claude can:

✅ Check application status without you SSHing to Blue
✅ Pull and analyze logs for debugging
✅ Restart the application if needed
✅ Verify your setup configuration
✅ Provide deployment guidance from documentation
✅ Test connectivity to the deployment environment

This makes managing the demo application conversational and integrated into your workflow with Claude.

## Additional Resources

- [Main Project README](../README.md)
- [Okta Setup Guide](../OKTA_SETUP.md)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP SDK on NPM](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

## Version History

- **1.0.0** - Initial release with core management tools

## License

MIT
