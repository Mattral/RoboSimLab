# ⚙️ GitHub Actions CI/CD Guide

Automated testing, building, and deployment pipeline for RoboSimLab.

---

## Pipeline Overview

```
Push/PR to main
    │
    ├─► Test & Lint ──► Build Check
    │
    └─► (main only)
         ├─► Build Docker Image
         ├─► Push to GHCR
         └─► Deploy to Kubernetes
```

---

## Workflows

### 1. CI Pipeline — `.github/workflows/ci.yml`

Runs on every push and pull request.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --run --reporter=verbose
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 3
```

---

### 2. Docker Build & Push — `.github/workflows/docker.yml`

Builds and pushes to GitHub Container Registry on main branch.

```yaml
name: Docker

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  packages: write

jobs:
  docker:
    name: Build & Push Image
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
```

---

### 3. Deploy — `.github/workflows/deploy.yml`

Deploys to Kubernetes after successful Docker build.

```yaml
name: Deploy

on:
  workflow_run:
    workflows: [Docker]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    name: Deploy to Kubernetes
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Update image tag
        run: |
          SHORT_SHA=$(echo ${{ github.sha }} | cut -c1-7)
          kubectl -n robosimlab set image deployment/robosimlab \
            robosimlab=ghcr.io/${{ github.repository }}:${SHORT_SHA}

      - name: Wait for rollout
        run: |
          kubectl -n robosimlab rollout status deployment/robosimlab --timeout=300s

      - name: Verify deployment
        run: |
          kubectl -n robosimlab get pods -l app.kubernetes.io/name=robosimlab
```

---

### 4. Release — `.github/workflows/release.yml`

Auto-creates GitHub releases on version tags.

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -z "$PREV_TAG" ]; then
            CHANGES=$(git log --pretty=format:"- %s (%h)" HEAD)
          else
            CHANGES=$(git log --pretty=format:"- %s (%h)" ${PREV_TAG}..HEAD)
          fi
          echo "changes<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - uses: softprops/action-gh-release@v1
        with:
          body: |
            ## Changes
            ${{ steps.changelog.outputs.changes }}
          generate_release_notes: true
```

---

## Required Secrets

Configure these in **Repository Settings → Secrets and variables → Actions**:

| Secret | Description | Required For |
|--------|-------------|-------------|
| `GITHUB_TOKEN` | Auto-provided by GitHub | Docker push to GHCR |
| `KUBE_CONFIG` | Base64-encoded kubeconfig | Kubernetes deployment |

### Encoding kubeconfig

```bash
cat ~/.kube/config | base64 -w 0
```

Paste the output as the `KUBE_CONFIG` secret value.

---

## Branch Strategy

| Branch | CI | Docker | Deploy |
|--------|-----|--------|--------|
| `main` | ✅ Lint + Test + Build | ✅ Build + Push | ✅ Auto-deploy |
| `develop` | ✅ Lint + Test + Build | ❌ | ❌ |
| PR → `main` | ✅ Lint + Test + Build | ❌ | ❌ |
| `v*` tags | ✅ | ✅ Multi-arch | ✅ + Release |

---

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run CI pipeline locally
act push -j test

# Run with secrets
act push --secret-file .env.secrets
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `npm ci` fails | Ensure `package-lock.json` is committed |
| Docker push denied | Check `packages: write` permission |
| kubectl connection refused | Verify `KUBE_CONFIG` secret is valid base64 |
| Rollout timeout | Check pod logs: `kubectl -n robosimlab logs -l app.kubernetes.io/name=robosimlab` |
| Concurrency issues | The `concurrency` key cancels redundant runs automatically |
