import { DbGenerator } from '../../src/generator/db-generator';
import * as fs from 'fs-extra';
import * as path from 'path';

// Import global test helpers
import '../setup';

jest.mock('fs-extra');

describe('DbGenerator', () => {
  let generator: DbGenerator;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    generator = new DbGenerator(mockConfig);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate database setup file', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();
      const outputDir = '/test/output';

      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'db-setup.ts'),
        expect.stringContaining('// Generated IndexedDB Setup')
      );
    });

    it('should generate database files for each controller', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();
      const outputDir = '/test/output';

      await generator.generate(mockParsedSwagger, outputDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'users-db.ts'),
        expect.stringContaining('// Generated Database operations for Users')
      );
    });

    it('should generate db-setup with correct structure', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const setupCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('db-setup.ts')
      );
      const setupContent = setupCall[1];

      expect(setupContent).toContain('export interface DbRecord {');
      expect(setupContent).toContain('export class DatabaseManager {');
      expect(setupContent).toContain('async init(): Promise<void> {');
      expect(setupContent).toContain('export const dbManager = new DatabaseManager();');
      expect(setupContent).toContain('export function generateId(): string {');
      expect(setupContent).toContain('export function createDbRecord<T extends object>(data: T): DbRecord & T {');
      expect(setupContent).toContain('export function updateDbRecord<T extends DbRecord>(record: T, updates: Partial<T>): T {');
    });

    it('should include all controller stores in db-setup', async () => {
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
            path: '/comments',
            method: 'GET',
            operationId: 'getComments',
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
            tags: ['comments'],
          },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      const setupCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('db-setup.ts')
      );
      const setupContent = setupCall[1];

      expect(setupContent).toContain("'users'");
      expect(setupContent).toContain("'posts'");
      expect(setupContent).toContain("'comments'");
    });

    it('should generate database class with correct structure', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('export class usersDatabase {');
      expect(dbContent).toContain("private readonly storeName = 'users';");
      expect(dbContent).toContain('async findAll(params?: any): Promise<DbRecord[]> {');
      expect(dbContent).toContain('async findById(id: string): Promise<DbRecord | null> {');
      expect(dbContent).toContain('async create(data: any): Promise<DbRecord> {');
      expect(dbContent).toContain('async update(id: string, updates: any): Promise<DbRecord> {');
      expect(dbContent).toContain('async delete(id: string): Promise<void> {');
    });

    it('should include all CRUD operations', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('async findAll(');
      expect(dbContent).toContain('async findById(');
      expect(dbContent).toContain('async create(');
      expect(dbContent).toContain('async update(');
      expect(dbContent).toContain('async delete(');
      expect(dbContent).toContain('async clearAll(');
      expect(dbContent).toContain('async getStats(');
      expect(dbContent).toContain('async exportAll(');
      expect(dbContent).toContain('async importAll(');
    });

    it('should include proper error handling', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('if (!record) {');
      expect(dbContent).toContain('const error = new Error(');
      expect(dbContent).toContain('(error as any).status = 404;');
      expect(dbContent).toContain('reject(error);');
    });

    it('should include filtering, sorting, and pagination support', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('if (params.filter) {');
      expect(dbContent).toContain('records = queryByFilter(records, params.filter);');
      expect(dbContent).toContain('if (params.sortBy) {');
      expect(dbContent).toContain('records = sortRecords(records, params.sortBy, params.sortOrder);');
      expect(dbContent).toContain('if (params.page || params.pageSize) {');
      expect(dbContent).toContain('const paginated = paginateRecords(records, params.page, params.pageSize);');
    });

    it('should generate seedData method with provided seed data', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();
      const seedData = {
        users: [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output', seedData);

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('async seedData(): Promise<void> {');
      expect(dbContent).toContain('const seedRecords = [');
      expect(dbContent).toContain('"name": "John Doe"');
      expect(dbContent).toContain('"email": "john@example.com"');
      expect(dbContent).toContain('if (existingRecords.length > 0) {');
      expect(dbContent).toContain('console.log(`Users database already contains data, skipping seed`);');
      expect(dbContent).toContain('console.log(`Seeded Users database with ${dbRecords.length} records`);');
    });

    it('should generate seedData method without seed data', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output', null);

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('async seedData(): Promise<void> {');
      expect(dbContent).toContain('console.log(`No seed data provided for Users`);');
    });

    it('should handle controllers without seed data', async () => {
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
        ],
      };

      const seedData = {
        users: [{ id: '1', name: 'John' }],
        // No seed data for posts
      };

      await generator.generate(mockParsedSwagger, '/test/output', seedData);

      const postsDbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('posts-db.ts')
      );
      const postsDbContent = postsDbCall[1];

      expect(postsDbContent).toContain('console.log(`No seed data provided for Posts`);');
    });

    it('should include proper imports in database files', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain("import {");
      expect(dbContent).toContain("dbManager,");
      expect(dbContent).toContain("DbRecord,");
      expect(dbContent).toContain("createDbRecord,");
      expect(dbContent).toContain("updateDbRecord,");
      expect(dbContent).toContain("queryByFilter,");
      expect(dbContent).toContain("sortRecords,");
      expect(dbContent).toContain("paginateRecords");
      expect(dbContent).toContain("} from './db-setup';");
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
        expect.stringContaining('default-db.ts'),
        expect.stringContaining('export class defaultDatabase {')
      );
    });

    it('should include utility functions in db-setup', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const setupCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('db-setup.ts')
      );
      const setupContent = setupCall[1];

      expect(setupContent).toContain('export function queryByFilter<T extends DbRecord>(');
      expect(setupContent).toContain('export function sortRecords<T extends DbRecord>(');
      expect(setupContent).toContain('export function paginateRecords<T extends DbRecord>(');
      expect(setupContent).toContain('return [...records].sort((a, b) => {');
      expect(setupContent).toContain('return records.filter(record => {');
      expect(setupContent).toContain('const data = records.slice(startIndex, endIndex);');
    });

    it('should include database management functions', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const setupCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('db-setup.ts')
      );
      const setupContent = setupCall[1];

      expect(setupContent).toContain('getDatabase(): IDBDatabase {');
      expect(setupContent).toContain('async close(): Promise<void> {');
      expect(setupContent).toContain('async clearDatabase(): Promise<void> {');
      expect(setupContent).toContain('private createObjectStores(db: IDBDatabase): void {');
    });

    it('should handle IndexedDB operations correctly', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('const transaction = db.transaction(this.storeName,');
      expect(dbContent).toContain('const store = transaction.objectStore(this.storeName);');
      expect(dbContent).toContain('request.onsuccess = () => {');
      expect(dbContent).toContain('request.onerror = () => {');
    });

    it('should implement proper async/await patterns with Promises', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain('return new Promise((resolve, reject) => {');
      expect(dbContent).toContain('return new Promise<void>((res, rej) => {');
      expect(dbContent).toContain('Promise.all(promises).then(() => resolve()).catch(reject);');
    });

    it('should include proper type annotations', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const dbCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('users-db.ts')
      );
      const dbContent = dbCall[1];

      expect(dbContent).toContain(': Promise<DbRecord[]>');
      expect(dbContent).toContain(': Promise<DbRecord | null>');
      expect(dbContent).toContain(': Promise<DbRecord>');
      expect(dbContent).toContain(': Promise<void>');
      expect(dbContent).toContain(': Promise<{ totalRecords: number; lastUpdated: Date }>');
    });

    it('should handle multiple controllers correctly', async () => {
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
        ],
      };

      await generator.generate(mockParsedSwagger, '/test/output');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('users-db.ts'),
        expect.any(String)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('posts-db.ts'),
        expect.any(String)
      );

      // Should generate separate files
      expect((fs.writeFile as any).mock.calls).toHaveLength(3); // db-setup + users-db + posts-db
    });

    it('should create object stores with proper indexes', async () => {
      const mockParsedSwagger = createMockSwaggerSpec();

      await generator.generate(mockParsedSwagger, '/test/output');

      const setupCall = (fs.writeFile as any).mock.calls.find((call: any) => 
        call[0].includes('db-setup.ts')
      );
      const setupContent = setupCall[1];

      expect(setupContent).toContain("const store = db.createObjectStore(storeName, { keyPath: 'id' });");
      expect(setupContent).toContain("store.createIndex('createdAt', 'createdAt', { unique: false });");
      expect(setupContent).toContain("store.createIndex('updatedAt', 'updatedAt', { unique: false });");
    });
  });
});