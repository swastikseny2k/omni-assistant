#!/bin/bash

# Kubernetes Setup Script for Omni Assistant
# This script installs Kubernetes on a server and prepares it for deployment

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Check if sudo is available
check_sudo() {
    if ! sudo -n true 2>/dev/null; then
        log_error "This script requires sudo privileges. Please ensure your user has sudo access."
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        VERSION=$(sw_vers -productVersion)
    elif [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "Cannot detect OS. This script supports macOS, Ubuntu, Debian, CentOS, and RHEL."
        exit 1
    fi
    
    log_info "Detected OS: $OS $VERSION"
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    
    case $OS in
        macos)
            # Check if Homebrew is installed
            if ! command -v brew &> /dev/null; then
                log_info "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew update
            brew upgrade
            ;;
        ubuntu|debian)
            sudo apt-get update -y
            sudo apt-get upgrade -y
            sudo apt-get install -y curl wget gnupg lsb-release apt-transport-https ca-certificates
            ;;
        centos|rhel|rocky|almalinux)
            sudo yum update -y
            sudo yum install -y curl wget gnupg2
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac
    
    log_success "System packages updated"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker is already installed"
        return
    fi
    
    case $OS in
        macos)
            # Install Docker Desktop for macOS
            if ! command -v brew &> /dev/null; then
                log_error "Homebrew is required for macOS installation. Please install Homebrew first."
                exit 1
            fi
            brew install --cask docker
            log_warning "Docker Desktop has been installed. Please start Docker Desktop from Applications folder."
            log_warning "You may need to restart your terminal after starting Docker Desktop."
            ;;
        ubuntu|debian)
            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Add Docker repository
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            sudo apt-get update -y
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        centos|rhel|rocky|almalinux)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
    esac
    
    # Start and enable Docker (not needed for macOS Docker Desktop)
    if [[ "$OS" != "macos" ]]; then
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add current user to docker group
        sudo usermod -aG docker $USER
        
        log_success "Docker installed successfully"
        log_warning "Please log out and log back in for Docker group changes to take effect"
    else
        log_success "Docker Desktop installed successfully"
    fi
}

# Install kubectl
install_kubectl() {
    log_info "Installing kubectl..."
    
    if command -v kubectl &> /dev/null; then
        log_info "kubectl is already installed"
        return
    fi
    
    case $OS in
        macos)
            if ! command -v brew &> /dev/null; then
                log_error "Homebrew is required for macOS installation. Please install Homebrew first."
                exit 1
            fi
            brew install kubectl
            ;;
        *)
            # Download kubectl for Linux
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
            chmod +x kubectl
            sudo mv kubectl /usr/local/bin/
            ;;
    esac
    
    log_success "kubectl installed successfully"
}

# Install kubeadm, kubelet, and kubectl
install_kubernetes() {
    log_info "Installing Kubernetes components..."
    
    case $OS in
        macos)
            log_info "For macOS, we'll use Docker Desktop's built-in Kubernetes or Minikube"
            if ! command -v brew &> /dev/null; then
                log_error "Homebrew is required for macOS installation. Please install Homebrew first."
                exit 1
            fi
            
            # Install Minikube for local Kubernetes development
            brew install minikube
            log_success "Minikube installed successfully"
            log_info "You can start Minikube with: minikube start"
            ;;
        ubuntu|debian)
            # Add Kubernetes repository
            curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
            echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
            
            sudo apt-get update -y
            sudo apt-get install -y kubelet kubeadm kubectl
            sudo apt-mark hold kubelet kubeadm kubectl
            ;;
        centos|rhel|rocky|almalinux)
            # Add Kubernetes repository
            cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/repodata/repomd.xml.key
EOF
            sudo yum install -y kubelet kubeadm kubectl
            sudo systemctl enable kubelet
            ;;
    esac
    
    log_success "Kubernetes components installed"
}

