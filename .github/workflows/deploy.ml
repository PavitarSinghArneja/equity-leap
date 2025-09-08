name: Deploy to Hostinger KVM

on:
  push:
    branches:
      - main  # Change this if your deploy branch is different

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /root/equity-leap
            git pull origin main
            # restart services if needed, e.g.:
            # systemctl restart nginx