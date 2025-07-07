import * as fs from 'fs-extra';
import * as path from 'path';
import { ParsedSwagger, SwaggerEndpoint, Config } from '../types/cli-types';

export class ApiGenerator {
  constructor(private config: Config) {}

  async generate(parsedSwagger: ParsedSwagger, outputDir: string): Promise<void> {
    const controllerGroups = this.groupEndpointsByController(parsedSwagger.endpoints);
    
    for (const [controller, endpoints] of Object.entries(controllerGroups)) {
      const apiContent = this.generateApiFile(controller, endpoints, parsedSwagger);
      await fs.writeFile(
        path.join(outputDir, `${controller}-api.ts`),
        apiContent
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

  private generateApiFile(controller: string, endpoints: SwaggerEndpoint[], parsedSwagger: ParsedSwagger): string {
    const controllerName = this.toPascalCase(controller);
    
    let output = `// Generated API functions for ${controllerName}
import { ApiResponse, ApiError } from '../types';
import { ${controller}Database } from '../db/${controller}-db';
import { defaultConfig } from '../config/api-config';

/**
 * ${controllerName} API Client
 * Generated from Swagger specification
 */
export class ${controllerName}Api {
  private db: ${controller}Database;

  constructor() {
    this.db = new ${controller}Database();
  }

  /**
   * Initialize the database and seed data if available
   */
  async init(): Promise<void> {
    await this.db.init();
    await this.db.seedData();
  }

`;

    // Generate API functions
    endpoints.forEach(endpoint => {
      output += this.generateApiFunction(endpoint);
      output += '\n';
    });

    // Generate convenience functions
    output += this.generateConvenienceFunctions(controller, endpoints);

    output += '}\n\n';

    // Generate instance and export functions
    output += `// Create singleton instance
const ${controller}Api = new ${controllerName}Api();

// Export convenience functions
`;

    endpoints.forEach(endpoint => {
      const functionName = this.generateFunctionName(endpoint);
      output += `export const ${functionName} = ${controller}Api.${functionName}.bind(${controller}Api);\n`;
    });

    output += `\nexport { ${controller}Api };\n`;
    output += `export default ${controller}Api;\n`;

    return output;
  }

  private generateApiFunction(endpoint: SwaggerEndpoint): string {
    const functionName = this.generateFunctionName(endpoint);
    const operationName = this.toPascalCase(endpoint.operationId);
    
    // Generate parameter types
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    const hasRequestBody = endpoint.requestBody && endpoint.method !== 'GET';
    
    let parameterList = '';
    let parameterTypes = '';
    
    // Add path parameters
    pathParams.forEach(param => {
      const paramType = this.mapSchemaToTypeScript(param.schema);
      parameterList += `${param.name}: ${paramType}, `;
      parameterTypes += `    ${param.name}: ${paramType};\n`;
    });
    
    // Add query parameters
    if (queryParams.length > 0) {
      parameterList += 'params?: { ';
      queryParams.forEach(param => {
        const paramType = this.mapSchemaToTypeScript(param.schema);
        const optional = param.required ? '' : '?';
        parameterList += `${param.name}${optional}: ${paramType}; `;
      });
      parameterList += ' }, ';
    }
    
    // Add request body
    if (hasRequestBody) {
      parameterList += 'body: any, ';
    }
    
    // Remove trailing comma and space
    parameterList = parameterList.replace(/, $/, '');
    
    const returnType = `Promise<ApiResponse<any>>`;
    
    const output = `  /**
   * ${endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`}
   * @method ${endpoint.method}
   * @path ${endpoint.path}
   */
  async ${functionName}(${parameterList}): ${returnType} {
    try {
      // Simulate network delay
      if (defaultConfig.responseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, defaultConfig.responseDelay));
      }

      // Log request if enabled
      if (defaultConfig.enableLogging) {
        console.log(\`[${endpoint.method}] ${endpoint.path}\`, {
          ${[
            ...pathParams.map(p => p.name),
            ...(queryParams.length > 0 ? ['params'] : []),
            ...(hasRequestBody ? ['body'] : [])
          ].join(', ')}
        });
      }

      // Execute database operation
      const result = await this.db.${this.generateDbFunctionName(endpoint)}(${this.generateDbFunctionParams(endpoint)});

      // Return successful response
      return {
        data: result,
        status: ${this.getSuccessStatusCode(endpoint)},
        statusText: '${this.getSuccessStatusText(endpoint)}',
        headers: {
          'Content-Type': 'application/json',
          'X-Generated-By': 'swagger-to-localdb'
        }
      };
    } catch (error) {
      const apiError: ApiError = {
        message: (error as Error).message,
        status: ${this.getErrorStatusCode(endpoint)},
        details: error
      };
      
      if (defaultConfig.enableLogging) {
        console.error(\`[${endpoint.method}] ${endpoint.path} - Error:\`, apiError);
      }
      
      throw apiError;
    }
  }
`;

    return output;
  }

  private generateConvenienceFunctions(controller: string, endpoints: SwaggerEndpoint[]): string {
    const output = `  /**
   * Clear all data for ${controller}
   */
  async clearAllData(): Promise<void> {
    await this.db.clearAll();
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ totalRecords: number; lastUpdated: Date }> {
    return await this.db.getStats();
  }

  /**
   * Export all data
   */
  async exportData(): Promise<any[]> {
    return await this.db.exportAll();
  }

  /**
   * Import data
   */
  async importData(data: any[]): Promise<void> {
    await this.db.importAll(data);
  }
`;

    return output;
  }

  private generateFunctionName(endpoint: SwaggerEndpoint): string {
    if (endpoint.operationId) {
      return this.toCamelCase(endpoint.operationId);
    }
    
    // Generate function name from method and path
    const method = endpoint.method.toLowerCase();
    const pathParts = endpoint.path.split('/').filter(part => part && !part.startsWith('{'));
    const resourceName = pathParts[pathParts.length - 1] || 'resource';
    
    return `${method}${this.toPascalCase(resourceName)}`;
  }

  private generateDbFunctionName(endpoint: SwaggerEndpoint): string {
    const method = endpoint.method.toLowerCase();
    
    switch (method) {
      case 'get':
        return endpoint.path.includes('{') ? 'findById' : 'findAll';
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      default:
        return 'query';
    }
  }

  private generateDbFunctionParams(endpoint: SwaggerEndpoint): string {
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    const hasRequestBody = endpoint.requestBody && endpoint.method !== 'GET';
    
    let params = '';
    
    // Add path parameters
    pathParams.forEach(param => {
      params += `${param.name}, `;
    });
    
    // Add query parameters
    if (queryParams.length > 0) {
      params += 'params, ';
    }
    
    // Add request body
    if (hasRequestBody) {
      params += 'body, ';
    }
    
    // Remove trailing comma and space
    return params.replace(/, $/, '');
  }

  private getSuccessStatusCode(endpoint: SwaggerEndpoint): number {
    const successResponse = endpoint.responses.find(r => r.statusCode.startsWith('2'));
    if (successResponse) {
      return parseInt(successResponse.statusCode, 10);
    }
    
    // Default based on method
    switch (endpoint.method.toLowerCase()) {
      case 'post':
        return 201;
      case 'delete':
        return 204;
      default:
        return 200;
    }
  }

  private getSuccessStatusText(endpoint: SwaggerEndpoint): string {
    const statusCode = this.getSuccessStatusCode(endpoint);
    switch (statusCode) {
      case 200:
        return 'OK';
      case 201:
        return 'Created';
      case 204:
        return 'No Content';
      default:
        return 'Success';
    }
  }

  private getErrorStatusCode(endpoint: SwaggerEndpoint): number {
    const errorResponse = endpoint.responses.find(r => r.statusCode.startsWith('4'));
    return errorResponse ? parseInt(errorResponse.statusCode, 10) : 400;
  }

  private mapSchemaToTypeScript(schema: any): string {
    if (!schema) return 'any';
    
    switch (schema.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'string':
        return 'string';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'any[]';
      case 'object':
        return 'any';
      default:
        return 'any';
    }
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
  }

  private toCamelCase(str: string): string {
    const pascalCase = this.toPascalCase(str);
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  }
}