# Configure system for Kubernetes
configure_system() {
    log_info "Configuring system for Kubernetes..."
    
    case $OS in
        macos)
            log_info "macOS configuration is handled by Docker Desktop and Minikube"
            log_success "System configured for Kubernetes (macOS)"
            ;;
        *)
            # Disable swap
            sudo swapoff -a
            sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
            
            # Configure kernel parameters
            cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
            
            sudo modprobe overlay
            sudo modprobe br_netfilter
            
            # Configure sysctl
            cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
            
            sudo sysctl --system
            
            log_success "System configured for Kubernetes"
            ;;
    esac
}

# Initialize Kubernetes cluster
init_cluster() {
    log_info "Initializing Kubernetes cluster..."
    
    case $OS in
        macos)
            log_info "Starting Minikube cluster..."
            minikube start --driver=docker
            minikube status
            log_success "Minikube cluster initialized"
            ;;
        *)
            # Get the server's IP address
            SERVER_IP=$(hostname -I | awk '{print $1}')
            
            # Initialize the cluster
            sudo kubeadm init \
                --pod-network-cidr=10.244.0.0/16 \
                --apiserver-advertise-address=$SERVER_IP \
                --control-plane-endpoint=$SERVER_IP
            
            # Configure kubectl for regular user
            mkdir -p $HOME/.kube
            sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
            sudo chown $(id -u):$(id -g) $HOME/.kube/config
            
            log_success "Kubernetes cluster initialized"
            ;;
    esac
}

# Install CNI (Container Network Interface)
install_cni() {
    log_info "Installing Flannel CNI..."
    
    case $OS in
        macos)
            log_info "Minikube includes its own CNI, skipping Flannel installation"
            log_success "CNI is ready (Minikube)"
            ;;
        *)
            # Install Flannel
            kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
            
            # Wait for pods to be ready
            log_info "Waiting for CNI pods to be ready..."
            kubectl wait --for=condition=ready pod -l app=flannel -n kube-flannel --timeout=300s
            
            log_success "CNI installed successfully"
            ;;
    esac
}

# Remove taint from master node to allow scheduling
remove_master_taint() {
    log_info "Removing taint from master node to allow pod scheduling..."
    
    case $OS in
        macos)
            log_info "Minikube allows pod scheduling by default, skipping taint removal"
            log_success "Pod scheduling enabled (Minikube)"
            ;;
        *)
            kubectl taint nodes --all node-role.kubernetes.io/control-plane-
            log_success "Master node taint removed"
            ;;
    esac
}

# Install Helm
install_helm() {
    log_info "Installing Helm..."
    
    if command -v helm &> /dev/null; then
        log_info "Helm is already installed"
        return
    fi
    
    case $OS in
        macos)
            if ! command -v brew &> /dev/null; then
                log_error "Homebrew is required for macOS installation. Please install Homebrew first."
                exit 1
            fi
            brew install helm
            ;;
        *)
            curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
            ;;
    esac
    
    log_success "Helm installed successfully"
}

# Create namespace for the application
create_namespace() {
    log_info "Creating namespace for Omni Assistant..."
    
    kubectl create namespace omni-assistant --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Namespace 'omni-assistant' created"
}

# Display cluster information
show_cluster_info() {
    log_info "Kubernetes cluster information:"
    echo ""
    echo "Cluster Status:"
    kubectl cluster-info
    echo ""
    echo "Node Status:"
    kubectl get nodes
    echo ""
    echo "Pod Status:"
    kubectl get pods --all-namespaces
    echo ""
    echo "Services:"
    kubectl get services --all-namespaces
}

# Create deployment templates
create_deployment_templates() {
    log_info "Creating deployment templates for Omni Assistant..."
    
    # Create directory for Kubernetes manifests
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

    log_success "Deployment templates created in k8s-manifests/ directory"
}

