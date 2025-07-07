#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { generateCommand } from './commands';

const program = new Command();

program
  .name('swagger-to-localdb')
  .description('CLI tool that generates TypeScript API files with IndexedDB mock implementations from Swagger/OpenAPI specifications')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate TypeScript API files from Swagger/OpenAPI specification')
  .argument('<input>', 'Path to Swagger/OpenAPI specification file (JSON or YAML)')
  .option('-o, --output <path>', 'Output directory for generated files', './generated-api')
  .option('-d, --db-name <name>', 'IndexedDB database name', 'mockApiDB')
  .option('--delay <ms>', 'Response delay simulation in milliseconds', '200')
  .option('--config <path>', 'Path to configuration file')
  .option('--verbose', 'Enable verbose logging', false)
  .option('--no-validation', 'Disable schema validation in generated code', false)
  .action(generateCommand);

program.parse();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});