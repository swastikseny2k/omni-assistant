#!/bin/bash

# Deploy Omni Assistant to Kubernetes
# This script builds Docker images and deploys the application to Kubernetes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please run setup-kubernetes.sh first."
        exit 1
    fi
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please run setup-kubernetes.sh first."
        exit 1
    fi
}

# Verify Docker images exist
verify_images() {
    log_info "Verifying Docker images exist locally..."
    
    # Check if backend image exists
    if ! docker image inspect omni-assistant:latest &> /dev/null; then
        log_error "Backend image 'omni-assistant:latest' not found locally."
        log_info "Building backend image..."
        build_backend
    else
        log_success "Backend image 'omni-assistant:latest' found"
    fi
    
    # Check if frontend image exists
    if ! docker image inspect omni-assistant-frontend:latest &> /dev/null; then
        log_error "Frontend image 'omni-assistant-frontend:latest' not found locally."
        log_info "Building frontend image..."
        build_frontend
    else
        log_success "Frontend image 'omni-assistant-frontend:latest' found"
    fi
}

# Build Spring Boot application
build_backend() {
    log_info "Building Spring Boot application..."
    
    # Build the JAR file
    ./gradlew clean build -x test
    
    # Create Dockerfile for Spring Boot app if it doesn't exist
    if [ ! -f Dockerfile ]; then
        cat > Dockerfile <<EOF
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
EOF
        log_info "Created Dockerfile for Spring Boot application"
    fi
    
    # Build Docker image
    docker build -t omni-assistant:latest .
    
    log_success "Backend Docker image built successfully"
}

# Build React frontend
build_frontend() {
    log_info "Building React frontend..."
    
    cd frontend
    
    # Install dependencies
    npm install
    
    # Build the React app
    npm run build
    
    # Create Dockerfile for React app if it doesn't exist
    if [ ! -f Dockerfile ]; then
        cat > Dockerfile <<EOF
FROM nginx:alpine

COPY build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
EOF
        log_info "Created Dockerfile for React frontend"
    fi
    
    # Create nginx configuration
    cat > nginx.conf <<EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 3000;
        server_name localhost;

        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files \$uri \$uri/ /index.html;
        }

        location /api {
            proxy_pass http://omni-assistant-service:8080;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
    
    # Build Docker image
    docker build --build-arg REACT_APP_API_URL=http://omni-assistant-service:8080 -t omni-assistant-frontend:latest .

    cd ..
    
    log_success "Frontend Docker image built successfully"
}

