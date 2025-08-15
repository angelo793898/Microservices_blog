# Database Secrets Setup

This document explains how to set up database credentials securely for this application.

## 🔐 Security Approach

- **Local Development**: Uses `.env` file (never committed to git)
- **Kubernetes**: Uses Kubernetes Secrets (created manually)
- **Production**: Would use cloud provider secret management (AWS Secrets Manager, etc.)

## 📋 Setup Instructions

### 1. Local Development Setup

```bash
# Copy the example file
cp .env.example .env

# Edit .env and replace placeholder with your real password
# DB_PASSWORD=your_actual_password_here
```

### 2. Kubernetes Secret Setup

Create the database secret manually in your cluster:

```bash
kubectl create secret generic database-secret \
  --from-literal=host=host.docker.internal \
  --from-literal=port=5432 \
  --from-literal=name=postgres \
  --from-literal=user=postgres \
  --from-literal=password=YOUR_REAL_PASSWORD
```

### 3. Verify Secret Creation

```bash
# Check if secret exists
kubectl get secrets database-secret

# View secret details (passwords will be base64 encoded)
kubectl describe secret database-secret
```

## 🚀 Running the Application

1. Ensure PostgreSQL is running locally
2. Create the Kubernetes secret (step 2 above)
3. Run the application:
   ```bash
   skaffold dev
   ```

## ⚠️ Security Notes

- Never commit real passwords to git
- The `.env` file is in `.gitignore` 
- Kubernetes secrets are stored in the cluster, not in code
- For production, use proper secret management services

## 🔄 Updating Secrets

To update the database password:

```bash
# Delete existing secret
kubectl delete secret database-secret

# Create new secret with updated password
kubectl create secret generic database-secret \
  --from-literal=host=host.docker.internal \
  --from-literal=port=5432 \
  --from-literal=name=postgres \
  --from-literal=user=postgres \
  --from-literal=password=NEW_PASSWORD
```