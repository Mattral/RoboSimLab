# ☸️ Kubernetes Deployment Guide

Deploy RoboSimLab to a Kubernetes cluster with high availability, auto-scaling, and TLS.

---

## Prerequisites

- Kubernetes cluster ≥ 1.27
- `kubectl` configured with cluster access
- Container image pushed to a registry (see [Docker guide](./docker.md))
- Ingress controller installed (e.g., NGINX Ingress)

---

## Directory Structure

```
k8s/
├── namespace.yaml
├── deployment.yaml
├── service.yaml
├── ingress.yaml
├── hpa.yaml
└── configmap.yaml
```

---

## 1. Namespace

### `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: robosimlab
  labels:
    app.kubernetes.io/name: robosimlab
    app.kubernetes.io/part-of: robosimlab
```

---

## 2. ConfigMap

### `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: robosimlab-config
  namespace: robosimlab
data:
  NGINX_WORKER_CONNECTIONS: "1024"
  NGINX_KEEPALIVE_TIMEOUT: "65"
```

---

## 3. Deployment

### `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: robosimlab
  namespace: robosimlab
  labels:
    app.kubernetes.io/name: robosimlab
    app.kubernetes.io/version: "1.0.0"
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: robosimlab
  template:
    metadata:
      labels:
        app.kubernetes.io/name: robosimlab
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101  # nginx user
        fsGroup: 101
      containers:
        - name: robosimlab
          image: ghcr.io/YOUR_ORG/robosimlab:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 2
          envFrom:
            - configMapRef:
                name: robosimlab-config
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: robosimlab
```

---

## 4. Service

### `k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: robosimlab-service
  namespace: robosimlab
  labels:
    app.kubernetes.io/name: robosimlab
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: robosimlab
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
```

---

## 5. Ingress (with TLS)

### `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: robosimlab-ingress
  namespace: robosimlab
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - robosimlab.example.com
      secretName: robosimlab-tls
  rules:
    - host: robosimlab.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: robosimlab-service
                port:
                  number: 80
```

---

## 6. Horizontal Pod Autoscaler

### `k8s/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: robosimlab-hpa
  namespace: robosimlab
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: robosimlab
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

---

## Deploy Commands

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/

# Check status
kubectl -n robosimlab get all
kubectl -n robosimlab get ingress

# Watch rollout
kubectl -n robosimlab rollout status deployment/robosimlab

# Scale manually
kubectl -n robosimlab scale deployment robosimlab --replicas=5

# View logs
kubectl -n robosimlab logs -l app.kubernetes.io/name=robosimlab -f

# Rollback
kubectl -n robosimlab rollout undo deployment/robosimlab

# Delete everything
kubectl delete namespace robosimlab
```

---

## Production Checklist

- [ ] Replace `ghcr.io/YOUR_ORG/robosimlab:latest` with your actual image
- [ ] Replace `robosimlab.example.com` with your domain
- [ ] Install cert-manager for automatic TLS certificates
- [ ] Configure resource limits based on load testing
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Enable Pod Disruption Budget for zero-downtime updates
- [ ] Configure network policies for namespace isolation
