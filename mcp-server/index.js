#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Server configuration
const SERVER_HOST = '192.168.1.111';
const SERVER_USER = 'skylar';
const CONTAINER_NAME = 'okta-socure-demo';
const APP_PORT = 3050;

// Helper function to execute SSH commands
async function execSSH(command) {
  try {
    const { stdout, stderr } = await execAsync(
      `ssh ${SERVER_USER}@${SERVER_HOST} "${command}"`
    );
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message, stderr: error.stderr };
  }
}

// Helper function to check if running on blue server
function isOnBlueServer() {
  return process.env.HOSTNAME === 'blue' || process.env.HOST === SERVER_HOST;
}

// Load environment variables from .env.local
let OKTA_CONFIG = null;

async function loadOktaConfig() {
  if (OKTA_CONFIG) return OKTA_CONFIG;

  const envPath = path.join(PROJECT_ROOT, '.env.local');
  if (!existsSync(envPath)) {
    return null;
  }

  try {
    const envContent = await readFile(envPath, 'utf-8');
    const config = {};

    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          config[key.trim()] = value;
        }
      }
    });

    OKTA_CONFIG = {
      apiToken: config.OKTA_API_TOKEN,
      issuer: config.VITE_OKTA_ISSUER,
      clientId: config.VITE_OKTA_CLIENT_ID,
    };

    // Extract domain from issuer
    if (OKTA_CONFIG.issuer) {
      const match = OKTA_CONFIG.issuer.match(/https?:\/\/([^\/]+)/);
      if (match) {
        OKTA_CONFIG.domain = match[1];
      }
    }

    return OKTA_CONFIG;
  } catch (error) {
    console.error('Error loading Okta config:', error);
    return null;
  }
}

