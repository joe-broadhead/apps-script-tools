# Release

## Publish `v0.0.0`

```bash
clasp status
clasp push
clasp version "v0.0.0"
clasp versions
```

Tag release:

```bash
git tag v0.0.0
git push origin v0.0.0
```

## Docs Deployment

Tag push matching `v*` triggers `.github/workflows/docs.yml` and deploys to GitHub Pages.
