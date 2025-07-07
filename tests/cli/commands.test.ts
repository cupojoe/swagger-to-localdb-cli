import { generateCommand } from '../../src/cli/commands';
import { SwaggerSpecParser } from '../../src/parser/swagger-parser';
import { CodeGenerator } from '../../src/generator/code-generator';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';

// Import global test helpers
import '../setup';

// Mock dependencies
jest.mock('../../src/parser/swagger-parser');
jest.mock('../../src/generator/code-generator');
jest.mock('fs-extra');
jest.mock('chalk');
jest.mock('ora');

describe('CLI Commands', () => {
  let mockParser: jest.Mocked<SwaggerSpecParser>;
  let mockGenerator: jest.Mocked<CodeGenerator>;
  let mockSpinner: any;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockParser = new SwaggerSpecParser() as jest.Mocked<SwaggerSpecParser>;
    mockGenerator = new CodeGenerator({} as any) as jest.Mocked<CodeGenerator>;
    
    (SwaggerSpecParser as jest.Mock).mockImplementation(() => mockParser);
    (CodeGenerator as jest.Mock).mockImplementation(() => mockGenerator);

    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      text: '',
    };
    (ora as any).mockReturnValue(mockSpinner);

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

    // Mock fs methods
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readJson as jest.Mock).mockResolvedValue({});

    // Mock chalk - these are already mocked in setup.ts
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe('generateCommand', () => {
    const defaultOptions = {
      output: './generated-api',
      dbName: 'mockApiDB',
      delay: '200',
      verbose: false,
      validation: true,
    };

    it('should successfully generate code with default options', async () => {
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      await generateCommand('swagger.json', defaultOptions);

      expect(fs.pathExists).toHaveBeenCalledWith('swagger.json');
      expect(mockParser.parse).toHaveBeenCalledWith('swagger.json');
      expect(mockGenerator.generate).toHaveBeenCalledWith(
        mockParsedSpec,
        './generated-api',
        null
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Successfully generated TypeScript API files!');
    });

    it('should fail when input file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await generateCommand('nonexistent.json', defaultOptions);

      expect(mockSpinner.fail).toHaveBeenCalledWith('Input file not found: nonexistent.json');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should load and use custom configuration', async () => {
      const customConfig = {
        dbName: 'customDB',
        responseDelay: 500,
        enableLogging: true,
        enableValidation: false,
        outputFormat: 'typescript',
        errorRate: 0.1,
        generateTests: true,
      };

      (fs.readJson as jest.Mock).mockResolvedValue(customConfig);
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithConfig = {
        ...defaultOptions,
        config: './custom-config.json',
      };

      await generateCommand('swagger.json', optionsWithConfig);

      expect(fs.readJson).toHaveBeenCalledWith(path.resolve('./custom-config.json'));
      expect(CodeGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          dbName: 'customDB',
          responseDelay: 500,
          enableLogging: true,
          enableValidation: false,
        })
      );
    });

    it('should load and use seed data', async () => {
      const seedData = {
        users: [
          { id: '1', name: 'John', email: 'john@example.com' },
          { id: '2', name: 'Jane', email: 'jane@example.com' },
        ],
      };

      // Setup fs.readJson calls in sequence
      (fs.readJson as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('seed-data.json')) {
            return Promise.resolve(seedData);
          }
          return Promise.resolve({}); // Default config
        });
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithSeed = {
        ...defaultOptions,
        seed: './seed-data.json',
      };

      await generateCommand('swagger.json', optionsWithSeed);

      expect(fs.readJson).toHaveBeenCalledWith(path.resolve('./seed-data.json'));
      expect(mockGenerator.generate).toHaveBeenCalledWith(
        mockParsedSpec,
        './generated-api',
        seedData
      );
    });

    it('should handle verbose mode', async () => {
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const verboseOptions = {
        ...defaultOptions,
        verbose: true,
      };

      await generateCommand('swagger.json', verboseOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Configuration:',
        expect.stringContaining('"dbName": "mockApiDB"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Parsed endpoints:',
        mockParsedSpec.endpoints.length
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Parsed schemas:',
        Object.keys(mockParsedSpec.schemas).length
      );
    });

    it('should handle verbose mode with seed data', async () => {
      const seedData = {
        users: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }],
      };

      // Setup fs.readJson to return seed data when requested
      (fs.readJson as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('seed-data.json')) {
            return Promise.resolve(seedData);
          }
          return Promise.resolve({});
        });
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const verboseOptions = {
        ...defaultOptions,
        verbose: true,
        seed: './seed-data.json',
      };

      await generateCommand('swagger.json', verboseOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Seed data loaded:',
        ['users: 2 items']
      );
    });

    it('should handle parser errors in verbose mode', async () => {
      const error = new Error('Invalid swagger specification');
      mockParser.parse.mockRejectedValue(error);

      const verboseOptions = {
        ...defaultOptions,
        verbose: true,
      };

      await generateCommand('swagger.json', verboseOptions);

      expect(mockSpinner.fail).toHaveBeenCalledWith('Generation failed');
      expect(mockConsoleError).toHaveBeenCalledWith('Error details:', error);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle parser errors in non-verbose mode', async () => {
      const error = new Error('Invalid swagger specification');
      mockParser.parse.mockRejectedValue(error);

      await generateCommand('swagger.json', defaultOptions);

      expect(mockSpinner.fail).toHaveBeenCalledWith('Generation failed');
      expect(mockConsoleError).toHaveBeenCalledWith('Error:', 'Invalid swagger specification');
      expect(mockConsoleLog).toHaveBeenCalledWith('Use --verbose flag for more details');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle generator errors', async () => {
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      
      const error = new Error('Code generation failed');
      mockGenerator.generate.mockRejectedValue(error);

      await generateCommand('swagger.json', defaultOptions);

      expect(mockSpinner.fail).toHaveBeenCalledWith('Generation failed');
      expect(mockConsoleError).toHaveBeenCalledWith('Error:', 'Code generation failed');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should warn when config file cannot be loaded', async () => {
      (fs.readJson as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('nonexistent-config.json')) {
            return Promise.reject(new Error('File not found'));
          }
          return Promise.resolve({});
        });
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithConfig = {
        ...defaultOptions,
        config: './nonexistent-config.json',
      };

      await generateCommand('swagger.json', optionsWithConfig);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load config file ./nonexistent-config.json, using defaults')
      );
    });

    it('should warn when seed file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithSeed = {
        ...defaultOptions,
        seed: './nonexistent-seed.json',
      };

      await generateCommand('swagger.json', optionsWithSeed);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Seed file not found: ./nonexistent-seed.json')
      );
    });

    it('should warn when seed data is invalid', async () => {
      (fs.readJson as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('invalid-seed.json')) {
            return Promise.resolve('invalid seed data'); // Not an object
          }
          return Promise.resolve({});
        });
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithSeed = {
        ...defaultOptions,
        seed: './invalid-seed.json',
      };

      await generateCommand('swagger.json', optionsWithSeed);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load seed file ./invalid-seed.json: Seed data must be a JSON object')
      );
    });

    it('should filter out non-array values from seed data', async () => {
      const seedData = {
        users: [{ id: '1', name: 'John' }],
        invalidData: 'not an array',
        posts: [{ id: '1', title: 'Test Post' }],
      };

      (fs.readJson as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('seed-data.json')) {
            return Promise.resolve(seedData);
          }
          return Promise.resolve({});
        });
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithSeed = {
        ...defaultOptions,
        seed: './seed-data.json',
      };

      await generateCommand('swagger.json', optionsWithSeed);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Seed data for 'invalidData' is not an array, skipping")
      );
      expect(mockGenerator.generate).toHaveBeenCalledWith(
        mockParsedSpec,
        './generated-api',
        {
          users: [{ id: '1', name: 'John' }],
          posts: [{ id: '1', title: 'Test Post' }],
        }
      );
    });

    it('should handle seed data read errors', async () => {
      (fs.readJson as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('seed-data.json')) {
            return Promise.reject(new Error('Read error'));
          }
          return Promise.resolve({});
        });
      
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const optionsWithSeed = {
        ...defaultOptions,
        seed: './seed-data.json',
      };

      await generateCommand('swagger.json', optionsWithSeed);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load seed file ./seed-data.json: Read error')
      );
    });

    it('should use default values when options are not provided', async () => {
      const mockParsedSpec = createMockSwaggerSpec();
      mockParser.parse.mockResolvedValue(mockParsedSpec);
      mockGenerator.generate.mockResolvedValue(undefined);

      const minimalOptions = {
        output: './generated-api',
      };

      await generateCommand('swagger.json', minimalOptions);

      expect(CodeGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          dbName: 'mockApiDB',
          responseDelay: 200,
          enableLogging: false,
          enableValidation: true,
          outputFormat: 'typescript',
          errorRate: 0,
          generateTests: false,
        })
      );
    });
  });
});