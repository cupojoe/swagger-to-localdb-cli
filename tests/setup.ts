import { jest } from '@jest/globals';

// Mock modules that require external dependencies
jest.mock('swagger-parser', () => ({
  validate: jest.fn(),
}));

jest.mock('ora', () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: '',
  };
  return jest.fn(() => mockSpinner);
});

jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  green: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  gray: jest.fn((text) => text),
}));

// Mock file system operations
jest.mock('fs-extra', () => ({
  writeFile: jest.fn(() => Promise.resolve()),
  ensureDir: jest.fn(() => Promise.resolve()),
  pathExists: jest.fn(() => Promise.resolve(true)),
  readJson: jest.fn(() => Promise.resolve({})),
}));

// Global test helpers
declare global {
  function createMockSwaggerSpec(): any;
  function createMockConfig(): any;
}

(global as any).createMockSwaggerSpec = () => ({
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API Description',
  },
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Production server',
    },
  ],
  endpoints: [
    {
      path: '/users',
      method: 'GET',
      operationId: 'getUsers',
      summary: 'Get all users',
      description: 'Retrieve all users from the system',
      parameters: [],
      responses: [
        {
          statusCode: '200',
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      ],
      tags: ['users'],
    },
    {
      path: '/users/{id}',
      method: 'GET',
      operationId: 'getUserById',
      summary: 'Get user by ID',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User ID',
        },
      ],
      responses: [
        {
          statusCode: '200',
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
      ],
      tags: ['users'],
    },
    {
      path: '/users',
      method: 'POST',
      operationId: 'createUser',
      summary: 'Create a new user',
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
              required: ['name', 'email'],
            },
          },
        },
      },
      responses: [
        {
          statusCode: '201',
          description: 'User created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
      ],
      tags: ['users'],
    },
  ],
  schemas: {
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'User name' },
        email: { type: 'string', description: 'User email' },
        createdAt: { type: 'string', format: 'date-time' },
      },
      required: ['id', 'name', 'email'],
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  },
});

(global as any).createMockConfig = () => ({
  dbName: 'testDB',
  responseDelay: 100,
  enableLogging: false,
  enableValidation: true,
  outputFormat: 'typescript' as const,
  errorRate: 0,
  generateTests: false,
});

beforeEach(() => {
  jest.clearAllMocks();
});