import * as fs from 'fs-extra';
import * as path from 'path';
import { ParsedSwagger, SwaggerEndpoint, Config } from '../types/cli-types';

export class DbGenerator {
  constructor(private config: Config) {}

  async generate(parsedSwagger: ParsedSwagger, outputDir: string, seedData?: Record<string, any[]> | null): Promise<void> {
    // Generate database setup file
    const dbSetupContent = this.generateDbSetup(parsedSwagger);
    await fs.writeFile(path.join(outputDir, 'db-setup.ts'), dbSetupContent);

    // Generate database classes for each controller
    const controllerGroups = this.groupEndpointsByController(parsedSwagger.endpoints);
    
    for (const [controller, endpoints] of Object.entries(controllerGroups)) {
      const controllerSeedData = seedData?.[controller] || null;
      const dbContent = this.generateDbFile(controller, endpoints, parsedSwagger, controllerSeedData);
      await fs.writeFile(
        path.join(outputDir, `${controller}-db.ts`),
        dbContent
      );
    }
  }

  private groupEndpointsByController(endpoints: SwaggerEndpoint[]): Record<string, SwaggerEndpoint[]> {
    const groups: Record<string, SwaggerEndpoint[]> = {};
    
    endpoints.forEach(endpoint => {
      const controller = endpoint.tags?.[0] || 'default';
      const controllerKey = controller.toLowerCase();
      
      if (!groups[controllerKey]) {
        groups[controllerKey] = [];
      }
      groups[controllerKey].push(endpoint);
    });
    
    return groups;
  }

  private generateDbSetup(parsedSwagger: ParsedSwagger): string {
    return `// Generated IndexedDB Setup
import { defaultConfig } from '../config/api-config';

export interface DbRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export class DatabaseManager {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number = 1;

  constructor(dbName: string = defaultConfig.dbName) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(\`Failed to open database: \${request.error}\`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    const storeNames = [
      ${this.getUniqueControllers(parsedSwagger).map(controller => `'${controller}'`).join(',\n      ')}
    ];

    storeNames.forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    });
  }

  getDatabase(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async clearDatabase(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const storeNames = Array.from(this.db!.objectStoreNames);
    const transaction = this.db!.transaction(storeNames, 'readwrite');

    const promises = storeNames.map(storeName => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();

// Utility functions
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function createDbRecord<T extends object>(data: T): DbRecord & T {
  return {
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data
  };
}

export function updateDbRecord<T extends DbRecord>(record: T, updates: Partial<T>): T {
  return {
    ...record,
    ...updates,
    updatedAt: new Date()
  };
}

export function queryByFilter<T extends DbRecord>(
  records: T[],
  filter: Record<string, any>
): T[] {
  return records.filter(record => {
    return Object.entries(filter).every(([key, value]) => {
      if (value === undefined || value === null) return true;
      return record[key] === value;
    });
  });
}

export function sortRecords<T extends DbRecord>(
  records: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  return [...records].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

export function paginateRecords<T extends DbRecord>(
  records: T[],
  page: number = 1,
  pageSize: number = 10
): { data: T[]; total: number; page: number; pageSize: number; hasNext: boolean; hasPrevious: boolean } {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = records.slice(startIndex, endIndex);
  
  return {
    data,
    total: records.length,
    page,
    pageSize,
    hasNext: endIndex < records.length,
    hasPrevious: page > 1
  };
}
`;
  }

