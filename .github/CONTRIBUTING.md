# Contributing to UnlockIt 🎮

First off, thank you for considering contributing to UnlockIt! It's people like you that make UnlockIt such a great tool for gamers everywhere.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [your-email@example.com].

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- pnpm package manager
- Git

### Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/UnlockIt.git`
3. Install dependencies: `pnpm install`
4. Start development server: `pnpm tauri dev`

## How to Contribute

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you create a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots if applicable

### ✨ Suggesting Features

Feature requests are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed feature
- Explain why this feature would be useful
- Provide examples of how the feature would be used

### 🔧 Code Contributions

#### Branch Naming Convention

- `feature/feature-name` for new features
- `bugfix/bug-name` for bug fixes
- `hotfix/critical-fix` for critical fixes
- `chore/task-name` for maintenance tasks

#### Development Process

1. Create a new branch from `develop`
2. Make your changes
3. Write or update tests
4. Ensure all tests pass
5. Update documentation if needed
6. Submit a pull request

## Development Setup

### Frontend Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
```

### Backend Development

```bash
# Navigate to backend directory
cd src-tauri

# Run tests
cargo test

# Check code formatting
cargo fmt --check

# Run clippy linting
cargo clippy -- -D warnings

# Build for development
cargo build

# Build for release
cargo build --release
```

### Full Application

```bash
# Run the full Tauri application
pnpm tauri dev

# Build the complete application
pnpm tauri build
```

## Coding Standards

### Frontend (TypeScript/React)

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use functional components with hooks
- Implement proper error boundaries
- Use Zustand for state management
- Follow the existing file structure

### Backend (Rust)

- Follow Rust naming conventions
- Use proper error handling with Result types
- Document public APIs with rustdoc
- Use Clippy to catch common mistakes
- Format code with rustfmt

### General Guidelines

- Write clear, self-documenting code
- Add comments for complex logic
- Use meaningful variable and function names
- Keep functions small and focused
- Follow the single responsibility principle

## Testing

### Frontend Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Backend Testing

```bash
cd src-tauri
cargo test
cargo test -- --nocapture  # Show println! output
```

## Documentation

- Update README.md if you change functionality
- Add inline comments for complex code
- Update type definitions
- Include examples in documentation

## Submitting Changes

### Pull Request Process

1. Ensure your branch is up to date with the latest `develop` branch
2. Run all tests and ensure they pass
3. Update documentation as needed
4. Create a pull request with a clear title and description
5. Link any related issues
6. Wait for review and address any feedback

### Pull Request Guidelines

- Use a clear and descriptive title
- Reference any related issues
- Provide a detailed description of changes
- Include screenshots for UI changes
- Ensure all checks pass
- Keep PRs focused and atomic

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Special thanks in major version releases

## Questions?

Feel free to:

- Open a GitHub Discussion
- Create an issue with the "question" label
- Join our community discussions

## License

By contributing to UnlockIt, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to UnlockIt! 🎮🏆
