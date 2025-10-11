#!/bin/bash

# Deploy Omni Assistant to Kubernetes using ECR images
# This script deploys the application to Kubernetes using images from Amazon ECR

set -e  # Exit on any error

# ECR Configuration
ECR_REGISTRY="399485458576.dkr.ecr.us-east-2.amazonaws.com/ssen"
AWS_REGION="us-east-2"
BACKEND_REPO="omni-assistant"
FRONTEND_REPO="omni-assistant-frontend"

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

# Check if AWS CLI is available
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
}

# Verify ECR authentication
verify_ecr_auth() {
    log_info "Verifying ECR authentication..."
    
    if aws ecr describe-repositories --region $AWS_REGION > /dev/null 2>&1; then
        log_success "ECR authentication verified"
    else
        log_error "Not authenticated with ECR. Please run: aws configure"
        exit 1
    fi
}

# Login to ECR (for local Docker)
ecr_login() {
    log_info "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    if [ $? -eq 0 ]; then
        log_success "Successfully logged into ECR"
    else
        log_error "Failed to login to ECR"
        exit 1
    fi
}

# Verify ECR images exist
verify_ecr_images() {
    log_info "Verifying images exist in ECR..."
    
    local IMAGES_MISSING=0
    
    # Check backend image
    BACKEND_IMAGES=$(aws ecr list-images \
        --repository-name $ECR_REGISTRY/$BACKEND_REPO \
        --region $AWS_REGION \
        --filter "tagStatus=TAGGED" \
        --query 'imageIds[?imageTag==`latest`]' \
        --output json 2>/dev/null)
    
    if [ "$(echo $BACKEND_IMAGES | jq -r 'length')" -eq 0 ]; then
        log_error "Backend image not found in ECR: $ECR_REGISTRY/$BACKEND_REPO:latest"
        IMAGES_MISSING=1
    else
        log_success "Backend image found in ECR"
    fi
    
    # Check frontend image
    FRONTEND_IMAGES=$(aws ecr list-images \
        --repository-name $ECR_REGISTRY/$FRONTEND_REPO \
        --region $AWS_REGION \
        --filter "tagStatus=TAGGED" \
        --query 'imageIds[?imageTag==`latest`]' \
        --output json 2>/dev/null)
    
    if [ "$(echo $FRONTEND_IMAGES | jq -r 'length')" -eq 0 ]; then
        log_error "Frontend image not found in ECR: $ECR_REGISTRY/$FRONTEND_REPO:latest"
        IMAGES_MISSING=1
    else
        log_success "Frontend image found in ECR"
    fi
    
    if [ $IMAGES_MISSING -eq 1 ]; then
        echo ""
        log_error "Cannot deploy without images in ECR"
        log_info "Please build and push images first using:"
        echo "  ./scripts/push-to-ecr.sh"
        echo ""
        exit 1
    fi
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
            --from-file=application.yaml=config/application.yml \
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
        log_info "You can customize config/application.yaml and run './scripts/deploy-to-kubernetes-ecr.sh update-config' to update"
    fi
}

# Create Kubernetes secret for ECR access
create_ecr_secret() {
    log_info "Creating Kubernetes secret for ECR authentication..."
    
    # Delete existing secret if it exists
    kubectl delete secret ecr-registry-secret -n omni-assistant --ignore-not-found=true
    
    # Get ECR token
    ECR_TOKEN=$(aws ecr get-login-password --region $AWS_REGION)
    
    # Create Docker config JSON
    kubectl create secret docker-registry ecr-registry-secret \
        --docker-server=$ECR_REGISTRY \
        --docker-username=AWS \
        --docker-password=$ECR_TOKEN \
        --namespace=omni-assistant
    
    if [ $? -eq 0 ]; then
        log_success "ECR secret created successfully"
        log_info "Note: ECR tokens expire after 12 hours. You may need to recreate this secret periodically."
    else
        log_error "Failed to create ECR secret"
        exit 1
    fi
}

# Create Kubernetes manifests for ECR deployment
create_manifests() {
    if [ ! -d "k8s-manifests-ecr" ]; then
        log_info "Creating Kubernetes manifests for ECR deployment..."
        mkdir -p k8s-manifests-ecr
        
        # MySQL deployment (same as before)
        cat > k8s-manifests-ecr/mysql-deployment.yaml <<EOF
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

        # Application deployment using ECR images
        cat > k8s-manifests-ecr/app-deployment.yaml <<EOF
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
      imagePullSecrets:
      - name: ecr-registry-secret
      initContainers:
      - name: wait-for-mysql
        image: busybox:1.35
        command: ['sh', '-c', 'until nc -z mysql-service 3306; do echo waiting for mysql; sleep 2; done;']
      containers:
      # Backend container
      - name: backend
        image: $ECR_REGISTRY/$BACKEND_REPO:latest
        imagePullPolicy: Always
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
        image: $ECR_REGISTRY/$FRONTEND_REPO:latest
        imagePullPolicy: Always
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

        log_success "Kubernetes manifests created in k8s-manifests-ecr/ directory"
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
    
    # Create ECR secret for image pulling
    create_ecr_secret
    
    # Create ConfigMap from external configuration
    create_config_map
    
    # Delete existing deployments to force recreation with new images
    log_info "Cleaning up existing deployments..."
    kubectl delete deployment omni-assistant-app -n omni-assistant --ignore-not-found=true
    kubectl delete deployment omni-assistant-frontend -n omni-assistant --ignore-not-found=true  # Legacy cleanup
    kubectl delete deployment mysql -n omni-assistant --ignore-not-found=true
    
    # Wait a moment for cleanup
    sleep 5
    
    # Apply all manifests
    kubectl apply -f k8s-manifests-ecr/
    
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
    
    echo ""
    log_info "ECR Images Used:"
    echo "Backend:  $ECR_REGISTRY/$BACKEND_REPO:latest"
    echo "Frontend: $ECR_REGISTRY/$FRONTEND_REPO:latest"
}