# Main installation function
main() {
    echo "🚀 Kubernetes Setup Script for Omni Assistant"
    echo "=============================================="
    echo ""
    
    # Pre-flight checks
    check_root
    check_sudo
    detect_os
    
    # Installation steps
    update_system
    install_docker
    install_kubectl
    install_kubernetes
    configure_system
    
    # Initialize cluster
    log_info "Initializing Kubernetes cluster..."
    init_cluster
    
    # Post-installation setup
    install_cni
    remove_master_taint
    install_helm
    create_namespace
    create_deployment_templates
    
    # Show cluster information
    show_cluster_info
    
    echo ""
    log_success "Kubernetes setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Build and push your Docker images:"
    echo "   docker build -t omni-assistant:latest ."
    echo "   docker build -t omni-assistant-frontend:latest ./frontend"
    echo ""
    echo "2. Deploy your application:"
    echo "   kubectl apply -f k8s-manifests/"
    echo ""
    echo "3. Check deployment status:"
    echo "   kubectl get pods -n omni-assistant"
    echo "   kubectl get services -n omni-assistant"
    echo ""
    echo "4. Access your application:"
    echo "   kubectl get services -n omni-assistant"
    echo ""
    
    if [[ "$OS" == "macos" ]]; then
        log_warning "For macOS users:"
        echo "- Make sure Docker Desktop is running"
        echo "- Minikube is now available: minikube start"
        echo "- To access services: minikube service <service-name> -n omni-assistant"
        echo "- To get Minikube IP: minikube ip"
    else
        log_warning "Remember to log out and log back in for Docker group changes to take effect!"
    fi
}

# Cleanup function - removes everything installed by this script
cleanup() {
    echo "🧹 Kubernetes Cleanup Script"
    echo "============================="
    echo ""
    
    detect_os
    
    log_warning "⚠️  WARNING: This will remove ALL Kubernetes components!"
    echo ""
    echo "This will remove:"
    echo "  - Kubernetes cluster and all deployments"
    echo "  - kubectl, kubeadm, kubelet"
    echo "  - Docker/containerd (optional)"
    echo "  - Helm"
    echo "  - All configuration files"
    echo ""
    
    read -p "Are you sure you want to continue? Type 'YES' to confirm: " CONFIRM
    
    if [ "$CONFIRM" != "YES" ]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    
    echo ""
    log_info "Starting cleanup process..."
    echo ""
    
    case $OS in
        macos)
            cleanup_macos
            ;;
        ubuntu|debian)
            cleanup_ubuntu
            ;;
        centos|rhel|rocky|almalinux)
            cleanup_rhel
            ;;
        *)
            log_error "Unsupported OS for cleanup: $OS"
            exit 1
            ;;
    esac
    
    log_success "Cleanup completed! 🎉"
    echo ""
    log_info "Note: You may need to reboot your system to complete the cleanup."
}

# Cleanup for macOS
cleanup_macos() {
    log_info "Cleaning up Kubernetes on macOS..."
    
    # Stop and delete minikube
    if command -v minikube &> /dev/null; then
        log_info "Stopping and deleting Minikube..."
        minikube stop 2>/dev/null || true
        minikube delete 2>/dev/null || true
        
        # Uninstall minikube
        log_info "Uninstalling Minikube..."
        brew uninstall minikube 2>/dev/null || true
        log_success "Minikube removed"
    fi
    
    # Remove kubectl
    if command -v kubectl &> /dev/null; then
        log_info "Uninstalling kubectl..."
        brew uninstall kubectl 2>/dev/null || true
        log_success "kubectl removed"
    fi
    
    # Remove Helm
    if command -v helm &> /dev/null; then
        log_info "Uninstalling Helm..."
        brew uninstall helm 2>/dev/null || true
        log_success "Helm removed"
    fi
    
    # Remove configuration files
    log_info "Removing configuration files..."
    rm -rf ~/.kube 2>/dev/null || true
    rm -rf ~/.minikube 2>/dev/null || true
    
    # Ask about Docker
    echo ""
    read -p "Do you want to remove Docker Desktop as well? (y/n): " REMOVE_DOCKER
    if [ "$REMOVE_DOCKER" = "y" ] || [ "$REMOVE_DOCKER" = "Y" ]; then
        log_info "Uninstalling Docker Desktop..."
        brew uninstall --cask docker 2>/dev/null || true
        rm -rf ~/Library/Containers/com.docker.docker 2>/dev/null || true
        rm -rf ~/Library/Application\ Support/Docker\ Desktop 2>/dev/null || true
        log_success "Docker Desktop removed"
    fi
    
    log_success "macOS cleanup completed"
}

