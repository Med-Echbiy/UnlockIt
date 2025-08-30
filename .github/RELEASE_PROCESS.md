# UnlockIt Release Process 🚀

This document outlines the release process for UnlockIt using GitHub's release system.

## Branch Strategy

- **`main`** - Production-ready code, releases are tagged from here
- **`develop`** - Development branch for new features
- **`feature/*`** - Feature branches for specific development
- **`hotfix/*`** - Emergency fixes for production issues

## Release Types

### Major Release (v1.0.0 → v2.0.0)

- Breaking changes
- Major new features
- Significant architecture changes

### Minor Release (v1.0.0 → v1.1.0)

- New features
- Enhancements
- Non-breaking changes

### Patch Release (v1.0.0 → v1.0.1)

- Bug fixes
- Security patches
- Minor improvements

## Automated Release Process

### 1. Prepare Release

```bash
# Create a release branch
git checkout -b release/v1.1.0 develop

# Update version numbers
# - package.json
# - src-tauri/tauri.conf.json
# - src-tauri/Cargo.toml

# Create release notes
# .github/RELEASE_NOTES/RELEASE_NOTES_v1.1.0.md

# Commit changes
git add .
git commit -m "chore: prepare release v1.1.0"

# Merge to main
git checkout main
git merge release/v1.1.0
```

### 2. Create GitHub Release

```bash
# Tag the release
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### 3. Automated Build

The GitHub Action will automatically:

- Build the Tauri application for Windows x64
- Create MSI installer
- Upload artifacts to the release
- Update the release with build artifacts

### 4. Manual Release (Alternative)

You can also trigger a release manually:

1. Go to GitHub Actions
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter the version tag (e.g., v1.1.0)

## Release Checklist

### Pre-Release

- [ ] All tests are passing
- [ ] Version numbers updated in all files
- [ ] Release notes created and reviewed
- [ ] Breaking changes documented
- [ ] Documentation updated

### Release

- [ ] Create and push git tag
- [ ] Verify GitHub Action completes successfully
- [ ] Test the built installer
- [ ] Update release description if needed

### Post-Release

- [ ] Merge main back to develop
- [ ] Update any documentation websites
- [ ] Announce release on social media/forums
- [ ] Close related GitHub issues
- [ ] Plan next release milestone

## File Locations

- **Release Notes**: `.github/RELEASE_NOTES/RELEASE_NOTES_v{version}.md`
- **Workflows**: `.github/workflows/`
- **Issue Templates**: `.github/ISSUE_TEMPLATE/`
- **Version Files**:
  - `package.json`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`

## Troubleshooting

### Common Issues

**Build Failures**:

- Check Rust/Node versions in workflow
- Verify all dependencies are properly listed
- Check for missing environment variables

**Release Creation Fails**:

- Ensure tag doesn't already exist
- Check GitHub token permissions
- Verify repository settings allow releases

**Artifacts Not Uploading**:

- Check tauri-action configuration
- Verify release ID is properly passed
- Check file paths in build output

## Security Considerations

- Never include sensitive data in release notes
- Verify all dependencies for security vulnerabilities
- Consider code signing for production releases
- Use GitHub's security scanning features

---

For questions about the release process, please open an issue or discussion on GitHub.
