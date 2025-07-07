describe('CLI Index', () => {
  it('should be executable as a Node.js script', () => {
    const fs = require('fs');
    const path = require('path');

    const cliFilePath = path.join(__dirname, '../../src/cli/index.ts');
    const cliContent = fs.readFileSync(cliFilePath, 'utf8');

    expect(cliContent).toMatch(/^#!/); // Should start with shebang
    expect(cliContent).toContain('#!/usr/bin/env node');
  });

  it('should contain required CLI setup', () => {
    const fs = require('fs');
    const path = require('path');

    const cliFilePath = path.join(__dirname, '../../src/cli/index.ts');
    const cliContent = fs.readFileSync(cliFilePath, 'utf8');

    // Verify it imports required modules
    expect(cliContent).toContain("import { Command } from 'commander'");
    expect(cliContent).toContain("import chalk from 'chalk'");
    expect(cliContent).toContain("import { generateCommand } from './commands'");

    // Verify it sets up the program
    expect(cliContent).toContain('new Command()');
    expect(cliContent).toContain('swagger-to-localdb');
    expect(cliContent).toContain('generate');

    // Verify it has error handlers
    expect(cliContent).toContain("process.on('unhandledRejection'");
    expect(cliContent).toContain("process.on('uncaughtException'");
  });

  it('should have proper command structure', () => {
    const fs = require('fs');
    const path = require('path');

    const cliFilePath = path.join(__dirname, '../../src/cli/index.ts');
    const cliContent = fs.readFileSync(cliFilePath, 'utf8');

    // Verify CLI options
    expect(cliContent).toContain('--output');
    expect(cliContent).toContain('--db-name');
    expect(cliContent).toContain('--delay');
    expect(cliContent).toContain('--config');
    expect(cliContent).toContain('--seed');
    expect(cliContent).toContain('--verbose');
    expect(cliContent).toContain('--no-validation');

    // Verify it calls parse
    expect(cliContent).toContain('program.parse()');
  });
});