#!/bin/bash

# Push Omni Assistant images to Amazon ECR
# ECR Registry: 399485458576.dkr.ecr.us-east-2.amazonaws.com
# Platform: linux/amd64 (for x86_64 servers)

set -e  # Exit on any error

# Configuration
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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    log_success "Docker is running"
}

# Verify ECR login
verify_ecr_login() {
    log_info "Verifying ECR authentication..."

    if aws ecr describe-repositories --region $AWS_REGION > /dev/null 2>&1; then
        log_success "ECR authentication verified"
    else
        log_warning "ECR authentication may have expired. Attempting to re-login..."
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

        if [ $? -eq 0 ]; then
            log_success "Successfully logged in to ECR"
        else
            log_error "Failed to login to ECR. Please check your AWS credentials."
            exit 1
        fi
    fi
}

# Build backend image
build_backend() {
    log_info "Building Spring Boot backend..."

    # Build the JAR file
    log_info "Compiling Java application..."
    ./gradlew clean build -x test

    if [ $? -ne 0 ]; then
        log_error "Failed to build backend JAR"
        exit 1
    fi

    # Build Docker image for linux/amd64 platform
    log_info "Building backend Docker image for linux/amd64..."
    docker build --platform linux/amd64 -t $BACKEND_REPO:latest .

    if [ $? -eq 0 ]; then
        log_success "Backend image built successfully for linux/amd64"
    else
        log_error "Failed to build backend Docker image"
        exit 1
    fi
}

# Build frontend image
build_frontend() {
    log_info "Building React frontend..."

    cd frontend

    # Install dependencies
    log_info "Installing npm dependencies..."
    npm install

    # Build the React app
    log_info "Building React application..."
    npm run build

    if [ $? -ne 0 ]; then
        log_error "Failed to build frontend"
        cd ..
        exit 1
    fi

    # Build Docker image for linux/amd64 platform
    log_info "Building frontend Docker image for linux/amd64..."
    docker build --platform linux/amd64 -t $FRONTEND_REPO:latest .

    if [ $? -eq 0 ]; then
        log_success "Frontend image built successfully for linux/amd64"
    else
        log_error "Failed to build frontend Docker image"
        cd ..
        exit 1
    fi

    cd ..
}

# Tag images for ECR
tag_images() {
    log_info "Tagging images for ECR..."

    # Tag backend
    docker tag $BACKEND_REPO:latest $ECR_REGISTRY/$BACKEND_REPO:latest
    log_success "Tagged backend image: $ECR_REGISTRY/$BACKEND_REPO:latest"

    # Tag frontend
    docker tag $FRONTEND_REPO:latest $ECR_REGISTRY/$FRONTEND_REPO:latest
    log_success "Tagged frontend image: $ECR_REGISTRY/$FRONTEND_REPO:latest"
}

# Push images to ECR
push_images() {
    log_info "Pushing images to ECR..."

    # Push backend
    log_info "Pushing backend image..."
    docker push $ECR_REGISTRY/$BACKEND_REPO:latest

    if [ $? -eq 0 ]; then
        log_success "Backend image pushed successfully"
    else
        log_error "Failed to push backend image"
        exit 1
    fi

    # Push frontend
    log_info "Pushing frontend image..."
    docker push $ECR_REGISTRY/$FRONTEND_REPO:latest

    if [ $? -eq 0 ]; then
        log_success "Frontend image pushed successfully"
    else
        log_error "Failed to push frontend image"
        exit 1
    fi
}