# Clean up function
cleanup() {
    log_info "Cleaning up previous deployment..."
    
    if [ -d "k8s-manifests-ecr" ]; then
        kubectl delete -f k8s-manifests-ecr/ --ignore-not-found=true
    else
        log_info "No k8s-manifests-ecr directory found, cleaning up by namespace..."
        kubectl delete namespace omni-assistant --ignore-not-found=true
    fi
    
    log_success "Cleanup completed"
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

# Redeploy with latest images from ECR
redeploy() {
    log_info "Redeploying with latest images from ECR..."
    
    # Verify images exist
    verify_ecr_images
    
    # Recreate ECR secret (in case token expired)
    create_ecr_secret
    
    # Force restart deployment to pull new images
    log_info "Restarting deployment to pull latest images..."
    kubectl rollout restart deployment/omni-assistant-app -n omni-assistant
    
    # Wait for rollout
    kubectl rollout status deployment/omni-assistant-app -n omni-assistant --timeout=300s
    
    log_success "Redeploy completed"
}

# Refresh ECR secret (tokens expire after 12 hours)
refresh_ecr_secret() {
    log_info "Refreshing ECR authentication token..."
    
    create_ecr_secret
    
    # Restart deployment to use new credentials
    log_info "Restarting deployment to use new credentials..."
    kubectl rollout restart deployment/omni-assistant-app -n omni-assistant
    
    log_success "ECR secret refreshed"
}

# Main function
main() {
    echo "🚀 Deploying Omni Assistant to Kubernetes (ECR)"
    echo "================================================"
    echo "ECR Registry: $ECR_REGISTRY"
    echo "Region: $AWS_REGION"
    echo ""
    
    # Pre-flight checks
    check_kubectl
    check_docker
    check_aws_cli
    verify_ecr_auth
    ecr_login
    
    # Verify images exist in ECR
    #verify_ecr_images
    
    # Deploy to Kubernetes
    deploy_to_kubernetes
    
    # Wait for deployment
    wait_for_deployment
    
    # Show status
    show_status
    
    log_success "Omni Assistant deployed successfully to Kubernetes! 🎉"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Useful Commands:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "View logs:"
    echo "  kubectl logs -f deployment/omni-assistant-app -c backend -n omni-assistant"
    echo "  kubectl logs -f deployment/omni-assistant-app -c frontend -n omni-assistant"
    echo ""
    echo "Scale application:"
    echo "  kubectl scale deployment omni-assistant-app --replicas=3 -n omni-assistant"
    echo ""
    echo "Update with new images:"
    echo "  1. ./scripts/push-to-ecr.sh              # Build and push new images"
    echo "  2. ./scripts/deploy-to-kubernetes-ecr.sh redeploy  # Pull and deploy"
    echo ""
    echo "Other commands:"
    echo "  ./scripts/deploy-to-kubernetes-ecr.sh status"
    echo "  ./scripts/deploy-to-kubernetes-ecr.sh logs"
    echo "  ./scripts/deploy-to-kubernetes-ecr.sh troubleshoot"
    echo ""
    log_warning "Note: ECR authentication tokens expire after 12 hours."
    echo "If image pulls fail later, run: ./scripts/deploy-to-kubernetes-ecr.sh refresh-secret"
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
    
    echo "🔐 ECR Secret Status:"
    kubectl get secret ecr-registry-secret -n omni-assistant -o yaml
    echo ""
    
    log_info "Common fixes:"
    echo "1. Refresh ECR secret: ./scripts/deploy-to-kubernetes-ecr.sh refresh-secret"
    echo "2. Check if MySQL is ready: kubectl wait --for=condition=ready pod -l app=mysql -n omni-assistant"
    echo "3. Restart deployment: kubectl rollout restart deployment/omni-assistant-app -n omni-assistant"
    echo "4. Check image pull issues: kubectl describe pod <pod-name> -n omni-assistant"
    echo "5. Push new images: ./scripts/push-to-ecr.sh"
    echo "6. Redeploy: ./scripts/deploy-to-kubernetes-ecr.sh redeploy"
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
    "redeploy")
        redeploy
        ;;
    "update-config")
        update_config
        ;;
    "refresh-secret")
        refresh_ecr_secret
        ;;
    "help")
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Description:"
        echo "  Deploy Omni Assistant to Kubernetes using images from Amazon ECR."
        echo "  Images must be built and pushed to ECR first using push-to-ecr.sh"
        echo ""
        echo "Options:"
        echo "  (no option)       Deploy application using ECR images"
        echo "  redeploy          Pull latest images from ECR and redeploy"
        echo "  cleanup           Remove all deployed resources"
        echo "  status            Show deployment status"
        echo "  logs              View application logs"
        echo "  troubleshoot      Run troubleshooting diagnostics"
        echo "  update-config     Update configuration and restart"
        echo "  refresh-secret    Refresh ECR authentication token"
        echo "  help              Show this help message"
        echo ""
        echo "Prerequisites:"
        echo "  1. Build and push images: ./scripts/push-to-ecr.sh"
        echo "  2. Configure AWS CLI: aws configure"
        echo "  3. Have kubectl configured for your cluster"
        echo ""
        ;;
    *)
        main
        ;;
esac

