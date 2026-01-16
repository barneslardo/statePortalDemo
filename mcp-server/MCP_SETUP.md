# MCP Server Setup Guide

Complete guide to set up the Okta + Socure Demo MCP server in Claude Desktop.

## What is MCP?

**Model Context Protocol (MCP)** is a standard that allows Claude to interact with external tools and data sources. The Okta + Socure Demo MCP server lets Claude:

- Monitor your application deployment on Blue server
- View and analyze container logs
- Restart the application
- Check configuration status
- Access setup documentation
- Test connectivity

## Prerequisites

- Claude Desktop installed
- Node.js 18+ installed
- SSH access to Blue server configured
- Okta + Socure demo project at `~/okta-socure-demo`

## Installation Steps

### Step 1: Install MCP Server Dependencies

```bash
cd ~/okta-socure-demo/mcp-server
npm install
```

This installs the MCP SDK and dependencies.

### Step 2: Test MCP Server

Verify the server runs correctly:

```bash
node index.js
```

You should see:
```
Okta+Socure Demo MCP Server running on stdio
```

Press Ctrl+C to stop. If there are errors, check that:
- You're in the correct directory
- Node.js is installed (`node --version`)
- Dependencies are installed (`node_modules` exists)

### Step 3: Configure Claude Desktop

#### Option A: Manual Configuration

1. **Open Claude Desktop configuration file:**

   ```bash
   # On macOS
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json

   # Or use any text editor
   open -a TextEdit ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Add the MCP server configuration:**

   If the file is empty or doesn't exist, create it with:

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

   If the file already has MCP servers, add the new server:

   ```json
   {
     "mcpServers": {
       "existing-server": {
         "command": "...",
         "args": ["..."]
       },
       "okta-socure-demo": {
         "command": "node",
         "args": [
           "/Users/skylar/okta-socure-demo/mcp-server/index.js"
         ]
       }
     }
   }
   ```

3. **Save the file**

#### Option B: Using Command Line

```bash
# Backup existing config (if it exists)
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup

# Create/update config with jq
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | \
  jq '.mcpServers."okta-socure-demo" = {
    "command": "node",
    "args": ["/Users/skylar/okta-socure-demo/mcp-server/index.js"]
  }' > /tmp/claude_config_temp.json

# Move updated config back
mv /tmp/claude_config_temp.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q)
2. Reopen Claude Desktop
3. Wait for it to fully load

### Step 5: Verify Installation

In a new conversation with Claude, try:

```
Claude, can you check the status of the Okta+Socure demo app?
```

Or:

```
Claude, show me the project information for the Okta demo
```

If configured correctly, Claude will use the MCP tools to respond.

## Verification Checklist

- [ ] MCP server dependencies installed (`npm install` completed)
- [ ] Server runs without errors (`node index.js` works)
- [ ] Configuration added to `claude_desktop_config.json`
- [ ] Path in config is absolute and correct
- [ ] Claude Desktop restarted
- [ ] Claude can execute MCP tools

## Available Commands

Once set up, you can ask Claude:

### Status and Monitoring

```
- "Check the okta demo app status"
- "Show me the deployment status"
- "Is the demo app running on Blue?"
- "What's the current state of the container?"
```

### Logs and Debugging

```
- "Show me the last 50 logs from the demo app"
- "Get the recent container logs"
- "What do the logs show?"
```

### Configuration

```
- "Check if my Okta configuration is set up"
- "Verify the environment variables"
- "Is the .env.local file configured?"
```

### Deployment

```
- "Show me deployment information"
- "What's the URL for the demo app?"
- "How do I access the application?"
```

### Documentation

```
- "Show me the Okta setup guide"
- "What are the setup instructions?"
- "Get the deployment checklist"
```

### Connectivity

```
- "Test connectivity to Blue server"
- "Can you reach the demo app?"
- "Check if the application is accessible"
```

### Management

```
- "Restart the demo container"
- "Restart the okta demo app"
```

## Troubleshooting

### Issue: MCP Server Not Found

**Symptom:** Claude says it doesn't have access to the tools.

**Solutions:**

1. **Verify Configuration Path:**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Check that the path is correct and absolute (starts with `/Users/`)