# List all images in ECR
list_ecr_images() {
    log_info "Listing ECR images..."
    echo ""

    # List backend images
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Backend Repository ($BACKEND_REPO):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    BACKEND_IMAGES=$(aws ecr list-images \
        --repository-name $BACKEND_REPO \
        --region $AWS_REGION \
        --output json 2>/dev/null)

    if [ $? -eq 0 ]; then
        IMAGE_COUNT=$(echo $BACKEND_IMAGES | jq -r '.imageIds | length')
        if [ "$IMAGE_COUNT" -gt 0 ]; then
            echo "$BACKEND_IMAGES" | jq -r '.imageIds[] | "  Tag: \(.imageTag // "untagged")  Digest: \(.imageDigest)"'
            echo "  Total: $IMAGE_COUNT image(s)"
        else
            echo "  No images found"
        fi
    else
        log_warning "Repository '$BACKEND_REPO' not found or empty"
    fi

    echo ""

    # List frontend images
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Frontend Repository ($FRONTEND_REPO):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    FRONTEND_IMAGES=$(aws ecr list-images \
        --repository-name $FRONTEND_REPO \
        --region $AWS_REGION \
        --output json 2>/dev/null)

    if [ $? -eq 0 ]; then
        IMAGE_COUNT=$(echo $FRONTEND_IMAGES | jq -r '.imageIds | length')
        if [ "$IMAGE_COUNT" -gt 0 ]; then
            echo "$FRONTEND_IMAGES" | jq -r '.imageIds[] | "  Tag: \(.imageTag // "untagged")  Digest: \(.imageDigest)"'
            echo "  Total: $IMAGE_COUNT image(s)"
        else
            echo "  No images found"
        fi
    else
        log_warning "Repository '$FRONTEND_REPO' not found or empty"
    fi

    echo ""
}

# Delete all images from a specific repository
delete_repo_images() {
    local REPO_NAME=$1

    log_info "Deleting all images from $REPO_NAME..."

    # Get list of image IDs
    IMAGE_IDS=$(aws ecr list-images \
        --repository-name $REPO_NAME \
        --region $AWS_REGION \
        --query 'imageIds[*]' \
        --output json 2>/dev/null)

    if [ $? -ne 0 ]; then
        log_warning "Repository '$REPO_NAME' not found or already empty"
        return
    fi

    IMAGE_COUNT=$(echo $IMAGE_IDS | jq -r '. | length')

    if [ "$IMAGE_COUNT" -eq 0 ]; then
        log_info "Repository '$REPO_NAME' is already empty"
        return
    fi

    log_info "Found $IMAGE_COUNT image(s) to delete from $REPO_NAME"

    # Delete all images
    aws ecr batch-delete-image \
        --repository-name $REPO_NAME \
        --region $AWS_REGION \
        --image-ids "$IMAGE_IDS" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_success "Deleted $IMAGE_COUNT image(s) from $REPO_NAME"
    else
        log_error "Failed to delete images from $REPO_NAME"
    fi
}

# Delete all images from both repositories
delete_all_images() {
    echo ""
    log_warning "⚠️  WARNING: This will delete ALL images from ECR repositories!"
    echo ""
    echo "Repositories affected:"
    echo "  - $BACKEND_REPO"
    echo "  - $FRONTEND_REPO"
    echo ""

    # Show current images
    list_ecr_images

    read -p "Are you sure you want to delete all images? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        log_info "Deletion cancelled"
        exit 0
    fi

    echo ""
    log_info "Proceeding with deletion..."
    echo ""

    # Delete from backend repository
    delete_repo_images $BACKEND_REPO

    # Delete from frontend repository
    delete_repo_images $FRONTEND_REPO

    echo ""
    log_success "All images deleted from ECR repositories"
    echo ""
    log_info "Note: The repositories themselves still exist. To delete repositories:"
    echo "aws ecr delete-repository --repository-name $BACKEND_REPO --region $AWS_REGION --force"
    echo "aws ecr delete-repository --repository-name $FRONTEND_REPO --region $AWS_REGION --force"
}

