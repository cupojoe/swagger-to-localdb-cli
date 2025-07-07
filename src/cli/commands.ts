import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { SwaggerSpecParser } from '../parser/swagger-parser';
import { CodeGenerator } from '../generator/code-generator';
import { GenerateOptions, Config } from '../types/cli-types';

export async function generateCommand(
  input: string,
  options: GenerateOptions
): Promise<void> {
  const spinner = ora('Initializing...').start();
  
  try {
    // Validate input file exists
    if (!await fs.pathExists(input)) {
      spinner.fail(chalk.red(`Input file not found: ${input}`));
      process.exit(1);
    }

    // Load configuration
    const config = await loadConfig(options);
    
    // Load seed data if provided
    const seedData = await loadSeedData(options);
    
    if (options.verbose) {
      console.log(chalk.blue('Configuration:'), JSON.stringify(config, null, 2));
      if (seedData) {
        console.log(chalk.blue('Seed data loaded:'), Object.keys(seedData).map(key =>
          `${key}: ${Array.isArray(seedData[key]) ? seedData[key].length : 'N/A'} items`
        ));
      }
    }

    // Parse Swagger specification
    spinner.text = 'Parsing Swagger specification...';
    const parser = new SwaggerSpecParser();
    const parsedSpec = await parser.parse(input);

    if (options.verbose) {
      console.log(chalk.blue('Parsed endpoints:'), parsedSpec.endpoints.length);
      console.log(chalk.blue('Parsed schemas:'), Object.keys(parsedSpec.schemas).length);
    }

    // Generate code
    spinner.text = 'Generating TypeScript files...';
    const generator = new CodeGenerator(config);
    await generator.generate(parsedSpec, options.output, seedData);

    spinner.succeed(chalk.green('Successfully generated TypeScript API files!'));
    
    console.log(chalk.yellow('\nGenerated files:'));
    console.log(chalk.gray(`  📁 ${options.output}/`));
    console.log(chalk.gray(`    ├── types/           # TypeScript interfaces`));
    console.log(chalk.gray(`    ├── api/             # API functions`));
    console.log(chalk.gray(`    ├── db/              # IndexedDB operations`));
    console.log(chalk.gray(`    └── config/          # Configuration`));
    
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.gray('1. Import the generated API functions in your React app'));
    console.log(chalk.gray('2. Use them like regular API calls - they will use IndexedDB'));
    console.log(chalk.gray('3. Your UI development can proceed while APIs are being built'));

  } catch (error) {
    spinner.fail(chalk.red('Generation failed'));
    
    if (options.verbose) {
      console.error(chalk.red('Error details:'), error);
    } else {
      console.error(chalk.red('Error:'), (error as Error).message);
      console.log(chalk.gray('Use --verbose flag for more details'));
    }
    
    process.exit(1);
  }
}

async function loadConfig(options: GenerateOptions): Promise<Config> {
  const defaultConfig: Config = {
    dbName: options.dbName || 'mockApiDB',
    responseDelay: parseInt(options.delay || '200', 10),
    enableLogging: options.verbose || false,
    enableValidation: options.validation !== false,
    outputFormat: 'typescript',
    errorRate: 0,
    generateTests: false
  };

  if (options.config) {
    try {
      const configPath = path.resolve(options.config);
      const configFile = await fs.readJson(configPath);
      return { ...defaultConfig, ...configFile };
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not load config file ${options.config}, using defaults`));
    }
  }

  return defaultConfig;
}

async function loadSeedData(options: GenerateOptions): Promise<Record<string, any[]> | null> {
  if (!options.seed) {
    return null;
  }

  try {
    const seedPath = path.resolve(options.seed);
    
    if (!await fs.pathExists(seedPath)) {
      console.warn(chalk.yellow(`Warning: Seed file not found: ${options.seed}`));
      return null;
    }

    const seedContent = await fs.readJson(seedPath);
    
    // Validate that seed data is an object with arrays
    if (typeof seedContent !== 'object' || seedContent === null) {
      throw new Error('Seed data must be a JSON object');
    }

    // Ensure all values are arrays
    const validatedSeedData: Record<string, any[]> = {};
    for (const [key, value] of Object.entries(seedContent)) {
      if (Array.isArray(value)) {
        validatedSeedData[key] = value;
      } else {
        console.warn(chalk.yellow(`Warning: Seed data for '${key}' is not an array, skipping`));
      }
    }

    return validatedSeedData;
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not load seed file ${options.seed}: ${(error as Error).message}`));
    return null;
  }
}