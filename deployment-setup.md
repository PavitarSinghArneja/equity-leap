 # Complete Deployment Setup for EquityLeap

  ## Files to Copy to Your Local Machine

  ### 1. Create `.github/workflows/deploy.yml`

  ```yaml
  name: Deploy to Production

  on:
    push:
      branches: [ main ]
    pull_request:
      branches: [ main ]

  jobs:
    deploy:
      runs-on: ubuntu-latest

      steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Build Docker image
        run: docker build -t equityleap-app .

      - name: Deploy to server
        if: github.ref == 'refs/heads/main'
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/your/app
            git pull origin main
            npm run build
            docker build -t equityleap-app .
            docker stop equityleap-container || true
            docker rm equityleap-container || true
            docker run -d --name equityleap-container -p 80:80 equityleap-app

  2. Fix Dockerfile

  # Build stage
  FROM node:18-alpine AS build

  WORKDIR /app

  # Copy package files
  COPY package*.json ./
  RUN npm ci --only=production

  # Copy source code
  COPY . .

  # Build the app
  RUN npm run build

  # Production stage
  FROM nginx:alpine

  # Copy built files
  COPY --from=build /app/dist /usr/share/nginx/html

  # Copy nginx configuration
  COPY nginx.conf /etc/nginx/conf.d/default.conf

  # Expose port 80
  EXPOSE 80

  CMD ["nginx", "-g", "daemon off;"]

  3. Create nginx.conf

  server {
      listen 80;
      server_name retreatslice.com www.retreatslice.com;
      root /usr/share/nginx/html;
      index index.html;

      # Handle React Router
      location / {
          try_files $uri $uri/ /index.html;
      }

      # Security headers
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;

      # Cache static files
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
          expires 1y;
          add_header Cache-Control "public, immutable";
      }

      # Gzip compression
      gzip on;
      gzip_types text/plain text/css application/json application/javascript
  text/xml application/xml application/xml+rss text/javascript;
  }

  4. Create docker-compose.yml (Optional, for easier local development)

  version: '3.8'

  services:
    equityleap:
      build: .
      ports:
        - "80:80"
      environment:
        - NODE_ENV=production
      restart: unless-stopped

  Setup Instructions

  Step 1: Copy Files to Your Local Machine

  1. Create the directory structure:
  mkdir -p .github/workflows
  2. Copy the following files to your local project:
    - .github/workflows/deploy.yml (GitHub Actions workflow)
    - Dockerfile (replace existing)
    - nginx.conf (new file)
    - docker-compose.yml (optional)

  Step 2: GitHub Secrets Setup

  In your GitHub repository settings, add these secrets:

  1. Go to Settings > Secrets and variables > Actions
  2. Add these secrets:
    - HOST: Your server IP address (e.g., 123.456.789.012)
    - USERNAME: Your server username (e.g., root or ubuntu)
    - SSH_KEY: Your private SSH key content

  Step 3: Server Setup (One-time)

  On your server where retreatslice.com is hosted:

  # Install Docker if not already installed
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh

  # Install Docker Compose
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docke
  r-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose

  # Clone your repository
  git clone https://github.com/PavitarSinghArneja/equity-leap.git
  cd equity-leap

  # Set up environment variables for production
  cp .env.example .env
  # Edit .env with your production values

  Step 4: Environment Variables Setup

  Create a .env file on your server with your production values:

  # Production Environment Variables
  VITE_SUPABASE_URL=https://fcyjlxrrjpiqxhgljmxi.supabase.co
  VITE_SUPABASE_ANON_KEY=your_actual_supabase_key_here
  NODE_ENV=production

  Step 5: First Deployment

  After copying all files to your local machine:

  # Commit and push the changes
  git add .
  git commit -m "Add deployment configuration"
  git push origin main

  How It Works

  1. When you push to main: GitHub Actions automatically triggers
  2. Build process: Installs dependencies, builds the project
  3. Docker build: Creates a production Docker image
  4. Deployment: SSHs to your server and deploys the new version
  5. Auto-restart: Stops old container, starts new one

  Local Testing

  To test locally before pushing:

  # Build the project
  npm run build

  # Build Docker image
  docker build -t equityleap-local .

  # Run locally
  docker run -p 8080:80 equityleap-local

  Visit http://localhost:8080 to test.

  Troubleshooting

  - Build fails: Check Node.js version and dependencies
  - Docker fails: Ensure Docker is installed and running
  - SSH fails: Verify SSH key and server access
  - App doesn't load: Check nginx logs: docker logs equityleap-container

  Benefits

  ✅ Automatic deployment on every push to main
  ✅ Production-optimized Docker image
  ✅ Nginx serving with proper configuration
  ✅ React Router support with fallback
  ✅ Security headers and gzip compression
  ✅ Easy rollbacks by reverting commits