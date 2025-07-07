# Swagger to Local DB CLI

A CLI tool that generates TypeScript API files with IndexedDB mock implementations from Swagger/OpenAPI specifications. This tool enables frontend development to proceed while backend APIs are being developed by providing realistic mock implementations that use the browser's IndexedDB for data persistence.

## Features

- 🚀 **Generate TypeScript API files** from Swagger/OpenAPI specifications
- 🗄️ **IndexedDB integration** for persistent local data storage
- 📝 **Fully typed** with TypeScript interfaces and proper error handling
- 🎯 **Realistic API behavior** with configurable response delays and error simulation
- 🔄 **Complete CRUD operations** mapped to HTTP methods
- 📊 **Query parameters support** with filtering, sorting, and pagination
- ✅ **Schema validation** based on Swagger definitions
- 🏷️ **Organized by tags** for clean code structure

## Installation

```bash
npm install -g swagger-to-localdb-cli
```

Or use directly with npx:

```bash
npx swagger-to-localdb-cli generate ./swagger.json --output ./src/api
```

## Usage

### Basic Usage

```bash
# Generate API files from Swagger specification
swagger-to-localdb generate ./swagger.json --output ./generated-api

# Generate with custom database name
swagger-to-localdb generate ./swagger.json --output ./api --db-name "myAppDB"

# Generate with custom response delay
swagger-to-localdb generate ./swagger.json --output ./api --delay 500

# Generate with seed data for initial database population
swagger-to-localdb generate ./swagger.json --output ./api --seed ./seed-data.json

# Verbose output
swagger-to-localdb generate ./swagger.json --output ./api --verbose
```

### Command Options

- `<input>` - Path to Swagger/OpenAPI specification file (JSON or YAML)
- `-o, --output <path>` - Output directory for generated files (default: `./generated-api`)
- `-d, --db-name <name>` - IndexedDB database name (default: `mockApiDB`)
- `--delay <ms>` - Response delay simulation in milliseconds (default: `200`)
- `--config <path>` - Path to configuration file
- `--seed <path>` - Path to JSON file with seed data for initial database population
- `--verbose` - Enable verbose logging
- `--no-validation` - Disable schema validation in generated code

### Configuration File

Create a `config.json` file to customize generation:

```json
{
  "dbName": "myCustomDB",
  "responseDelay": 300,
  "enableLogging": true,
  "errorRate": 0.1,
  "enableValidation": true,
  "generateTests": false
}
```

## Generated File Structure

```
generated-api/
├── types/
│   └── index.types.ts    # TypeScript interfaces
├── api/
│   ├── index.ts          # API exports
│   └── pets-api.ts       # API functions by tag
├── db/
│   ├── index.ts          # Database exports
│   ├── db-setup.ts       # IndexedDB setup
│   └── pets-db.ts        # Database operations
├── config/
│   └── api-config.ts     # Configuration
└── index.ts              # Main exports
```

## Example Usage in React

After generating the API files, you can use them in your React application:

```typescript
import React, { useState, useEffect } from 'react';
import { listPets, createPet, getPetById, updatePet, deletePet } from './generated-api/api/pets-api';
import { Pet, NewPet } from './generated-api/types';

const PetStore: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const response = await listPets();
      setPets(response.data);
    } catch (error) {
      console.error('Failed to load pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePet = async (petData: NewPet) => {
    try {
      const response = await createPet(petData);
      setPets([...pets, response.data]);
      console.log('Pet created:', response.data);
    } catch (error) {
      console.error('Failed to create pet:', error);
    }
  };

  const handleUpdatePet = async (petId: string, updates: Partial<NewPet>) => {
    try {
      const response = await updatePet(petId, updates);
      setPets(pets.map(pet => pet.id === petId ? response.data : pet));
      console.log('Pet updated:', response.data);
    } catch (error) {
      console.error('Failed to update pet:', error);
    }
  };

  const handleDeletePet = async (petId: string) => {
    try {
      await deletePet(petId);
      setPets(pets.filter(pet => pet.id !== petId));
      console.log('Pet deleted');
    } catch (error) {
      console.error('Failed to delete pet:', error);
    }
  };

  if (loading) return <div>Loading pets...</div>;

  return (
    <div>
      <h1>Pet Store</h1>
      <div>
        {pets.map(pet => (
          <div key={pet.id}>
            <h3>{pet.name}</h3>
            <p>Category: {pet.category}</p>
            <p>Status: {pet.status}</p>
            <button onClick={() => handleUpdatePet(pet.id, { status: 'sold' })}>
              Mark as Sold
            </button>
            <button onClick={() => handleDeletePet(pet.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => handleCreatePet({ name: 'New Pet', category: 'dog' })}>
        Add Pet
      </button>
    </div>
  );
};

export default PetStore;
```

## Seed Data

The CLI tool supports seeding the generated IndexedDB with initial data using a JSON file. This is perfect for having sample data available immediately when developing your frontend.

### Seed Data Format

The seed data file should be a JSON object where keys match the controller/tag names from your Swagger specification, and values are arrays of objects:

```json
{
  "pets": [
    {
      "name": "Buddy",
      "category": "dog",
      "status": "available",
      "tags": ["friendly", "energetic"],
      "photoUrls": ["https://example.com/buddy.jpg"]
    },
    {
      "name": "Whiskers",
      "category": "cat",
      "status": "available",
      "tags": ["calm", "independent"],
      "photoUrls": ["https://example.com/whiskers.jpg"]
    }
  ]
}
```

### Using Seed Data

```bash
# Generate API with seed data
swagger-to-localdb generate ./swagger.json --seed ./seed-data.json --output ./api
```

### How Seeding Works

1. **Automatic Population**: When the generated API is first initialized, it checks if the database is empty
2. **One-time Seeding**: If empty, it populates the database with the seed data
3. **Skip if Exists**: If data already exists, seeding is skipped to preserve existing data
4. **Proper IDs**: Seed data is automatically assigned proper database IDs and timestamps

The seed data is embedded directly into the generated database files, so no external dependencies are needed at runtime.

## HTTP Method Mapping

The tool maps HTTP methods to IndexedDB operations:

- **GET** `/resource` → Query all records with optional filtering/pagination
- **GET** `/resource/{id}` → Find record by ID
- **POST** `/resource` → Create new record with generated ID
- **PUT** `/resource/{id}` → Update existing record
- **PATCH** `/resource/{id}` → Partially update existing record
- **DELETE** `/resource/{id}` → Delete record

## Query Parameters

Generated API functions support query parameters for filtering and pagination:

```typescript
// List pets with filters
const response = await listPets({ 
  limit: 10, 
  category: 'dog' 
});

// The generated API automatically handles:
// - Filtering by any field
// - Sorting with sortBy and sortOrder
// - Pagination with page and pageSize
```

## Error Handling

The generated APIs include proper error handling:

```typescript
try {
  const pet = await getPetById('nonexistent-id');
} catch (error) {
  if (error.status === 404) {
    console.log('Pet not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Development

### Building the Project

```bash
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Testing with Example

```bash
# Test with the provided example
npm run build
node dist/cli/index.js generate examples/petstore.json --output ./test-output --verbose
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### 1.0.0
- Initial release
- Support for OpenAPI 3.0 and Swagger 2.0
- TypeScript API generation
- IndexedDB mock implementation
- Complete CRUD operations
- Query parameter support
- Schema validation
- Configurable response delays