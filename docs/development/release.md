# Release

## Publish `v0.0.0`

```bash
clasp status
clasp push
clasp version "v0.0.0"
clasp versions
```

## API Executable Deployment

`clasp run runAllTests` requires an API-executable deployment:

```bash
clasp deploy -d "API executable for runAllTests"
```

Tag release:

```bash
git tag v0.0.0
git push origin v0.0.0
```

## Docs Deployment

Tag push matching `v*` triggers `.github/workflows/docs.yml` and deploys to GitHub Pages.

## Release Workflow

Tag push matching `v*` also triggers `.github/workflows/release.yml`, which:

- runs lint/tests/docs validation
- publishes GitHub Release notes for the tag
