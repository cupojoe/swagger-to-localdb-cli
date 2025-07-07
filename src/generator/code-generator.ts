import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { ParsedSwagger, Config } from '../types/cli-types';
import { TypeGenerator } from './type-generator';
import { ApiGenerator } from './api-generator';
import { DbGenerator } from './db-generator';

export class CodeGenerator {
  private typeGenerator: TypeGenerator;
  private apiGenerator: ApiGenerator;
  private dbGenerator: DbGenerator;

  constructor(private config: Config) {
    this.typeGenerator = new TypeGenerator(config);
    this.apiGenerator = new ApiGenerator(config);
    this.dbGenerator = new DbGenerator(config);
  }

  async generate(parsedSwagger: ParsedSwagger, outputDir: string): Promise<void> {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    // Create subdirectories
    const typesDir = path.join(outputDir, 'types');
    const apiDir = path.join(outputDir, 'api');
    const dbDir = path.join(outputDir, 'db');
    const configDir = path.join(outputDir, 'config');
    
    await fs.ensureDir(typesDir);
    await fs.ensureDir(apiDir);
    await fs.ensureDir(dbDir);
    await fs.ensureDir(configDir);

    // Generate TypeScript types
    await this.typeGenerator.generate(parsedSwagger, typesDir);

    // Generate API functions
    await this.apiGenerator.generate(parsedSwagger, apiDir);

    // Generate database layer
    await this.dbGenerator.generate(parsedSwagger, dbDir);

    // Generate configuration files
    await this.generateConfig(parsedSwagger, configDir);

    // Generate main index files
    await this.generateIndexFiles(parsedSwagger, outputDir);
  }

  private async generateConfig(parsedSwagger: ParsedSwagger, configDir: string): Promise<void> {
    const configContent = `// Generated API Configuration
export interface ApiConfig {
  dbName: string;
  responseDelay: number;
  enableLogging: boolean;
  enableValidation: boolean;
  errorRate: number;
}

export const defaultConfig: ApiConfig = {
  dbName: '${this.config.dbName}',
  responseDelay: ${this.config.responseDelay},
  enableLogging: ${this.config.enableLogging},
  enableValidation: ${this.config.enableValidation},
  errorRate: ${this.config.errorRate}
};

export const apiInfo = {
  title: '${parsedSwagger.info.title}',
  version: '${parsedSwagger.info.version}',
  description: '${parsedSwagger.info.description || ''}'
};
`;

    await fs.writeFile(path.join(configDir, 'api-config.ts'), configContent);
  }

  private async generateIndexFiles(parsedSwagger: ParsedSwagger, outputDir: string): Promise<void> {
    // Generate main index.ts
    const mainIndexContent = `// Generated API Exports
export * from './types';
export * from './api';
export * from './db';
export * from './config/api-config';
`;

    await fs.writeFile(path.join(outputDir, 'index.ts'), mainIndexContent);

    // Generate types index
    const typesIndexContent = `// Generated Type Exports
export * from './index.types';
`;

    await fs.writeFile(path.join(outputDir, 'types', 'index.ts'), typesIndexContent);

    // Generate API index
    const apiIndexContent = `// Generated API Function Exports
${this.getUniqueControllers(parsedSwagger).map(controller => 
  `export * from './${controller}-api';`
).join('\n')}
`;

    await fs.writeFile(path.join(outputDir, 'api', 'index.ts'), apiIndexContent);

    // Generate DB index
    const dbIndexContent = `// Generated Database Layer Exports
export * from './db-setup';
${this.getUniqueControllers(parsedSwagger).map(controller => 
  `export * from './${controller}-db';`
).join('\n')}
`;

    await fs.writeFile(path.join(outputDir, 'db', 'index.ts'), dbIndexContent);
  }

  private getUniqueControllers(parsedSwagger: ParsedSwagger): string[] {
    const controllers = new Set<string>();
    
    parsedSwagger.endpoints.forEach(endpoint => {
      const tag = endpoint.tags?.[0] || 'default';
      controllers.add(tag.toLowerCase());
    });
    
    return Array.from(controllers);
  }
}