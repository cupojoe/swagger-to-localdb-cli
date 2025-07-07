# Publishing Guide

This document provides instructions for publishing the `swagger-to-localdb-cli` package to npm.

## Prerequisites

1. **npm Account**: Ensure you have an npm account and are logged in
   ```bash
   npm login
   ```

2. **Package Name**: Verify the package name `swagger-to-localdb-cli` is available on npm
   ```bash
   npm view swagger-to-localdb-cli
   ```

## Pre-Publication Checklist

### 1. Update Package Information
- [ ] Update `package.json` with correct author information
- [ ] Set proper repository URLs in `package.json`
- [ ] Verify license is correct
- [ ] Update version number if needed

### 2. Quality Checks
- [ ] Run tests: `npm test`
- [ ] Run linting: `npm run lint`
- [ ] Build project: `npm run build`
- [ ] Test CLI functionality: `node dist/cli/index.js generate examples/petstore.json --output ./test`

### 3. Documentation
- [ ] Ensure README.md is complete and accurate
- [ ] Update CHANGELOG.md with release notes
- [ ] Verify all examples work correctly

## Publishing Steps

### 1. Final Preparation
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build

# Verify package contents
npm pack --dry-run

# Test the CLI one more time
node dist/cli/index.js generate examples/petstore.json --output ./final-test
```

### 2. Version Management
```bash
# For patch version (1.0.0 -> 1.0.1)
npm version patch

# For minor version (1.0.0 -> 1.1.0)
npm version minor

# For major version (1.0.0 -> 2.0.0)
npm version major
```

### 3. Publish to npm
```bash
# Publish to npm registry
npm publish

# Or for scoped packages
npm publish --access public
```

### 4. Post-Publication
```bash
# Tag the release in git
git push origin main
git push --tags

# Verify publication
npm view swagger-to-localdb-cli
```

## Installation Testing

After publishing, test the installation:

```bash
# Install globally
npm install -g swagger-to-localdb-cli

# Test CLI
swagger-to-localdb generate examples/petstore.json --output ./install-test

# Or test with npx
npx swagger-to-localdb-cli generate examples/petstore.json --output ./npx-test
```

## Package Information

- **Package Name**: `swagger-to-localdb-cli`
- **Current Version**: `1.0.0`
- **License**: MIT
- **Main Entry**: `dist/cli/index.js`
- **Binary**: `swagger-to-localdb`

## Files Included in Package

The following files are included in the published package:
- `dist/` - Compiled TypeScript code
- `README.md` - Documentation
- `LICENSE` - MIT license
- `package.json` - Package metadata
- `CHANGELOG.md` - Release notes

## Files Excluded from Package

The following files are excluded via `.npmignore`:
- `src/` - TypeScript source files
- `test-output/` - Generated test files
- Development configuration files
- Documentation that's not essential for end users

## Updating the Package

For future updates:

1. Make changes to source code
2. Update version in `package.json` or use `npm version`
3. Update `CHANGELOG.md`
4. Run quality checks
5. Publish with `npm publish`

## Troubleshooting

### Common Issues

1. **Package name already exists**
   - Choose a different name or add scope: `@yourname/swagger-to-localdb-cli`

2. **Authentication errors**
   - Run `npm login` and verify credentials
   - Check npm registry: `npm config get registry`

3. **Permission errors**
   - Ensure you have publish rights to the package
   - For scoped packages, use `--access public`

### Verification Commands

```bash
# Check package info
npm view swagger-to-localdb-cli

# Check tarball contents
npm pack --dry-run

# Verify CLI works
npx swagger-to-localdb-cli --help
```

## Support

For issues with the package or publishing process:
1. Check npm documentation: https://docs.npmjs.com/
2. Review package.json configuration
3. Test locally before publishing
4. Use semantic versioning for updates