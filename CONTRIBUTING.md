# Contributing to Ultra Scraper

Thank you for your interest in contributing to Ultra Scraper! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

---

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0 or yarn >= 1.22.0
- Git
- TypeScript knowledge
- Familiarity with web scraping concepts

### Find Something to Work On

1. **Check existing issues**: Browse [open issues](https://github.com/Brashkie/ultra-scraper/issues)
2. **Good first issues**: Look for issues labeled `good first issue`
3. **Feature requests**: Check issues labeled `enhancement`
4. **Bug reports**: Look for issues labeled `bug`

### Before You Start

1. **Check if someone is already working on it**: Comment on the issue to let others know
2. **Discuss major changes**: For significant changes, open an issue first to discuss
3. **Read the docs**: Familiarize yourself with the codebase and architecture

---

## Development Setup

### 1. Fork and Clone
```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ultra-scraper.git
cd ultra-scraper
```

### 2. Install Dependencies
```bash
npm install

# Install Playwright browsers (required for tests)
npx playwright install chromium
```

### 3. Verify Setup
```bash
# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

### 4. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

---

## Development Workflow

### Project Structure
```
ultra-scraper/
├── src/
│   ├── core/           # Core scraping functionality
│   ├── queue/          # Queue system
│   ├── concurrency/    # Concurrency management
│   ├── antibot/        # Anti-bot detection
│   ├── strategies/     # Retry, backoff strategies
│   ├── monitoring/     # Performance monitoring
│   ├── plugins/        # Built-in plugins
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── index.ts        # Main entry point
├── tests/              # Test files
├── docs/               # Documentation
├── examples/           # Example usage
└── dist/               # Compiled output (gitignored)
```

### Development Commands
```bash
# Development mode with watch
npm run dev

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix lint errors
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

### Making Changes

1. **Write code** following our [coding standards](#coding-standards)
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** to ensure nothing broke
5. **Commit changes** with clear messages

---

## Coding Standards

### TypeScript Guidelines

#### 1. Type Safety
```typescript
// ✅ Good: Explicit types
function processData(data: ScraperResponse): ProcessedData {
  return { ... };
}

// ❌ Bad: Using 'any'
function processData(data: any): any {
  return { ... };
}
```

#### 2. Interfaces vs Types
```typescript
// ✅ Use interfaces for object shapes
interface UserConfig {
  timeout: number;
  retries: number;
}

// ✅ Use types for unions and complex types
type Status = 'idle' | 'running' | 'stopped';
type Result = Success | Failure;
```

#### 3. Null Safety
```typescript
// ✅ Good: Handle null/undefined
function getTitle(page: Page | null): string | null {
  return page?.title() ?? null;
}

// ❌ Bad: Assuming non-null
function getTitle(page: Page): string {
  return page.title(); // Can throw if page is null
}
```

### Code Style

#### 1. Naming Conventions
```typescript
// Classes: PascalCase
class BrowserPool { }

// Functions/Methods: camelCase
function createScraper() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Private properties: prefix with _
class Example {
  private _internalState: number;
}

// Interfaces: PascalCase, no 'I' prefix
interface ScraperOptions { }
```

#### 2. File Organization
```typescript
// Order: imports, types, class, exports

// 1. External imports
import { EventEmitter } from 'events';
import { Page } from 'playwright';

// 2. Internal imports
import { BrowserPool } from './BrowserPool';
import { ScraperOptions } from '../types';

// 3. Type definitions
interface InternalConfig {
  // ...
}

// 4. Class definition
export class Scraper extends EventEmitter {
  // Public properties first
  public readonly config: ScraperOptions;
  
  // Private properties
  private pool: BrowserPool;
  
  // Constructor
  constructor(options: ScraperOptions) {
    // ...
  }
  
  // Public methods
  public async scrape(): Promise<void> {
    // ...
  }
  
  // Private methods
  private async initialize(): Promise<void> {
    // ...
  }
}

// 5. Factory functions
export function createScraper(options?: ScraperOptions): Scraper {
  return new Scraper(options ?? {});
}
```

#### 3. Comments and Documentation
```typescript
/**
 * Creates a new browser pool with specified configuration.
 * 
 * @param size - Number of browser instances
 * @param config - Pool configuration options
 * @returns Initialized browser pool
 * 
 * @example
 * ```typescript
 * const pool = createBrowserPool(3, {
 *   browserType: 'chromium',
 *   maxPages: 10
 * });
 * ```
 */
export function createBrowserPool(
  size: number,
  config?: BrowserPoolConfig
): BrowserPool {
  // Implementation
}

// Use inline comments for complex logic
private calculateBackoff(attempt: number): number {
  // Use exponential backoff with jitter to prevent thundering herd
  const exponential = Math.min(
    this.baseDelay * Math.pow(2, attempt),
    this.maxDelay
  );
  
  // Add 25% jitter
  const jitter = exponential * 0.25 * (Math.random() - 0.5);
  
  return Math.floor(exponential + jitter);
}
```

#### 4. Error Handling
```typescript
// ✅ Good: Specific error types
class ScraperError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}

// ✅ Good: Proper error handling
async function fetchData(url: string): Promise<Data> {
  try {
    return await scraper.get(url);
  } catch (error) {
    if (error instanceof ScraperError) {
      // Handle specific error
      logger.error('Scraping failed', { code: error.code });
    }
    throw error;
  }
}

// ❌ Bad: Silent failures
async function fetchData(url: string): Promise<Data | null> {
  try {
    return await scraper.get(url);
  } catch (error) {
    return null; // Don't swallow errors silently
  }
}
```

### Code Formatting

We use Prettier for code formatting. Configuration:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

Run formatter:
```bash
npm run format
```

### Linting

We use ESLint. Key rules:

- No `any` type unless absolutely necessary
- No unused variables
- Consistent import ordering
- Prefer `const` over `let`
- No console.log (use logger)

Run linter:
```bash
npm run lint        # Check
npm run lint:fix    # Fix automatically
```

---

## Testing

### Test Structure
```typescript
import { Scraper } from '../../src/core/Scraper';

describe('Scraper', () => {
  let scraper: Scraper;

  beforeEach(() => {
    scraper = new Scraper({ timeout: 5000 });
  });

  afterEach(async () => {
    await scraper.close();
  });

  describe('get()', () => {
    it('should fetch a webpage successfully', async () => {
      const response = await scraper.get('https://example.com');
      
      expect(response.status).toBe(200);
      expect(response.html).toContain('Example Domain');
    });

    it('should throw error for invalid URL', async () => {
      await expect(
        scraper.get('invalid-url')
      ).rejects.toThrow('Invalid URL');
    });
  });
});
```

### Testing Guidelines

#### 1. Test Coverage

- Aim for **80%+ code coverage**
- All new features must have tests
- All bug fixes must have regression tests

#### 2. Test Types
```typescript
// Unit tests: Test individual functions/methods
describe('exponentialBackoff', () => {
  it('should calculate correct delay', () => {
    expect(exponentialBackoff(0, 1000)).toBe(1000);
    expect(exponentialBackoff(1, 1000)).toBe(2000);
  });
});

// Integration tests: Test component interactions
describe('Queue Integration', () => {
  it('should process tasks with correct priority', async () => {
    const queue = createQueue(1);
    // Test queue with real tasks
  });
});

// E2E tests: Test full workflows
describe('Scraping Workflow', () => {
  it('should scrape website with browser pool', async () => {
    // Test complete scraping scenario
  });
});
```

#### 3. Mocking
```typescript
// Mock external dependencies
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn(),
        content: jest.fn().mockResolvedValue('<html></html>')
      })
    })
  }
}));

// Use test doubles for external APIs
const mockFetch = jest.spyOn(global, 'fetch')
  .mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '<html></html>'
  } as Response);
```

#### 4. Async Testing
```typescript
// ✅ Good: Properly handle async
it('should complete async operation', async () => {
  const result = await scraper.get(url);
  expect(result).toBeDefined();
});

// ✅ Good: Test promises
it('should reject on error', () => {
  return expect(scraper.get('invalid')).rejects.toThrow();
});

// ❌ Bad: Missing await
it('should complete async operation', () => {
  scraper.get(url); // This won't wait!
  expect(result).toBeDefined();
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- Scraper.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only integration tests
npm test -- --testPathPattern=integration
```

---

## Documentation

### Documentation Standards

#### 1. Code Documentation

- All public APIs must have JSDoc comments
- Include examples for complex functions
- Document parameters and return types
- Explain non-obvious behavior

#### 2. README Updates

When adding features:
- Update feature list
- Add usage examples
- Update table of contents

#### 3. API Documentation

Update `docs/API.md` for:
- New classes or functions
- Changed method signatures
- New configuration options

#### 4. Changelog

Every PR should update `CHANGELOG.md`:
- Add entry under `[Unreleased]`
- Use appropriate category (Added, Changed, Fixed, etc.)
- Include brief description

---

## Submitting Changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(queue): add priority-based task scheduling

Implement PriorityQueue with support for CRITICAL, HIGH, NORMAL,
and LOW priorities. Tasks are processed in priority order with
FIFO behavior within the same priority level.

Closes #123
```
```bash
fix(browser-pool): prevent memory leak in page cleanup

Pages were not being properly closed when released back to the pool,
causing memory to grow over time in long-running processes.

Fixes #456
```

### Pull Request Process

#### 1. Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Code is formatted (`npm run format`)
- [ ] Linter passes (`npm run lint`)

#### 2. PR Title

Use conventional commit format:
```
feat(queue): add retry mechanism for failed tasks
fix(browser): resolve memory leak in page cleanup
docs(api): update BrowserPool documentation
```

#### 3. PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## Related Issues
Closes #123
Fixes #456
```

#### 4. Review Process

- At least one maintainer approval required
- All comments must be resolved
- CI checks must pass
- No merge conflicts

#### 5. After Merge

- Delete your branch
- Close related issues
- Update your fork

---

## Release Process

(For maintainers only)

### Version Bumping
```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

### Release Checklist

1. [ ] All tests passing on main branch
2. [ ] CHANGELOG.md updated with version
3. [ ] Version bumped in package.json
4. [ ] Documentation reviewed
5. [ ] Create GitHub release with notes
6. [ ] Publish to npm: `npm publish`
7. [ ] Announce release

---

## Getting Help

### Resources

- 📖 [Documentation](./README.md)
- 🐛 [Issue Tracker](https://github.com/Brashkie/ultra-scraper/issues)
- 💬 [Discussions](https://github.com/Brashkie/ultra-scraper/discussions)

### Contact

- GitHub Issues: For bugs and feature requests
- GitHub Discussions: For questions and community discussion
- Email: dev@ultra-scraper.dev

---

## Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Added to contributors graph

---

## License

By contributing to Ultra Scraper, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Ultra Scraper! 🎉