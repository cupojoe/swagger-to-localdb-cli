import { SwaggerSpecParser } from '../../src/parser/swagger-parser';

// Mock swagger-parser with proper typing
jest.mock('swagger-parser', () => ({
  validate: jest.fn(),
}));

const SwaggerParser = require('swagger-parser');
const mockValidate = SwaggerParser.validate;

describe('SwaggerSpecParser', () => {
  let parser: SwaggerSpecParser;

  beforeEach(() => {
    parser = new SwaggerSpecParser();
    jest.clearAllMocks();
  });

  describe('parse', () => {
    it('should successfully parse a valid swagger specification', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test Description',
        },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production server',
          },
        ],
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              summary: 'Get all users',
              description: 'Retrieve all users',
              tags: ['users'],
              parameters: [],
              responses: {
                '200': {
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
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
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
              required: ['id', 'name'],
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result).toEqual({
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test Description',
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
            description: 'Retrieve all users',
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
                        },
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
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['id', 'name'],
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
              required: ['id', 'name'],
            },
          },
        },
      });
    });

    it('should handle spec with no paths', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.endpoints).toEqual([]);
      expect(result.schemas).toEqual({});
    });

    it('should handle spec with no components', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {},
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.schemas).toEqual({});
    });

    it('should handle multiple HTTP methods for same path', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              summary: 'Get users',
              responses: {
                '200': { description: 'Success' },
              },
            },
            post: {
              operationId: 'createUser',
              summary: 'Create user',
              responses: {
                '201': { description: 'Created' },
              },
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints[0].method).toBe('GET');
      expect(result.endpoints[1].method).toBe('POST');
    });

    it('should handle parameters in different locations', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {
          '/users/{id}': {
            get: {
              operationId: 'getUserById',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'User ID',
                },
                {
                  name: 'include',
                  in: 'query',
                  required: false,
                  schema: { type: 'string' },
                  description: 'Include related data',
                },
              ],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.endpoints[0].parameters).toHaveLength(2);
      expect(result.endpoints[0].parameters[0]).toEqual({
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'User ID',
      });
      expect(result.endpoints[0].parameters[1]).toEqual({
        name: 'include',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Include related data',
      });
    });

    it('should handle request body', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
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
                    },
                  },
                },
              },
              responses: {
                '201': { description: 'Created' },
              },
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.endpoints[0].requestBody).toEqual({
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      });
    });

    it('should handle complex schema with nested objects and arrays', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                profile: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                  },
                  required: ['firstName'],
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                },
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'pending'],
                },
              },
              required: ['id', 'profile'],
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.schemas.User).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
            required: ['firstName'],
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
        required: ['id', 'profile'],
      });
    });

    it('should handle schema with $ref', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {},
        components: {
          schemas: {
            UserRef: {
              $ref: '#/components/schemas/User',
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.schemas.UserRef).toEqual({
        type: 'object',
        format: undefined,
        description: undefined,
        example: undefined,
        $ref: '#/components/schemas/User',
      });
    });

    it('should generate operationId when not provided', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {
          '/users/{id}': {
            get: {
              // No operationId provided
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.endpoints[0].operationId).toBe('getusersid');
    });

    it('should handle null/undefined schema', async () => {
      const mockApiSpec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [],
        paths: {
          '/test': {
            get: {
              parameters: [
                {
                  name: 'param',
                  in: 'query',
                  schema: null,
                },
              ],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      mockValidate.mockResolvedValue(mockApiSpec as any);

      const result = await parser.parse('/path/to/swagger.json');

      expect(result.endpoints[0].parameters[0].schema).toEqual({ type: 'any' });
    });

    it('should throw error when swagger validation fails', async () => {
      const error = new Error('Invalid swagger specification');
      mockValidate.mockRejectedValue(error);

      await expect(parser.parse('/path/to/invalid.json')).rejects.toThrow(
        'Failed to parse Swagger specification: Invalid swagger specification'
      );
    });
  });
});