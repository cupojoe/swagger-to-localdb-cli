export interface GenerateOptions {
  output: string;
  dbName?: string;
  delay?: string;
  config?: string;
  seed?: string;
  verbose?: boolean;
  validation?: boolean;
}

export interface Config {
  dbName: string;
  responseDelay: number;
  enableLogging: boolean;
  enableValidation: boolean;
  outputFormat: 'typescript';
  errorRate: number;
  generateTests: boolean;
}

export interface SwaggerEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
  tags?: string[];
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: Schema;
  description?: string;
}

export interface RequestBody {
  required: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema: Schema;
}

export interface Response {
  statusCode: string;
  description: string;
  content?: Record<string, MediaType>;
}

export interface Schema {
  type: string;
  format?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: any[];
  example?: any;
  description?: string;
  $ref?: string;
}

export interface ParsedSwagger {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  endpoints: SwaggerEndpoint[];
  schemas: Record<string, Schema>;
  components?: {
    schemas?: Record<string, Schema>;
  };
}