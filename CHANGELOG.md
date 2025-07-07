# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-07

### Added
- Initial release of swagger-to-localdb-cli
- CLI tool for generating TypeScript API files from Swagger/OpenAPI specifications
- IndexedDB mock implementation for local development
- Support for OpenAPI 3.0 and Swagger 2.0 specifications
- Complete CRUD operations mapped to HTTP methods
- TypeScript interface generation from Swagger schemas
- Query parameter support with filtering, sorting, and pagination
- Schema validation based on Swagger definitions
- Configurable response delays and error simulation
- Comprehensive error handling with proper HTTP status codes
- Organized code generation by controller/tag
- Example Pet Store API specification
- Complete documentation and usage examples

### Features
- **HTTP Method Mapping**: GET → query, POST → create, PUT/PATCH → update, DELETE → remove
- **IndexedDB Integration**: Complete database setup with transactions and indexes
- **Type Safety**: Fully typed TypeScript code generation
- **Realistic API Behavior**: Response delays, error responses, proper status codes
- **Developer Experience**: Logging, verbose output, configuration options
- **Easy Integration**: Generated APIs work like regular API calls

### CLI Options
- Input file path (JSON or YAML Swagger specifications)
- Output directory configuration
- Custom database naming
- Response delay configuration
- Verbose logging
- Configuration file support
- Schema validation toggle

### Generated Structure
- `/types` - TypeScript interfaces and type definitions
- `/api` - API functions organized by controller
- `/db` - IndexedDB operations and database setup
- `/config` - Configuration files and settings

### Dependencies
- commander: CLI framework
- swagger-parser: Swagger/OpenAPI parsing
- handlebars: Template engine
- fs-extra: Enhanced file operations
- chalk: Terminal colors
- ora: Loading spinners

### Development
- TypeScript compilation
- ESLint configuration
- Prettier code formatting
- Comprehensive build system
- Example usage implementations