  private generateDbFile(controller: string, endpoints: SwaggerEndpoint[], parsedSwagger: ParsedSwagger, seedData?: any[] | null): string {
    const controllerName = this.toPascalCase(controller);
    
    return `// Generated Database operations for ${controllerName}
import { 
  dbManager, 
  DbRecord, 
  createDbRecord, 
  updateDbRecord, 
  queryByFilter, 
  sortRecords, 
  paginateRecords 
} from './db-setup';

export class ${controller}Database {
  private readonly storeName = '${controller}';

  async init(): Promise<void> {
    await dbManager.init();
  }

  async findAll(params?: any): Promise<DbRecord[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let records = request.result as DbRecord[];
        
        // Apply filtering
        if (params) {
          if (params.filter) {
            records = queryByFilter(records, params.filter);
          }
          
          // Apply sorting
          if (params.sortBy) {
            records = sortRecords(records, params.sortBy, params.sortOrder);
          }
          
          // Apply pagination
          if (params.page || params.pageSize) {
            const paginated = paginateRecords(records, params.page, params.pageSize);
            resolve(paginated.data);
            return;
          }
        }
        
        resolve(records);
      };

      request.onerror = () => {
        reject(new Error(\`Failed to fetch ${controller} records: \${request.error}\`));
      };
    });
  }

  async findById(id: string): Promise<DbRecord | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as DbRecord | undefined;
        if (!record) {
          const error = new Error(\`${controllerName} with id '\${id}' not found\`);
          (error as any).status = 404;
          reject(error);
          return;
        }
        resolve(record);
      };

      request.onerror = () => {
        reject(new Error(\`Failed to fetch ${controller} by id: \${request.error}\`));
      };
    });
  }

  async create(data: any): Promise<DbRecord> {
    await this.init();
    
    const record = createDbRecord(data);
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(record);

      request.onsuccess = () => {
        resolve(record);
      };

      request.onerror = () => {
        reject(new Error(\`Failed to create ${controller} record: \${request.error}\`));
      };
    });
  }

  async update(id: string, updates: any): Promise<DbRecord> {
    await this.init();
    
    // First, fetch the existing record
    const existingRecord = await this.findById(id);
    
    if (!existingRecord) {
      const error = new Error(\`${controllerName} with id '\${id}' not found\`);
      (error as any).status = 404;
      return Promise.reject(error);
    }
    
    const updatedRecord = updateDbRecord(existingRecord, updates);
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updatedRecord);

      request.onsuccess = () => {
        resolve(updatedRecord);
      };

      request.onerror = () => {
        reject(new Error(\`Failed to update ${controller} record: \${request.error}\`));
      };
    });
  }

  async delete(id: string): Promise<void> {
    await this.init();
    
    // First, check if record exists
    await this.findById(id);
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(\`Failed to delete ${controller} record: \${request.error}\`));
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(\`Failed to clear ${controller} records: \${request.error}\`));
      };
    });
  }

  async getStats(): Promise<{ totalRecords: number; lastUpdated: Date }> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const totalRecords = countRequest.result;
        
        // Get the most recent record to determine last updated
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result as DbRecord[];
          const lastUpdated = records.length > 0 
            ? new Date(Math.max(...records.map(r => r.updatedAt.getTime())))
            : new Date();
          
          resolve({ totalRecords, lastUpdated });
        };
        
        getAllRequest.onerror = () => {
          reject(new Error(\`Failed to get ${controller} stats: \${getAllRequest.error}\`));
        };
      };

      countRequest.onerror = () => {
        reject(new Error(\`Failed to count ${controller} records: \${countRequest.error}\`));
      };
    });
  }

  async exportAll(): Promise<DbRecord[]> {
    return this.findAll();
  }

  async importAll(data: DbRecord[]): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Clear existing data first
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Import new data
        const promises = data.map(record => {
          return new Promise<void>((res, rej) => {
            const addRequest = store.add(record);
            addRequest.onsuccess = () => res();
            addRequest.onerror = () => rej(addRequest.error);
          });
        });
        
        Promise.all(promises).then(() => resolve()).catch(reject);
      };
      
      clearRequest.onerror = () => {
        reject(new Error(\`Failed to clear ${controller} records for import: \${clearRequest.error}\`));
      };
    });
  }

  /**
   * Seed the database with initial data
   */
  async seedData(): Promise<void> {
    ${seedData && seedData.length > 0 ? `
    const seedRecords = ${JSON.stringify(seedData, null, 4)};
    
    await this.init();
    
    // Check if data already exists
    const existingRecords = await this.findAll();
    if (existingRecords.length > 0) {
      console.log(\`${controllerName} database already contains data, skipping seed\`);
      return;
    }
    
    // Convert seed data to database records
    const dbRecords = seedRecords.map(item => createDbRecord(item));
    
    // Import the seed data
    await this.importAll(dbRecords);
    
    console.log(\`Seeded ${controllerName} database with \${dbRecords.length} records\`);
    ` : `
    console.log(\`No seed data provided for ${controllerName}\`);
    `}
  }
}
`;
  }

  private getUniqueControllers(parsedSwagger: ParsedSwagger): string[] {
    const controllers = new Set<string>();
    
    parsedSwagger.endpoints.forEach(endpoint => {
      const tag = endpoint.tags?.[0] || 'default';
      controllers.add(tag.toLowerCase());
    });
    
    return Array.from(controllers);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
  }
}