# Cleanup for Ubuntu/Debian
cleanup_ubuntu() {
    log_info "Cleaning up Kubernetes on Ubuntu/Debian..."
    
    # Stop kubelet service
    if systemctl is-active --quiet kubelet 2>/dev/null; then
        log_info "Stopping kubelet service..."
        sudo systemctl stop kubelet
    fi
    
    # Reset kubeadm cluster
    if command -v kubeadm &> /dev/null; then
        log_info "Resetting Kubernetes cluster..."
        sudo kubeadm reset -f 2>/dev/null || true
        log_success "Cluster reset"
    fi
    
    # Remove Kubernetes packages
    log_info "Removing Kubernetes packages..."
    sudo apt-mark unhold kubelet kubeadm kubectl 2>/dev/null || true
    sudo apt-get purge -y kubeadm kubectl kubelet kubernetes-cni 2>/dev/null || true
    sudo apt-get autoremove -y 2>/dev/null || true
    log_success "Kubernetes packages removed"
    
    # Remove Helm
    if command -v helm &> /dev/null; then
        log_info "Removing Helm..."
        sudo rm -f /usr/local/bin/helm 2>/dev/null || true
        log_success "Helm removed"
    fi
    
    # Remove configuration and data directories
    log_info "Removing configuration files and data..."
    sudo rm -rf ~/.kube 2>/dev/null || true
    sudo rm -rf /etc/kubernetes 2>/dev/null || true
    sudo rm -rf /var/lib/etcd 2>/dev/null || true
    sudo rm -rf /var/lib/kubelet 2>/dev/null || true
    sudo rm -rf /var/lib/cni 2>/dev/null || true
    sudo rm -rf /etc/cni 2>/dev/null || true
    sudo rm -rf /opt/cni 2>/dev/null || true
    log_success "Configuration files removed"
    
    # Remove CNI plugins
    log_info "Removing CNI plugins..."
    sudo rm -rf /opt/cni/bin 2>/dev/null || true
    
    # Remove iptables rules
    log_info "Cleaning up iptables rules..."
    sudo iptables -F 2>/dev/null || true
    sudo iptables -t nat -F 2>/dev/null || true
    sudo iptables -t mangle -F 2>/dev/null || true
    sudo iptables -X 2>/dev/null || true
    
    # Remove Kubernetes repository
    log_info "Removing Kubernetes repository..."
    sudo rm -f /etc/apt/sources.list.d/kubernetes.list 2>/dev/null || true
    sudo rm -f /etc/apt/keyrings/kubernetes-apt-keyring.gpg 2>/dev/null || true
    sudo apt-get update 2>/dev/null || true
    
    # Ask about Docker/containerd
    echo ""
    read -p "Do you want to remove Docker/containerd as well? (y/n): " REMOVE_DOCKER
    if [ "$REMOVE_DOCKER" = "y" ] || [ "$REMOVE_DOCKER" = "Y" ]; then
        log_info "Removing Docker and containerd..."
        sudo systemctl stop docker 2>/dev/null || true
        sudo systemctl stop containerd 2>/dev/null || true
        
        sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
        sudo apt-get autoremove -y 2>/dev/null || true
        
        sudo rm -rf /var/lib/docker 2>/dev/null || true
        sudo rm -rf /var/lib/containerd 2>/dev/null || true
        sudo rm -rf /etc/docker 2>/dev/null || true
        sudo rm -f /etc/apt/sources.list.d/docker.list 2>/dev/null || true
        sudo rm -f /etc/apt/keyrings/docker.gpg 2>/dev/null || true
        
        # Remove user from docker group
        sudo deluser $USER docker 2>/dev/null || true
        
        log_success "Docker and containerd removed"
    fi
    
    log_success "Ubuntu/Debian cleanup completed"
}