// Helper function to make Okta API calls
async function callOktaAPI(endpoint, options = {}) {
  const config = await loadOktaConfig();

  if (!config || !config.apiToken || !config.domain) {
    throw new Error('Okta API token or domain not configured in .env.local');
  }

  const url = `https://${config.domain}${endpoint}`;
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `SSWS ${config.apiToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Okta API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'okta-socure-demo-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'okta-socure://project/info',
        mimeType: 'application/json',
        name: 'Project Information',
        description: 'Basic information about the Okta + Socure demo project',
      },
      {
        uri: 'okta-socure://deployment/status',
        mimeType: 'application/json',
        name: 'Deployment Status',
        description: 'Current deployment status on Blue server',
      },
      {
        uri: 'okta-socure://setup/instructions',
        mimeType: 'text/markdown',
        name: 'Setup Instructions',
        description: 'Complete setup and deployment instructions',
      },
      {
        uri: 'okta-socure://okta/setup-guide',
        mimeType: 'text/markdown',
        name: 'Okta Configuration Guide',
        description: 'Detailed Okta setup and Google social login configuration',
      },
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  switch (uri) {
    case 'okta-socure://project/info': {
      const packageJson = JSON.parse(
        await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
      );

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              name: packageJson.name,
              version: packageJson.version,
              description: packageJson.description,
              location: PROJECT_ROOT,
              technologies: {
                frontend: 'React 18 + Vite',
                authentication: 'Okta OIDC + Google Social Login',
                identityVerification: 'Socure DocV',
                styling: 'Tailwind CSS',
                routing: 'React Router v6',
                deployment: 'Docker + Express',
              },
              deployment: {
                port: APP_PORT,
                host: SERVER_HOST,
                containerName: CONTAINER_NAME,
              },
              services: [
                'Child Support Management',
                'SNAP Assistance',
                'Vehicle Registration',
              ],
            }, null, 2),
          },
        ],
      };
    }

    case 'okta-socure://deployment/status': {
      const result = await execSSH(`docker ps -a --filter name=${CONTAINER_NAME} --format "{{json .}}"`);

      let status = {
        deployed: false,
        container: null,
        accessible: false,
      };

      if (result.success && result.stdout.trim()) {
        try {
          status.container = JSON.parse(result.stdout.trim());
          status.deployed = true;
        } catch (e) {
          // Ignore parse error
        }
      }

      // Check if accessible
      try {
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://${SERVER_HOST}:${APP_PORT}`);
        status.accessible = stdout.trim() === '200';
      } catch (e) {
        status.accessible = false;
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    case 'okta-socure://setup/instructions': {
      const readmePath = path.join(PROJECT_ROOT, 'README.md');
      if (existsSync(readmePath)) {
        const content = await readFile(readmePath, 'utf-8');
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      }
      throw new Error('README.md not found');
    }

    case 'okta-socure://okta/setup-guide': {
      const oktaSetupPath = path.join(PROJECT_ROOT, 'OKTA_SETUP.md');
      if (existsSync(oktaSetupPath)) {
        const content = await readFile(oktaSetupPath, 'utf-8');
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      }
      throw new Error('OKTA_SETUP.md not found');
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_app_status',
        description: 'Get the current status of the Okta+Socure demo application on Blue server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_container_logs',
        description: 'Retrieve Docker container logs from Blue server',
        inputSchema: {
          type: 'object',
          properties: {
            lines: {
              type: 'number',
              description: 'Number of log lines to retrieve (default: 50)',
              default: 50,
            },
          },
        },
      },
      {
        name: 'restart_container',
        description: 'Restart the Docker container on Blue server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_deployment_info',
        description: 'Get deployment information including URLs and access instructions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_okta_config',
        description: 'Check if Okta configuration is properly set up in environment files',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_setup_checklist',
        description: 'Get a checklist of setup and deployment steps',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'test_connectivity',
        description: 'Test connectivity to Blue server and application endpoints',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'okta_list_users',
        description: 'List users in Okta (requires OKTA_API_TOKEN in .env.local)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 10)',
              default: 10,
            },
            search: {
              type: 'string',
              description: 'Optional search query (e.g., profile.email eq "user@example.com")',
            },
          },
        },
      },
      {
        name: 'okta_get_application',
        description: 'Get details about the Okta application (requires OKTA_API_TOKEN)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'okta_list_apps',
        description: 'List all applications in Okta (requires OKTA_API_TOKEN)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of apps to return (default: 20)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'okta_get_user',
        description: 'Get details about a specific Okta user by ID or email',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID or email address',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'okta_list_identity_providers',
        description: 'List identity providers (like Google) configured in Okta',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'okta_get_system_log',
        description: 'Retrieve recent system log events from Okta',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of log events to return (default: 20)',
              default: 20,
            },
            filter: {
              type: 'string',
              description: 'Optional filter (e.g., eventType eq "user.session.start")',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_app_status': {
      const result = await execSSH(`docker ps -a --filter name=${CONTAINER_NAME} --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking status: ${result.error}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Application Status on Blue (${SERVER_HOST}):\n\n${result.stdout || 'Container not found'}`,
          },
        ],
      };
    }

    case 'get_container_logs': {
      const lines = args.lines || 50;
      const result = await execSSH(`docker logs --tail ${lines} ${CONTAINER_NAME}`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving logs: ${result.error}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Container Logs (last ${lines} lines):\n\n${result.stdout || 'No logs available'}`,
          },
        ],
      };
    }

    case 'restart_container': {
      const result = await execSSH(`docker restart ${CONTAINER_NAME}`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error restarting container: ${result.error}`,
            },
          ],
        };
      }

      // Wait a moment and check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResult = await execSSH(`docker ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);

      return {
        content: [
          {
            type: 'text',
            text: `Container restarted successfully.\n\nCurrent status: ${statusResult.stdout || 'Unknown'}`,
          },
        ],
      };
    }

    case 'get_deployment_info': {
      const info = {
        applicationName: 'State Services Portal',
        localDev: {
          url: 'http://localhost:5173',
          command: 'npm run dev',
        },
        blueDeployment: {
          url: `http://${SERVER_HOST}:${APP_PORT}`,
          host: SERVER_HOST,
          port: APP_PORT,
          containerName: CONTAINER_NAME,
          deployCommand: './deploy.sh',
        },
        requiredSetup: [
          'Okta Developer account',
          'Okta OIDC application configured',
          'Google OAuth credentials',
          'Socure sandbox access (optional)',
        ],
        documentation: {
          main: 'README.md',
          oktaSetup: 'OKTA_SETUP.md',
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    }

    case 'check_okta_config': {
      const envLocalPath = path.join(PROJECT_ROOT, '.env.local');
      const envExamplePath = path.join(PROJECT_ROOT, '.env.example');

      let status = {
        envLocalExists: existsSync(envLocalPath),
        envExampleExists: existsSync(envExamplePath),
        configuration: {},
      };

      if (status.envLocalExists) {
        try {
          const envContent = await readFile(envLocalPath, 'utf-8');
          const lines = envContent.split('\n');

          for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
              const [key, value] = line.split('=');
              if (key && value) {
                status.configuration[key.trim()] = value.trim() ? 'SET' : 'EMPTY';
              }
            }
          }
        } catch (e) {
          status.error = 'Could not read .env.local';
        }
      }

      const requiredVars = [
        'VITE_OKTA_CLIENT_ID',
        'VITE_OKTA_ISSUER',
        'VITE_SOCURE_SDK_KEY',
      ];

      status.allConfigured = requiredVars.every(
        v => status.configuration[v] === 'SET'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    case 'get_setup_checklist': {
      const checklist = {
        setup: [
          { task: 'Install Node.js dependencies', command: 'npm install', done: existsSync(path.join(PROJECT_ROOT, 'node_modules')) },
          { task: 'Create .env.local from .env.example', command: 'cp .env.example .env.local', done: existsSync(path.join(PROJECT_ROOT, '.env.local')) },
          { task: 'Configure Okta credentials', ref: 'See OKTA_SETUP.md', done: false },
          { task: 'Configure Socure SDK key (optional)', ref: 'Contact Socure', done: false },
        ],
        testing: [
          { task: 'Test locally', command: 'npm run dev' },
          { task: 'Build for production', command: 'npm run build' },
          { task: 'Test production build', command: 'npm run serve' },
        ],
        deployment: [
          { task: 'Make deploy script executable', command: 'chmod +x deploy.sh' },
          { task: 'Deploy to Blue', command: './deploy.sh' },
          { task: 'Verify deployment', command: `curl http://${SERVER_HOST}:${APP_PORT}` },
        ],
        postDeployment: [
          { task: 'Update Okta redirect URIs for Blue', ref: `Add http://${SERVER_HOST}:${APP_PORT}/callback` },
          { task: 'Test authentication flow', ref: 'Login with Google' },
          { task: 'Configure domain (optional)', ref: 'Add Cloudflare tunnel or DNS' },
        ],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(checklist, null, 2),
          },
        ],
      };
    }

    case 'test_connectivity': {
      const tests = [];

      // Test SSH to Blue
      const sshResult = await execSSH('echo "Connected"');
      tests.push({
        name: 'SSH to Blue Server',
        success: sshResult.success,
        details: sshResult.success ? 'Connected successfully' : sshResult.error,
      });

      // Test HTTP endpoint
      try {
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://${SERVER_HOST}:${APP_PORT}`);
        const httpCode = stdout.trim();
        tests.push({
          name: 'HTTP Endpoint',
          success: httpCode === '200',
          details: `HTTP ${httpCode}`,
        });
      } catch (e) {
        tests.push({
          name: 'HTTP Endpoint',
          success: false,
          details: 'Connection failed',
        });
      }

      // Test Docker on Blue
      const dockerResult = await execSSH('docker ps --format "{{.Names}}" | wc -l');
      tests.push({
        name: 'Docker on Blue',
        success: dockerResult.success,
        details: dockerResult.success ? `${dockerResult.stdout.trim()} containers running` : dockerResult.error,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Connectivity Tests:\n\n${JSON.stringify(tests, null, 2)}`,
          },
        ],
      };
    }

    case 'okta_list_users': {
      const limit = args.limit || 10;
      const params = new URLSearchParams({ limit: limit.toString() });

      if (args.search) {
        params.append('search', args.search);
      }

      const result = await callOktaAPI(`/api/v1/users?${params.toString()}`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing users: ${result.error}`,
            },
          ],
        };
      }

      const users = result.data.map(user => ({
        id: user.id,
        email: user.profile?.email,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        status: user.status,
        created: user.created,
        lastLogin: user.lastLogin,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Okta Users (showing ${users.length}):\n\n${JSON.stringify(users, null, 2)}`,
          },
        ],
      };
    }

    case 'okta_get_application': {
      const config = await loadOktaConfig();

      if (!config || !config.clientId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: VITE_OKTA_CLIENT_ID not configured in .env.local',
            },
          ],
        };
      }

      // Search for app by client ID
      const result = await callOktaAPI(`/api/v1/apps?filter=client_id+eq+"${config.clientId}"`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting application: ${result.error}`,
            },
          ],
        };
      }

      if (result.data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Application not found with the configured CLIENT_ID',
            },
          ],
        };
      }

      const app = result.data[0];
      const appInfo = {
        id: app.id,
        name: app.name,
        label: app.label,
        status: app.status,
        created: app.created,
        signOnMode: app.signOnMode,
        credentials: {
          oauthClient: {
            clientId: app.credentials?.oauthClient?.client_id,
          },
        },
        settings: app.settings,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Okta Application Details:\n\n${JSON.stringify(appInfo, null, 2)}`,
          },
        ],
      };
    }

    case 'okta_list_apps': {
      const limit = args.limit || 20;
      const result = await callOktaAPI(`/api/v1/apps?limit=${limit}`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing applications: ${result.error}`,
            },
          ],
        };
      }

      const apps = result.data.map(app => ({
        id: app.id,
        name: app.name,
        label: app.label,
        status: app.status,
        signOnMode: app.signOnMode,
        created: app.created,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Okta Applications (showing ${apps.length}):\n\n${JSON.stringify(apps, null, 2)}`,
          },
        ],
      };
    }

    case 'okta_get_user': {
      const userId = args.userId;

      if (!userId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: userId parameter required',
            },
          ],
        };
      }

      const result = await callOktaAPI(`/api/v1/users/${encodeURIComponent(userId)}`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting user: ${result.error}`,
            },
          ],
        };
      }

      const user = {
        id: result.data.id,
        status: result.data.status,
        created: result.data.created,
        activated: result.data.activated,
        lastLogin: result.data.lastLogin,
        profile: result.data.profile,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Okta User Details:\n\n${JSON.stringify(user, null, 2)}`,
          },
        ],
      };
    }

    case 'okta_list_identity_providers': {
      const result = await callOktaAPI('/api/v1/idps');

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing identity providers: ${result.error}`,
            },
          ],
        };
      }

      const idps = result.data.map(idp => ({
        id: idp.id,
        name: idp.name,
        type: idp.type,
        status: idp.status,
        created: idp.created,
        protocol: idp.protocol?.type,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Okta Identity Providers:\n\n${JSON.stringify(idps, null, 2)}`,
          },
        ],
      };
    }

    case 'okta_get_system_log': {
      const limit = args.limit || 20;
      const params = new URLSearchParams({ limit: limit.toString(), sortOrder: 'DESCENDING' });

      if (args.filter) {
        params.append('filter', args.filter);
      }

      const result = await callOktaAPI(`/api/v1/logs?${params.toString()}`);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting system logs: ${result.error}`,
            },
          ],
        };
      }

      const logs = result.data.map(log => ({
        uuid: log.uuid,
        published: log.published,
        eventType: log.eventType,
        displayMessage: log.displayMessage,
        actor: {
          id: log.actor?.id,
          type: log.actor?.type,
          alternateId: log.actor?.alternateId,
          displayName: log.actor?.displayName,
        },
        outcome: {
          result: log.outcome?.result,
          reason: log.outcome?.reason,
        },
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Okta System Log (${logs.length} events):\n\n${JSON.stringify(logs, null, 2)}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Okta+Socure Demo MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
