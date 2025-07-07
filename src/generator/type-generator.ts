import * as fs from 'fs-extra';
import * as path from 'path';
import { ParsedSwagger, Schema, Config } from '../types/cli-types';

export class TypeGenerator {
  constructor(private config: Config) {}

  async generate(parsedSwagger: ParsedSwagger, outputDir: string): Promise<void> {
    const typeDefinitions = this.generateTypeDefinitions(parsedSwagger);
    
    await fs.writeFile(
      path.join(outputDir, 'index.types.ts'),
      typeDefinitions
    );
  }

  private generateTypeDefinitions(parsedSwagger: ParsedSwagger): string {
    let output = `// Generated TypeScript interfaces from Swagger specification
// API: ${parsedSwagger.info.title} v${parsedSwagger.info.version}
${parsedSwagger.info.description ? `// ${parsedSwagger.info.description}` : ''}

// Common types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

`;

    // Generate interfaces from schemas
    Object.entries(parsedSwagger.schemas).forEach(([name, schema]) => {
      output += this.generateInterface(name, schema);
      output += '\n';
    });

    // Generate endpoint-specific types
    output += this.generateEndpointTypes(parsedSwagger);

    return output;
  }

  private generateInterface(name: string, schema: Schema): string {
    const interfaceName = this.toPascalCase(name);
    
    if (schema.$ref) {
      // Handle references
      const refName = schema.$ref.split('/').pop() || name;
      return `export type ${interfaceName} = ${this.toPascalCase(refName)};`;
    }

    if (schema.type === 'array' && schema.items) {
      const itemType = this.generateTypeFromSchema(schema.items);
      return `export type ${interfaceName} = ${itemType}[];`;
    }

    if (schema.enum) {
      const enumValues = schema.enum.map(value => 
        typeof value === 'string' ? `'${value}'` : value
      ).join(' | ');
      return `export type ${interfaceName} = ${enumValues};`;
    }

    if (schema.type === 'object' || schema.properties) {
      let interfaceBody = '';
      
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]) => {
          const isRequired = schema.required?.includes(propName) || false;
          const propType = this.generateTypeFromSchema(propSchema);
          const optional = isRequired ? '' : '?';
          const comment = propSchema.description ? `  /** ${propSchema.description} */\n` : '';
          
          interfaceBody += `${comment}  ${propName}${optional}: ${propType};\n`;
        });
      }

      return `export interface ${interfaceName} {
${interfaceBody}}`;
    }

    // Fallback for primitive types
    const primitiveType = this.mapSwaggerTypeToTypeScript(schema.type);
    return `export type ${interfaceName} = ${primitiveType};`;
  }

  private generateTypeFromSchema(schema: Schema): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop() || 'unknown';
      return this.toPascalCase(refName);
    }

    if (schema.type === 'array' && schema.items) {
      const itemType = this.generateTypeFromSchema(schema.items);
      return `${itemType}[]`;
    }

    if (schema.enum) {
      const enumValues = schema.enum.map(value => 
        typeof value === 'string' ? `'${value}'` : value
      ).join(' | ');
      return enumValues;
    }

    if (schema.type === 'object' && schema.properties) {
      // Generate inline object type
      const props = Object.entries(schema.properties).map(([propName, propSchema]) => {
        const isRequired = schema.required?.includes(propName) || false;
        const propType = this.generateTypeFromSchema(propSchema);
        const optional = isRequired ? '' : '?';
        return `${propName}${optional}: ${propType}`;
      }).join('; ');
      
      return `{ ${props} }`;
    }

    return this.mapSwaggerTypeToTypeScript(schema.type);
  }

  private generateEndpointTypes(parsedSwagger: ParsedSwagger): string {
    let output = '// Endpoint-specific types\n\n';

    parsedSwagger.endpoints.forEach(endpoint => {
      const operationName = this.toPascalCase(endpoint.operationId);
      
      // Generate request type
      if (endpoint.requestBody) {
        output += `export interface ${operationName}Request {\n`;
        
        // Add path parameters
        endpoint.parameters
          .filter(param => param.in === 'path')
          .forEach(param => {
            const paramType = this.generateTypeFromSchema(param.schema);
            output += `  ${param.name}: ${paramType};\n`;
          });
        
        // Add query parameters
        const queryParams = endpoint.parameters.filter(param => param.in === 'query');
        if (queryParams.length > 0) {
          output += `  params?: {\n`;
          queryParams.forEach(param => {
            const paramType = this.generateTypeFromSchema(param.schema);
            const optional = param.required ? '' : '?';
            output += `    ${param.name}${optional}: ${paramType};\n`;
          });
          output += `  };\n`;
        }
        
        // Add body type
        Object.entries(endpoint.requestBody.content).forEach(([contentType, mediaType]) => {
          if (contentType === 'application/json') {
            const bodyType = this.generateTypeFromSchema(mediaType.schema);
            output += `  body: ${bodyType};\n`;
          }
        });
        
        output += `}\n\n`;
      }

      // Generate response type
      const successResponse = endpoint.responses.find(r => r.statusCode.startsWith('2'));
      if (successResponse && successResponse.content) {
        Object.entries(successResponse.content).forEach(([contentType, mediaType]) => {
          if (contentType === 'application/json') {
            const responseType = this.generateTypeFromSchema(mediaType.schema);
            output += `export type ${operationName}Response = ApiResponse<${responseType}>;\n`;
          }
        });
      } else {
        output += `export type ${operationName}Response = ApiResponse<void>;\n`;
      }
      
      output += '\n';
    });

    return output;
  }

  private mapSwaggerTypeToTypeScript(swaggerType: string): string {
    switch (swaggerType) {
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
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
  }
}