# Cleanup for RHEL/CentOS
cleanup_rhel() {
    log_info "Cleaning up Kubernetes on RHEL/CentOS..."
    
    # Stop kubelet service
    if systemctl is-active --quiet kubelet 2>/dev/null; then
        log_info "Stopping kubelet service..."
        sudo systemctl stop kubelet
    fi
    
    # Reset kubeadm cluster
    if command -v kubeadm &> /dev/null; then
        log_info "Resetting Kubernetes cluster..."
        sudo kubeadm reset -f 2>/dev/null || true
        log_success "Cluster reset"
    fi
    
    # Remove Kubernetes packages
    log_info "Removing Kubernetes packages..."
    sudo yum remove -y kubeadm kubectl kubelet kubernetes-cni 2>/dev/null || true
    sudo yum autoremove -y 2>/dev/null || true
    log_success "Kubernetes packages removed"
    
    # Remove Helm
    if command -v helm &> /dev/null; then
        log_info "Removing Helm..."
        sudo rm -f /usr/local/bin/helm 2>/dev/null || true
        log_success "Helm removed"
    fi
    
    # Remove configuration and data directories
    log_info "Removing configuration files and data..."
    sudo rm -rf ~/.kube 2>/dev/null || true
    sudo rm -rf /etc/kubernetes 2>/dev/null || true
    sudo rm -rf /var/lib/etcd 2>/dev/null || true
    sudo rm -rf /var/lib/kubelet 2>/dev/null || true
    sudo rm -rf /var/lib/cni 2>/dev/null || true
    sudo rm -rf /etc/cni 2>/dev/null || true
    sudo rm -rf /opt/cni 2>/dev/null || true
    log_success "Configuration files removed"
    
    # Remove iptables rules
    log_info "Cleaning up iptables rules..."
    sudo iptables -F 2>/dev/null || true
    sudo iptables -t nat -F 2>/dev/null || true
    sudo iptables -t mangle -F 2>/dev/null || true
    sudo iptables -X 2>/dev/null || true
    
    # Remove Kubernetes repository
    log_info "Removing Kubernetes repository..."
    sudo rm -f /etc/yum.repos.d/kubernetes.repo 2>/dev/null || true
    sudo yum clean all 2>/dev/null || true
    
    # Ask about Docker/containerd
    echo ""
    read -p "Do you want to remove Docker/containerd as well? (y/n): " REMOVE_DOCKER
    if [ "$REMOVE_DOCKER" = "y" ] || [ "$REMOVE_DOCKER" = "Y" ]; then
        log_info "Removing Docker and containerd..."
        sudo systemctl stop docker 2>/dev/null || true
        sudo systemctl stop containerd 2>/dev/null || true
        
        sudo yum remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
        sudo yum autoremove -y 2>/dev/null || true
        
        sudo rm -rf /var/lib/docker 2>/dev/null || true
        sudo rm -rf /var/lib/containerd 2>/dev/null || true
        sudo rm -rf /etc/docker 2>/dev/null || true
        sudo rm -f /etc/yum.repos.d/docker-ce.repo 2>/dev/null || true
        
        # Remove user from docker group
        sudo gpasswd -d $USER docker 2>/dev/null || true
        
        log_success "Docker and containerd removed"
    fi
    
    log_success "RHEL/CentOS cleanup completed"
}

# Handle command line arguments
case "${1:-}" in
    "cleanup")
        cleanup
        ;;
    "help")
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Kubernetes Setup Script for Omni Assistant"
        echo ""
        echo "Options:"
        echo "  (no option)       Install and setup Kubernetes"
        echo "  cleanup           Remove all Kubernetes components"
        echo "  help              Show this help message"
        echo ""
        echo "Supported platforms:"
        echo "  - macOS (using Minikube)"
        echo "  - Ubuntu/Debian"
        echo "  - RHEL/CentOS/Rocky/AlmaLinux"
        echo ""
        ;;
    *)
        main
        ;;
esac