2. **Check JSON Syntax:**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq
   ```

   If `jq` shows errors, fix the JSON syntax

3. **Restart Claude Completely:**
   - Quit Claude (Cmd+Q, not just close window)
   - Wait 5 seconds
   - Reopen Claude

### Issue: SSH Connection Errors

**Symptom:** Tools fail with SSH errors.

**Solutions:**

1. **Test SSH Manually:**
   ```bash
   ssh skylar@192.168.1.111 "echo test"
   ```

   Should print "test" without prompting for password

2. **Check SSH Config:**
   ```bash
   cat ~/.ssh/config | grep -A 5 "192.168.1.111"
   ```

3. **Verify SSH Key:**
   ```bash
   ssh-add -l
   ```

### Issue: Container Not Found

**Symptom:** Status checks show "Container not found".

**Solutions:**

1. **Check if Deployed:**
   ```bash
   ssh skylar@192.168.1.111 "docker ps -a | grep okta-socure-demo"
   ```

2. **Deploy if Not Running:**
   ```bash
   cd ~/okta-socure-demo
   ./deploy.sh
   ```

3. **Verify Container Name:**
   The MCP server expects container name: `okta-socure-demo`

### Issue: Permission Errors

**Symptom:** Docker commands fail with permission denied.

**Solutions:**

1. **Add User to Docker Group on Blue:**
   ```bash
   ssh skylar@192.168.1.111 "sudo usermod -aG docker skylar"
   ```

2. **Log out and back in to Blue** (for group changes to take effect)

### Issue: Server Crashes

**Symptom:** MCP server exits with errors.

**Solutions:**

1. **Check Node.js Version:**
   ```bash
   node --version
   ```
   Should be v18 or higher

2. **Reinstall Dependencies:**
   ```bash
   cd ~/okta-socure-demo/mcp-server
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Logs:**
   - Open Claude Desktop Developer Tools (View → Developer → Developer Tools)
   - Look for error messages in Console tab

## Advanced Configuration

### Custom Blue Server Settings

If your Blue server has different settings, edit `mcp-server/index.js`:

```javascript
const SERVER_HOST = '192.168.1.111';      // Change to your IP
const SERVER_USER = 'skylar';              // Change to your username
const CONTAINER_NAME = 'okta-socure-demo'; // Change container name
const APP_PORT = 3050;                     // Change port if different
```

After changes, restart Claude Desktop.

### Multiple Environments

To support multiple environments (dev, staging, production), you can:

1. Create separate MCP server instances
2. Pass environment variables
3. Use different container names

Example configuration for multiple environments:

```json
{
  "mcpServers": {
    "okta-socure-demo-dev": {
      "command": "node",
      "args": ["/Users/skylar/okta-socure-demo/mcp-server/index.js"],
      "env": {
        "CONTAINER_NAME": "okta-socure-demo-dev",
        "APP_PORT": "3050"
      }
    },
    "okta-socure-demo-prod": {
      "command": "node",
      "args": ["/Users/skylar/okta-socure-demo/mcp-server/index.js"],
      "env": {
        "CONTAINER_NAME": "okta-socure-demo-prod",
        "APP_PORT": "3051"
      }
    }
  }
}
```

## Testing the Setup

### Test 1: Project Information

Ask Claude:
```
What's the project information for the Okta demo?
```

Expected: Claude uses `okta-socure://project/info` resource and shows project details.

### Test 2: Application Status

Ask Claude:
```
Check the status of the okta-socure-demo container
```

Expected: Claude uses `get_app_status` tool and shows container status.

### Test 3: Configuration Check

Ask Claude:
```
Is my Okta configuration set up correctly?
```

Expected: Claude uses `check_okta_config` and reports on `.env.local` status.

### Test 4: Logs Retrieval

Ask Claude:
```
Show me the last 20 lines of logs
```

Expected: Claude uses `get_container_logs` with `lines: 20`.

## Uninstallation

To remove the MCP server:

1. **Edit Claude config:**
   ```bash
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Remove the server entry:**
   Delete the `"okta-socure-demo"` section

3. **Restart Claude Desktop**

## Support

If you encounter issues:

1. Check the [MCP Server README](./README.md)
2. Review Claude Desktop Developer Tools console
3. Test SSH access manually
4. Verify Docker is running on Blue
5. Check file paths are absolute and correct

## Next Steps

After setup:

1. ✅ MCP server installed and configured
2. ✅ Claude can check app status
3. → Continue with Okta configuration ([OKTA_SETUP.md](../OKTA_SETUP.md))
4. → Deploy the application ([README.md](../README.md))

Enjoy conversational management of your Okta + Socure demo! 🚀
