import { CodeGenerator } from '../../src/generator/code-generator';
import { TypeGenerator } from '../../src/generator/type-generator';
import { ApiGenerator } from '../../src/generator/api-generator';
import { DbGenerator } from '../../src/generator/db-generator';
import * as fs from 'fs-extra';
import * as path from 'path';

// Import global test helpers
import '../setup';

jest.mock('../../src/generator/type-generator');
jest.mock('../../src/generator/api-generator');
jest.mock('../../src/generator/db-generator');
jest.mock('fs-extra');

describe('CodeGenerator', () => {
  let generator: CodeGenerator;
  let mockTypeGenerator: jest.Mocked<TypeGenerator>;
  let mockApiGenerator: jest.Mocked<ApiGenerator>;
  let mockDbGenerator: jest.Mocked<DbGenerator>;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    mockTypeGenerator = new TypeGenerator(mockConfig) as jest.Mocked<TypeGenerator>;
    mockApiGenerator = new ApiGenerator(mockConfig) as jest.Mocked<ApiGenerator>;
    mockDbGenerator = new DbGenerator(mockConfig) as jest.Mocked<DbGenerator>;

    (TypeGenerator as jest.Mock).mockImplementation(() => mockTypeGenerator);
    (ApiGenerator as jest.Mock).mockImplementation(() => mockApiGenerator);
    (DbGenerator as jest.Mock).mockImplementation(() => mockDbGenerator);

    generator = new CodeGenerator(mockConfig);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    const outputDir = './generated-api';
    const mockParsedSwagger = createMockSwaggerSpec();

    it('should create all necessary directories', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.ensureDir).toHaveBeenCalledWith(outputDir);
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputDir, 'types'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputDir, 'api'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputDir, 'db'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputDir, 'config'));
    });

    it('should call all generators with correct parameters', async () => {
      const seedData = { users: [{ id: '1', name: 'John' }] };

      await generator.generate(mockParsedSwagger, outputDir, seedData);

      expect(mockTypeGenerator.generate).toHaveBeenCalledWith(
        mockParsedSwagger,
        path.join(outputDir, 'types')
      );
      expect(mockApiGenerator.generate).toHaveBeenCalledWith(
        mockParsedSwagger,
        path.join(outputDir, 'api')
      );
      expect(mockDbGenerator.generate).toHaveBeenCalledWith(
        mockParsedSwagger,
        path.join(outputDir, 'db'),
        seedData
      );
    });

    it('should call generators without seed data when not provided', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(mockDbGenerator.generate).toHaveBeenCalledWith(
        mockParsedSwagger,
        path.join(outputDir, 'db'),
        undefined
      );
    });

    it('should generate configuration file', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'config', 'api-config.ts'),
        expect.stringContaining('export interface ApiConfig')
      );

      const configCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('api-config.ts')
      );
      const configContent = configCall[1];

      expect(configContent).toContain('export const defaultConfig: ApiConfig = {');
      expect(configContent).toContain(`dbName: '${mockConfig.dbName}'`);
      expect(configContent).toContain(`responseDelay: ${mockConfig.responseDelay}`);
      expect(configContent).toContain(`enableLogging: ${mockConfig.enableLogging}`);
      expect(configContent).toContain(`enableValidation: ${mockConfig.enableValidation}`);
      expect(configContent).toContain(`errorRate: ${mockConfig.errorRate}`);
    });

    it('should include API info in configuration file', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      const configCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('api-config.ts')
      );
      const configContent = configCall[1];

      expect(configContent).toContain('export const apiInfo = {');
      expect(configContent).toContain(`title: '${mockParsedSwagger.info.title}'`);
      expect(configContent).toContain(`version: '${mockParsedSwagger.info.version}'`);
      expect(configContent).toContain(`description: '${mockParsedSwagger.info.description || ''}'`);
    });

    it('should generate main index file', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'index.ts'),
        expect.stringContaining('// Generated API Exports')
      );

      const indexCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].endsWith('index.ts') && !call[0].includes('/types/') && !call[0].includes('/api/') && !call[0].includes('/db/')
      );
      const indexContent = indexCall[1];

      expect(indexContent).toContain("export * from './types';");
      expect(indexContent).toContain("export * from './api';");
      expect(indexContent).toContain("export * from './db';");
      expect(indexContent).toContain("export * from './config/api-config';");
    });

    it('should generate types index file', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'types', 'index.ts'),
        expect.stringContaining('// Generated Type Exports')
      );

      const typesIndexCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('/types/index.ts')
      );
      const typesIndexContent = typesIndexCall[1];

      expect(typesIndexContent).toContain("export * from './index.types';");
    });

    it('should generate API index file with controller exports', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'api', 'index.ts'),
        expect.stringContaining('// Generated API Function Exports')
      );

      const apiIndexCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('/api/index.ts')
      );
      const apiIndexContent = apiIndexCall[1];

      // Should export controllers based on tags in mock swagger spec
      expect(apiIndexContent).toContain("export * from './users-api';");
    });

    it('should generate DB index file with controller exports', async () => {
      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'db', 'index.ts'),
        expect.stringContaining('// Generated Database Layer Exports')
      );

      const dbIndexCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('/db/index.ts')
      );
      const dbIndexContent = dbIndexCall[1];

      expect(dbIndexContent).toContain("export * from './db-setup';");
      expect(dbIndexContent).toContain("export * from './users-db';");
    });

    it('should handle endpoints with multiple tags', async () => {
      const swaggerWithMultipleTags = {
        ...mockParsedSwagger,
        endpoints: [
          {
            ...mockParsedSwagger.endpoints[0],
            tags: ['users'],
          },
          {
            ...mockParsedSwagger.endpoints[1],
            tags: ['posts'],
          },
          {
            ...mockParsedSwagger.endpoints[2],
            tags: ['users'],
          },
        ],
      };

      await generator.generate(swaggerWithMultipleTags, outputDir);

      const apiIndexCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('/api/index.ts')
      );
      const apiIndexContent = apiIndexCall[1];

      expect(apiIndexContent).toContain("export * from './users-api';");
      expect(apiIndexContent).toContain("export * from './posts-api';");
    });

    it('should handle endpoints without tags (default controller)', async () => {
      const swaggerWithoutTags = {
        ...mockParsedSwagger,
        endpoints: [
          {
            ...mockParsedSwagger.endpoints[0],
            tags: undefined,
          },
        ],
      };

      await generator.generate(swaggerWithoutTags, outputDir);

      const apiIndexCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('/api/index.ts')
      );
      const apiIndexContent = apiIndexCall[1];

      expect(apiIndexContent).toContain("export * from './default-api';");
    });

    it('should handle empty endpoints array', async () => {
      const swaggerWithoutEndpoints = {
        ...mockParsedSwagger,
        endpoints: [],
      };

      await generator.generate(swaggerWithoutEndpoints, outputDir);

      // Should still create all necessary files
      expect(fs.ensureDir).toHaveBeenCalledWith(outputDir);
      expect(mockTypeGenerator.generate).toHaveBeenCalled();
      expect(mockApiGenerator.generate).toHaveBeenCalled();
      expect(mockDbGenerator.generate).toHaveBeenCalled();
    });

    it('should handle configuration with missing description', async () => {
      const swaggerWithoutDescription = {
        ...mockParsedSwagger,
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      };

      await generator.generate(swaggerWithoutDescription, outputDir);

      const configCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('api-config.ts')
      );
      const configContent = configCall[1];

      expect(configContent).toContain("description: ''");
    });

    it('should propagate errors from sub-generators', async () => {
      const error = new Error('Type generation failed');
      mockTypeGenerator.generate.mockRejectedValue(error);

      await expect(generator.generate(mockParsedSwagger, outputDir))
        .rejects.toThrow('Type generation failed');
    });

    it('should propagate errors from file system operations', async () => {
      // Make sure all sub-generators succeed
      mockTypeGenerator.generate.mockResolvedValue(undefined);
      mockApiGenerator.generate.mockResolvedValue(undefined);
      mockDbGenerator.generate.mockResolvedValue(undefined);
      
      // Make ensureDir succeed
      (fs.ensureDir as any).mockResolvedValue(undefined);
      
      // Make writeFile fail
      const error = new Error('Cannot write file');
      (fs.writeFile as any).mockRejectedValue(error);

      await expect(generator.generate(mockParsedSwagger, outputDir))
        .rejects.toThrow('Cannot write file');
    });

    it('should call generators in correct order', async () => {
      const callOrder: string[] = [];
      
      mockTypeGenerator.generate.mockImplementation(async () => {
        callOrder.push('type');
      });
      
      mockApiGenerator.generate.mockImplementation(async () => {
        callOrder.push('api');
      });
      
      mockDbGenerator.generate.mockImplementation(async () => {
        callOrder.push('db');
      });

      (fs.writeFile as any).mockImplementation(async (filePath: string) => {
        if (filePath.includes('api-config.ts')) {
          callOrder.push('config');
        } else if (filePath.endsWith('index.ts')) {
          callOrder.push('index');
        }
      });

      await generator.generate(mockParsedSwagger, outputDir);

      expect(callOrder).toEqual(['type', 'api', 'db', 'config', 'index', 'index', 'index', 'index']);
    });
  });
});