# Create ConfigMap for application configuration
create_config_map() {
    log_info "Creating ConfigMap for application configuration..."
    
    # Check if external config file exists
    if [ -f "config/application.yaml" ]; then
        log_info "Using external configuration from config/application.yaml"
        kubectl create configmap omni-assistant-config \
            --from-file=application.yaml=config/application.yaml \
            -n omni-assistant \
            --dry-run=client -o yaml | kubectl apply -f -
        log_success "ConfigMap created from config/application.yaml"
    elif [ -f "config/application.yml" ]; then
        log_info "Using external configuration from config/application.yml"
        kubectl create configmap omni-assistant-config \
            --from-file=application.yaml=config/application.yaml \
            -n omni-assistant \
            --dry-run=client -o yaml | kubectl apply -f -
        log_success "ConfigMap created from config/application.yml"
    else
        log_warning "No external config found at config/application.yaml or config/application.yml"
        log_info "Creating default ConfigMap..."
        
        # Create config directory
        mkdir -p config
        
        # Create a basic application.yaml template
        cat > config/application.yaml <<'EOF'
spring:
  application:
    name: omni-assistant
  
  datasource:
    url: jdbc:mysql://mysql-service:3306/omni_assistant?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true
    username: ${DB_USERNAME:omni_user}
    password: ${DB_PASSWORD:omni_password}
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

server:
  port: 8080

jwt:
  secret: ${JWT_SECRET:mySecretKey123456789012345678901234567890}
  expiration: 86400000

frontend:
  url: ${FRONTEND_URL:http://localhost:3000}

logging:
  level:
    org.assistant: INFO
    org.springframework.security: WARN
EOF
        
        kubectl create configmap omni-assistant-config \
            --from-file=application.yaml=config/application.yaml \
            -n omni-assistant \
            --dry-run=client -o yaml | kubectl apply -f -
        
        log_success "Default ConfigMap created"
        log_info "You can customize config/application.yaml and run './scripts/deploy-to-kubernetes.sh update-config' to update"
    fi
}

# Create Kubernetes manifests if they don't exist
create_manifests() {
    if [ ! -d "k8s-manifests" ]; then
        log_info "Creating Kubernetes manifests..."
        mkdir -p k8s-manifests
        
        # MySQL deployment
        cat > k8s-manifests/mysql-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: omni-assistant
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "rootpassword"
        - name: MYSQL_DATABASE
          value: "omni_assistant"
        - name: MYSQL_USER
          value: "omni_user"
        - name: MYSQL_PASSWORD
          value: "omni_password"
        ports:
        - containerPort: 3306
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        livenessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        volumeMounts:
        - name: mysql-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-storage
        persistentVolumeClaim:
          claimName: mysql-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-service
  namespace: omni-assistant
spec:
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
  namespace: omni-assistant
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF

        # Combined application deployment (frontend and backend in one pod)
        cat > k8s-manifests/app-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: omni-assistant-app
  namespace: omni-assistant
spec:
  replicas: 1
  selector:
    matchLabels:
      app: omni-assistant-app
  template:
    metadata:
      labels:
        app: omni-assistant-app
    spec:
      initContainers:
      - name: wait-for-mysql
        image: busybox:1.35
        command: ['sh', '-c', 'until nc -z mysql-service 3306; do echo waiting for mysql; sleep 2; done;']
      containers:
      # Backend container
      - name: backend
        image: omni-assistant:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 8080
          name: backend
        env:
        - name: SPRING_CONFIG_LOCATION
          value: "classpath:/application.yml,file:/config/application.yaml"
        - name: SPRING_DATASOURCE_URL
          value: "jdbc:mysql://mysql-service:3306/omni_assistant"
        - name: DB_USERNAME
          value: "omni_user"
        - name: DB_PASSWORD
          value: "omni_password"
        - name: SPRING_DATASOURCE_USERNAME
          value: "omni_user"
        - name: SPRING_DATASOURCE_PASSWORD
          value: "omni_password"
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        - name: SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE
          value: "5"
        - name: SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE
          value: "1"
        - name: JWT_SECRET
          value: "mySecretKey123456789012345678901234567890"
        - name: FRONTEND_URL
          value: "http://localhost:3000"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: config-volume
          mountPath: /config
          readOnly: true
        readinessProbe:
          tcpSocket:
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        livenessProbe:
          tcpSocket:
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
      # Frontend container
      - name: frontend
        image: omni-assistant-frontend:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
          name: frontend
        env:
        - name: REACT_APP_API_URL
          value: "http://localhost:8080"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
      volumes:
      - name: config-volume
        configMap:
          name: omni-assistant-config
---
# Service for backend
apiVersion: v1
kind: Service
metadata:
  name: omni-assistant-service
  namespace: omni-assistant
spec:
  selector:
    app: omni-assistant-app
  ports:
  - name: backend
    port: 8080
    targetPort: 8080
  type: LoadBalancer
---
# Service for frontend
apiVersion: v1
kind: Service
metadata:
  name: omni-assistant-frontend-service
  namespace: omni-assistant
spec:
  selector:
    app: omni-assistant-app
  ports:
  - name: frontend
    port: 80
    targetPort: 3000
  type: LoadBalancer
EOF

        log_success "Kubernetes manifests created in k8s-manifests/ directory"
    else
        log_info "Kubernetes manifests already exist"
    fi
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Create manifests if they don't exist
    create_manifests
    
    # Check if namespace exists
    if ! kubectl get namespace omni-assistant &> /dev/null; then
        kubectl create namespace omni-assistant
        log_info "Created namespace 'omni-assistant'"
    fi
    
    # Create ConfigMap from external configuration
    create_config_map
    
    # Delete existing deployments to force recreation with new imagePullPolicy
    log_info "Cleaning up existing deployments..."
    kubectl delete deployment omni-assistant-app -n omni-assistant --ignore-not-found=true
    kubectl delete deployment omni-assistant-frontend -n omni-assistant --ignore-not-found=true  # Legacy cleanup
    kubectl delete deployment mysql -n omni-assistant --ignore-not-found=true
    
    # Wait a moment for cleanup
    sleep 5
    
    # Apply all manifests
    kubectl apply -f k8s-manifests/
    
    log_success "Application deployed to Kubernetes"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for deployments to be ready..."
    
    # Wait for MySQL
    kubectl wait --for=condition=available --timeout=300s deployment/mysql -n omni-assistant
    
    # Wait for combined app deployment (contains both backend and frontend)
    kubectl wait --for=condition=available --timeout=300s deployment/omni-assistant-app -n omni-assistant
    
    log_success "All deployments are ready"
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo ""
    echo "Pods:"
    kubectl get pods -n omni-assistant
    echo ""
    echo "Services:"
    kubectl get services -n omni-assistant
    echo ""
    echo "Deployments:"
    kubectl get deployments -n omni-assistant
    echo ""
    
    # Get external IPs
    log_info "Access URLs:"
    BACKEND_IP=$(kubectl get service omni-assistant-service -n omni-assistant -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")
    FRONTEND_IP=$(kubectl get service omni-assistant-frontend-service -n omni-assistant -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")
    
    echo "Backend API: http://$BACKEND_IP:8080"
    echo "Frontend: http://$FRONTEND_IP"
    echo ""
    
    if [ "$BACKEND_IP" = "Pending" ] || [ "$FRONTEND_IP" = "Pending" ]; then
        log_warning "LoadBalancer IPs are pending. If you're using a cloud provider, this may take a few minutes."
        log_info "You can also use port-forwarding to access the services:"
        echo "kubectl port-forward service/omni-assistant-service 8080:8080 -n omni-assistant"
        echo "kubectl port-forward service/omni-assistant-frontend-service 3000:80 -n omni-assistant"
    fi
}

# Clean up function
cleanup() {
    log_info "Cleaning up previous deployment..."
    
    if [ -d "k8s-manifests" ]; then
        kubectl delete -f k8s-manifests/ --ignore-not-found=true
    else
        log_info "No k8s-manifests directory found, cleaning up by namespace..."
        kubectl delete namespace omni-assistant --ignore-not-found=true
    fi
    
    log_success "Cleanup completed"
}

# Main function
main() {
    echo "🚀 Deploying Omni Assistant to Kubernetes"
    echo "========================================="
    echo ""
    
    # Pre-flight checks
    check_kubectl
    check_docker
    
    # Verify and build images if needed
    verify_images
    
    # Deploy to Kubernetes
    deploy_to_kubernetes
    
    # Wait for deployment
    wait_for_deployment
    
    # Show status
    show_status
    
    log_success "Omni Assistant deployed successfully to Kubernetes!"
    echo ""
    echo "To view logs:"
    echo "kubectl logs -f deployment/omni-assistant-app -c backend -n omni-assistant   # Backend logs"
    echo "kubectl logs -f deployment/omni-assistant-app -c frontend -n omni-assistant  # Frontend logs"
    echo ""
    echo "To scale the application:"
    echo "kubectl scale deployment omni-assistant-app --replicas=3 -n omni-assistant"
}

# Troubleshooting function
troubleshoot() {
    log_info "🔍 Troubleshooting deployment issues..."
    echo ""
    
    echo "📊 Pod Status:"
    kubectl get pods -n omni-assistant -o wide
    echo ""
    
    echo "📋 Pod Details:"
    kubectl describe pods -n omni-assistant
    echo ""
    
    echo "📝 Backend Logs:"
    kubectl logs deployment/omni-assistant-app -c backend -n omni-assistant --tail=50
    echo ""
    
    echo "📝 Frontend Logs:"
    kubectl logs deployment/omni-assistant-app -c frontend -n omni-assistant --tail=50
    echo ""
    
    echo "📝 MySQL Logs:"
    kubectl logs deployment/mysql -n omni-assistant --tail=50
    echo ""
    
    echo "🔧 Events:"
    kubectl get events -n omni-assistant --sort-by='.lastTimestamp'
    echo ""
    
    log_info "Common fixes:"
    echo "1. Check if MySQL is ready: kubectl wait --for=condition=ready pod -l app=mysql -n omni-assistant"
    echo "2. Restart backend: kubectl rollout restart deployment/omni-assistant-app -n omni-assistant"
    echo "3. Check image pull: kubectl describe pod <pod-name> -n omni-assistant"
    echo "4. Check resource limits: kubectl top pods -n omni-assistant"
}

# Force rebuild images
rebuild_images() {
    log_info "Force rebuilding Docker images..."
    
    # Remove existing images
    docker rmi omni-assistant:latest 2>/dev/null || true
    docker rmi omni-assistant-frontend:latest 2>/dev/null || true
    
    # Build fresh images
    build_backend
    build_frontend
    
    log_success "Images rebuilt successfully"
}

# Fix image pull issues
fix_images() {
    log_info "Fixing image pull issues..."
    
    # Verify images exist locally
    verify_images
    
    # Delete all deployments to force recreation
    log_info "Deleting existing deployments..."
    kubectl delete deployment --all -n omni-assistant --ignore-not-found=true
    
    # Wait for cleanup
    sleep 10
    
    # Recreate manifests with correct imagePullPolicy
    log_info "Recreating manifests..."
    create_manifests
    
    # Apply manifests
    log_info "Applying manifests..."
    kubectl apply -f k8s-manifests/
    
    log_success "Image pull issues fixed"
}

# Update configuration
update_config() {
    log_info "Updating application configuration..."
    
    if [ ! -f "config/application.yaml" ] && [ ! -f "config/application.yml" ]; then
        log_error "Configuration file not found in config/ directory"
        log_info "Please create config/application.yaml or config/application.yml first"
        exit 1
    fi
    
    # Update ConfigMap
    create_config_map
    
    # Restart deployment to pick up new config
    log_info "Restarting application to apply new configuration..."
    kubectl rollout restart deployment/omni-assistant-app -n omni-assistant
    
    # Wait for rollout to complete
    kubectl rollout status deployment/omni-assistant-app -n omni-assistant --timeout=300s
    
    log_success "Configuration updated and application restarted"
}

# Handle command line arguments
case "${1:-}" in
    "cleanup")
        cleanup
        ;;
    "status")
        show_status
        ;;
    "logs")
        kubectl logs -f deployment/omni-assistant-app -n omni-assistant
        ;;
    "troubleshoot")
        troubleshoot
        ;;
    "rebuild")
        rebuild_images
        ;;
    "fix-images")
        fix_images
        ;;
    "update-config")
        update_config
        ;;
    *)
        main
        ;;
esac
