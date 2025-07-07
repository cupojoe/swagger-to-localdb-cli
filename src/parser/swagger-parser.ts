import { ParsedSwagger, SwaggerEndpoint, Parameter, RequestBody, Response, Schema } from '../types/cli-types';

const SwaggerParser = require('swagger-parser');

export class SwaggerSpecParser {
  async parse(filePath: string): Promise<ParsedSwagger> {
    try {
      const api = await SwaggerParser.validate(filePath) as any;
      
      const parsedSwagger: ParsedSwagger = {
        info: {
          title: api.info.title,
          version: api.info.version,
          description: api.info.description
        },
        servers: api.servers || [],
        endpoints: [],
        schemas: {},
        components: api.components
      };

      // Parse paths to extract endpoints
      if (api.paths) {
        for (const [path, pathItem] of Object.entries(api.paths)) {
          if (pathItem) {
            const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
            
            for (const method of methods) {
              const operation = (pathItem as any)[method];
              if (operation) {
                const endpoint = this.parseOperation(path, method, operation);
                parsedSwagger.endpoints.push(endpoint);
              }
            }
          }
        }
      }

      // Parse schemas
      if (api.components?.schemas) {
        for (const [name, schema] of Object.entries(api.components.schemas)) {
          parsedSwagger.schemas[name] = this.parseSchema(schema);
        }
      }

      return parsedSwagger;
    } catch (error) {
      throw new Error(`Failed to parse Swagger specification: ${(error as Error).message}`);
    }
  }

  private parseOperation(path: string, method: string, operation: any): SwaggerEndpoint {
    const endpoint: SwaggerEndpoint = {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
      summary: operation.summary,
      description: operation.description,
      parameters: [],
      responses: [],
      tags: operation.tags
    };

    // Parse parameters
    if (operation.parameters) {
      endpoint.parameters = operation.parameters.map((param: any) => this.parseParameter(param));
    }

    // Parse request body
    if (operation.requestBody) {
      endpoint.requestBody = this.parseRequestBody(operation.requestBody);
    }

    // Parse responses
    if (operation.responses) {
      endpoint.responses = Object.entries(operation.responses).map(([statusCode, response]) =>
        this.parseResponse(statusCode, response as any)
      );
    }

    return endpoint;
  }

  private parseParameter(param: any): Parameter {
    return {
      name: param.name,
      in: param.in,
      required: param.required || false,
      schema: this.parseSchema(param.schema),
      description: param.description
    };
  }

  private parseRequestBody(requestBody: any): RequestBody {
    const content: Record<string, any> = {};
    
    if (requestBody.content) {
      for (const [mediaType, mediaTypeObj] of Object.entries(requestBody.content)) {
        content[mediaType] = {
          schema: this.parseSchema((mediaTypeObj as any).schema)
        };
      }
    }

    return {
      required: requestBody.required || false,
      content
    };
  }

  private parseResponse(statusCode: string, response: any): Response {
    const content: Record<string, any> = {};
    
    if (response.content) {
      for (const [mediaType, mediaTypeObj] of Object.entries(response.content)) {
        content[mediaType] = {
          schema: this.parseSchema((mediaTypeObj as any).schema)
        };
      }
    }

    return {
      statusCode,
      description: response.description || '',
      content: Object.keys(content).length > 0 ? content : undefined
    };
  }

  private parseSchema(schema: any): Schema {
    if (!schema) {
      return { type: 'any' };
    }

    const parsedSchema: Schema = {
      type: schema.type || 'object',
      format: schema.format,
      description: schema.description,
      example: schema.example,
      $ref: schema.$ref
    };

    if (schema.properties) {
      parsedSchema.properties = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        parsedSchema.properties[propName] = this.parseSchema(propSchema);
      }
    }

    if (schema.items) {
      parsedSchema.items = this.parseSchema(schema.items);
    }

    if (schema.required) {
      parsedSchema.required = schema.required;
    }

    if (schema.enum) {
      parsedSchema.enum = schema.enum;
    }

    return parsedSchema;
  }
}