# Delete repositories entirely
delete_repositories() {
    echo ""
    log_warning "⚠️  DANGER: This will delete the ECR repositories AND all their images!"
    echo ""
    echo "Repositories to be deleted:"
    echo "  - $BACKEND_REPO"
    echo "  - $FRONTEND_REPO"
    echo ""

    read -p "Type 'DELETE' to confirm repository deletion: " CONFIRM

    if [ "$CONFIRM" != "DELETE" ]; then
        log_info "Repository deletion cancelled"
        exit 0
    fi

    echo ""
    log_info "Deleting repositories..."
    echo ""

    # Delete backend repository
    aws ecr delete-repository \
        --repository-name $BACKEND_REPO \
        --region $AWS_REGION \
        --force > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_success "Deleted repository: $BACKEND_REPO"
    else
        log_warning "Failed to delete repository: $BACKEND_REPO (may not exist)"
    fi

    # Delete frontend repository
    aws ecr delete-repository \
        --repository-name $FRONTEND_REPO \
        --region $AWS_REGION \
        --force > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_success "Deleted repository: $FRONTEND_REPO"
    else
        log_warning "Failed to delete repository: $FRONTEND_REPO (may not exist)"
    fi

    echo ""
    log_success "Repository deletion complete"
}

# Show image information
show_info() {
    echo ""
    log_info "Image Information:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Backend Image:"
    echo "  $ECR_REGISTRY/$BACKEND_REPO:latest"
    echo ""
    echo "Frontend Image:"
    echo "  $ECR_REGISTRY/$FRONTEND_REPO:latest"
    echo ""
    echo "Platform: linux/amd64 (x86_64)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "To pull these images on EC2 (in us-east-2):"
    echo "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY"
    echo "docker pull $ECR_REGISTRY/$BACKEND_REPO:latest"
    echo "docker pull $ECR_REGISTRY/$FRONTEND_REPO:latest"
    echo ""
}

# Main execution
main() {
    echo "🚀 Pushing Omni Assistant to Amazon ECR"
    echo "=========================================="
    echo "Registry: $ECR_REGISTRY"
    echo "Region: $AWS_REGION"
    echo ""

    # Pre-flight checks
    check_docker
    verify_ecr_login

    # Build images
    build_backend
    build_frontend

    # Tag for ECR
    tag_images

    # Push to ECR
    push_images

    # Show information
    show_info

    log_success "All images pushed to ECR successfully! 🎉"
}

# Handle command line arguments
case "${1:-}" in
    "build-only")
        check_docker
        build_backend
        build_frontend
        log_success "Images built (not pushed to ECR)"
        ;;
    "push-only")
        check_docker
        verify_ecr_login
        tag_images
        push_images
        show_info
        log_success "Images pushed to ECR"
        ;;
    "backend-only")
        check_docker
        verify_ecr_login
        build_backend
        docker tag $BACKEND_REPO:latest $ECR_REGISTRY/$BACKEND_REPO:latest
        docker push $ECR_REGISTRY/$BACKEND_REPO:latest
        log_success "Backend image pushed to ECR"
        ;;
    "frontend-only")
        check_docker
        verify_ecr_login
        build_frontend
        docker tag $FRONTEND_REPO:latest $ECR_REGISTRY/$FRONTEND_REPO:latest
        docker push $ECR_REGISTRY/$FRONTEND_REPO:latest
        log_success "Frontend image pushed to ECR"
        ;;
    "list")
        verify_ecr_login
        list_ecr_images
        ;;
    "delete" | "cleanup")
        verify_ecr_login
        delete_all_images
        ;;
    "delete-repos")
        verify_ecr_login
        delete_repositories
        ;;
    "help")
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  (no option)       Build and push both images to ECR"
        echo "  build-only        Build images locally without pushing"
        echo "  push-only         Push already-built images to ECR"
        echo "  backend-only      Build and push only backend image"
        echo "  frontend-only     Build and push only frontend image"
        echo "  list              List all images in ECR repositories"
        echo "  delete|cleanup    Delete all images from ECR (keeps repos)"
        echo "  delete-repos      Delete ECR repositories entirely (⚠️  DANGER)"
        echo "  help              Show this help message"
        echo ""
        ;;
    *)
        main
        ;;
esac