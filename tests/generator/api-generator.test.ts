import { ApiGenerator } from '../../src/generator/api-generator';
import * as fs from 'fs-extra';
import * as path from 'path';

// Import global test helpers
import '../setup';

jest.mock('fs-extra');

describe('ApiGenerator', () => {
  let generator: ApiGenerator;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    generator = new ApiGenerator(mockConfig);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate API files for each controller', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();
      const outputDir = '/test/output';

      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'users-api.ts'),
        expect.stringContaining('// Generated API functions for Users')
      );
    });

    it('should group endpoints by controller tags', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getUsers',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
          {
            path: '/posts',
            method: 'GET',
            operationId: 'getPosts',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['posts'],
          },
          {
            path: '/users/{id}',
            method: 'GET',
            operationId: 'getUserById',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('users-api.ts'),
        expect.any(String)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('posts-api.ts'),
        expect.any(String)
      );
    });

    it('should handle endpoints without tags (default controller)', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/test',
            method: 'GET',
            operationId: 'getTest',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: undefined,
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('default-api.ts'),
        expect.any(String)
      );
    });

    it('should generate API class with correct structure', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();
      
      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export class UsersApi {');
      expect(generatedContent).toContain('private db: usersDatabase;');
      expect(generatedContent).toContain('constructor() {');
      expect(generatedContent).toContain('this.db = new usersDatabase();');
      expect(generatedContent).toContain('async init(): Promise<void> {');
      expect(generatedContent).toContain('await this.db.init();');
      expect(generatedContent).toContain('await this.db.seedData();');
    });

    it('should generate API functions for each endpoint', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getUsers',
            summary: 'Get all users',
            description: 'Retrieve all users from the system',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
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
                in: 'path' as const,
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async getUsers(): Promise<ApiResponse<any>> {');
      expect(generatedContent).toContain('async getUserById(id: string): Promise<ApiResponse<any>> {');
    });

    it('should handle path parameters correctly', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users/{userId}/posts/{postId}',
            method: 'GET',
            operationId: 'getUserPost',
            parameters: [
              {
                name: 'userId',
                in: 'path' as const,
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'postId',
                in: 'path' as const,
                required: true,
                schema: { type: 'integer' },
              },
            ],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async getUserPost(userId: string, postId: number): Promise<ApiResponse<any>> {');
    });

    it('should handle query parameters correctly', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getUsers',
            parameters: [
              {
                name: 'page',
                in: 'query' as const,
                required: false,
                schema: { type: 'integer' },
              },
              {
                name: 'limit',
                in: 'query' as const,
                required: true,
                schema: { type: 'integer' },
              },
            ],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('params?: { page?: number; limit: number;  }');
    });

    it('should handle request body correctly', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'POST',
            operationId: 'createUser',
            parameters: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
            responses: [{ statusCode: '201', description: 'Created' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async createUser(body: any): Promise<ApiResponse<any>> {');
    });

    it('should handle mixed parameters correctly', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users/{id}',
            method: 'PUT',
            operationId: 'updateUser',
            parameters: [
              {
                name: 'id',
                in: 'path' as const,
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'force',
                in: 'query' as const,
                required: false,
                schema: { type: 'boolean' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
            responses: [{ statusCode: '200', description: 'Updated' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async updateUser(id: string, params?: { force?: boolean;  }, body: any): Promise<ApiResponse<any>> {');
    });

    it('should generate correct status codes based on HTTP method', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'POST',
            operationId: 'createUser',
            parameters: [],
            responses: [],
            tags: ['users'],
          },
          {
            path: '/users/{id}',
            method: 'DELETE',
            operationId: 'deleteUser',
            parameters: [],
            responses: [],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('status: 201'); // POST default
      expect(generatedContent).toContain('status: 204'); // DELETE default
    });

    it('should respect response status codes from specification', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getUsers',
            parameters: [],
            responses: [
              { statusCode: '202', description: 'Accepted' },
            ],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('status: 202');
      expect(generatedContent).toContain("statusText: 'Success'");
    });

    it('should generate convenience functions', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async clearAllData(): Promise<void> {');
      expect(generatedContent).toContain('await this.db.clearAll();');
      expect(generatedContent).toContain('async getStats(): Promise<{ totalRecords: number; lastUpdated: Date }> {');
      expect(generatedContent).toContain('return await this.db.getStats();');
      expect(generatedContent).toContain('async exportData(): Promise<any[]> {');
      expect(generatedContent).toContain('return await this.db.exportAll();');
      expect(generatedContent).toContain('async importData(data: any[]): Promise<void> {');
      expect(generatedContent).toContain('await this.db.importAll(data);');
    });

    it('should generate singleton instance and exports', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('const usersApi = new UsersApi();');
      expect(generatedContent).toContain('export { usersApi };');
      expect(generatedContent).toContain('export default usersApi;');
    });

    it('should export convenience functions', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getUsers',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('export const getUsers = usersApi.getUsers.bind(usersApi);');
    });

    it('should generate function names from operationId when available', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getAllUsersFromSystem',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async getAllUsersFromSystem(): Promise<ApiResponse<any>> {');
    });

    it('should generate function names from method and path when operationId is missing', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users/profiles',
            method: 'GET',
            operationId: '',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('async getProfiles(): Promise<ApiResponse<any>> {');
    });

    it('should map database function names correctly', async () => {
      const mockParsedSwagger = {
        ...createMockSwaggerSpec(),
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            operationId: 'getUsers',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
          {
            path: '/users/{id}',
            method: 'GET',
            operationId: 'getUserById',
            parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' } }],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['users'],
          },
          {
            path: '/users',
            method: 'POST',
            operationId: 'createUser',
            parameters: [],
            responses: [{ statusCode: '201', description: 'Created' }],
            tags: ['users'],
          },
          {
            path: '/users/{id}',
            method: 'PUT',
            operationId: 'updateUser',
            parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' } }],
            responses: [{ statusCode: '200', description: 'Updated' }],
            tags: ['users'],
          },
          {
            path: '/users/{id}',
            method: 'DELETE',
            operationId: 'deleteUser',
            parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' } }],
            responses: [{ statusCode: '204', description: 'Deleted' }],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('await this.db.findAll(');
      expect(generatedContent).toContain('await this.db.findById(');
      expect(generatedContent).toContain('await this.db.create(');
      expect(generatedContent).toContain('await this.db.update(');
      expect(generatedContent).toContain('await this.db.delete(');
    });

    it('should include proper imports', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain("import { ApiResponse, ApiError } from '../types';");
      expect(generatedContent).toContain("import { usersDatabase } from '../db/users-db';");
      expect(generatedContent).toContain("import { defaultConfig } from '../config/api-config';");
    });

    it('should include error handling', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('} catch (error) {');
      expect(generatedContent).toContain('const apiError: ApiError = {');
      expect(generatedContent).toContain('message: (error as Error).message,');
      expect(generatedContent).toContain('status: ');
      expect(generatedContent).toContain('details: error');
      expect(generatedContent).toContain('throw apiError;');
    });

    it('should include logging when enabled', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('if (defaultConfig.enableLogging) {');
      expect(generatedContent).toContain('console.log(');
      expect(generatedContent).toContain('console.error(');
    });

    it('should include response delay simulation', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const writeFileCall = (fs.writeFile as any).mock.calls[0];
      const generatedContent = writeFileCall[1];

      expect(generatedContent).toContain('if (defaultConfig.responseDelay > 0) {');
      expect(generatedContent).toContain('await new Promise(resolve => setTimeout(resolve, defaultConfig.responseDelay));');
    });
  });
});