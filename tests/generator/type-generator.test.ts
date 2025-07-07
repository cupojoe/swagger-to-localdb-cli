import { TypeGenerator } from '../../src/generator/type-generator';
import * as fs from 'fs-extra';
import * as path from 'path';

// Import global test helpers
import '../setup';

jest.mock('fs-extra');

describe('TypeGenerator', () => {
  let generator: TypeGenerator;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    generator = new TypeGenerator(mockConfig);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate type definitions and write to file', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();
      const outputDir = '/test/output';

      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'index.types.ts'),
        expect.stringContaining('// Generated TypeScript interfaces from Swagger specification')
      );
    });

    it('should generate basic interfaces correctly', async () => {
      const mockParsedSwagger = {
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test Description',
        },
        servers: [],
        endpoints: [],
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'User ID' },
              name: { type: 'string', description: 'User name' },
              email: { type: 'string' },
              age: { type: 'integer' },
              isActive: { type: 'boolean' },
            },
            required: ['id', 'name'],
          },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export interface User {');
      expect(generatedContent).toContain('/** User ID */');
      expect(generatedContent).toContain('id: string;');
      expect(generatedContent).toContain('/** User name */');
      expect(generatedContent).toContain('name: string;');
      expect(generatedContent).toContain('email?: string;');
      expect(generatedContent).toContain('age?: number;');
      expect(generatedContent).toContain('isActive?: boolean;');
    });

    it('should handle array types correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [],
        schemas: {
          UserList: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
          Tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export type UserList = { id?: string; name?: string }[];');
      expect(generatedContent).toContain('export type Tags = string[];');
    });

    it('should handle enum types correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [],
        schemas: {
          Status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
          Priority: {
            type: 'integer',
            enum: [1, 2, 3],
          },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain("export type Status = 'active' | 'inactive' | 'pending';");
      expect(generatedContent).toContain('export type Priority = 1 | 2 | 3;');
    });

    it('should handle $ref types correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [],
        schemas: {
          UserRef: {
            type: 'any',
            $ref: '#/components/schemas/User',
          },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export type UserRef = User;');
    });

    it('should handle nested object types correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [],
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
                  address: {
                    type: 'object',
                    properties: {
                      street: { type: 'string' },
                      city: { type: 'string' },
                    },
                    required: ['city'],
                  },
                },
                required: ['firstName'],
              },
            },
            required: ['id', 'profile'],
          },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export interface User {');
      expect(generatedContent).toContain('id: string;');
      expect(generatedContent).toContain('profile: { firstName: string; lastName?: string; address?: { street?: string; city: string } };');
    });

    it('should generate endpoint-specific types correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [
          {
            path: '/users',
            method: 'POST',
            operationId: 'createUser',
            parameters: [
              {
                name: 'tenantId',
                in: 'path' as const,
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'include',
                in: 'query' as const,
                required: false,
                schema: { type: 'string' },
              },
            ],
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
            responses: [
              {
                statusCode: '201',
                description: 'Created',
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
          },
        ],
        schemas: {},
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export interface CreateUserRequest {');
      expect(generatedContent).toContain('tenantId: string;');
      expect(generatedContent).toContain('params?: {');
      expect(generatedContent).toContain('include?: string;');
      expect(generatedContent).toContain('body: { name?: string; email?: string };');
      expect(generatedContent).toContain('export type CreateUserResponse = ApiResponse<{ id?: string; name?: string; email?: string }>;');
    });

    it('should handle endpoints without request body', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [
          {
            path: '/users/{id}',
            method: 'GET',
            operationId: 'getUserById',
            parameters: [
              {
                name: 'id',
                in: 'path' as const,
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: [
              {
                statusCode: '200',
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
        schemas: {},
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).not.toContain('export interface GetUserByIdRequest');
      expect(generatedContent).toContain('export type GetUserByIdResponse = ApiResponse<{ id?: string; name?: string }>;');
    });

    it('should handle endpoints without success response content', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [
          {
            path: '/users/{id}',
            method: 'DELETE',
            operationId: 'deleteUser',
            parameters: [],
            responses: [
              {
                statusCode: '204',
                description: 'No Content',
              },
            ],
          },
        ],
        schemas: {},
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export type DeleteUserResponse = ApiResponse<void>;');
    });

    it('should include API info in generated header', async () => {
      const mockParsedSwagger = {
        info: {
          title: 'My Custom API',
          version: '2.1.0',
          description: 'A wonderful API for testing',
        },
        servers: [],
        endpoints: [],
        schemas: {},
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('// API: My Custom API v2.1.0');
      expect(generatedContent).toContain('// A wonderful API for testing');
    });

    it('should handle missing API description', async () => {
      const mockParsedSwagger = {
        info: {
          title: 'My API',
          version: '1.0.0',
        },
        servers: [],
        endpoints: [],
        schemas: {},
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('// API: My API v1.0.0');
      expect(generatedContent).not.toContain('// undefined');
    });

    it('should handle primitive schema types correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [],
        schemas: {
          SimpleString: { type: 'string' },
          SimpleNumber: { type: 'number' },
          SimpleBoolean: { type: 'boolean' },
          SimpleArray: { type: 'array' },
          SimpleObject: { type: 'object' },
          UnknownType: { type: 'unknown' },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export type SimpleString = string;');
      expect(generatedContent).toContain('export type SimpleNumber = number;');
      expect(generatedContent).toContain('export type SimpleBoolean = boolean;');
      expect(generatedContent).toContain('export type SimpleArray = any[];');
      expect(generatedContent).toContain('export interface SimpleObject {');
      expect(generatedContent).toContain('export type UnknownType = any;');
    });

    it('should convert case correctly', async () => {
      const mockParsedSwagger = {
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        endpoints: [],
        schemas: {
          'user-profile': {
            type: 'object',
            properties: {
              'first-name': { type: 'string' },
            },
          },
          'api_response': {
            type: 'object',
            properties: {
              data: { type: 'string' },
            },
          },
        },
      } as any;

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export interface UserProfile {');
      expect(generatedContent).toContain('export interface ApiResponse {');
    });
  });
});