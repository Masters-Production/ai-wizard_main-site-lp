#!/bin/bash
# scripts/setup-server.sh
# Run this on your VPS to set up the LP Publisher

set -e

echo "=== LP Publisher Server Setup ==="

# Create directory structure
echo "Creating directories..."
sudo mkdir -p /var/www/brand1.com/lp
sudo mkdir -p /var/www/brand2.com/lp
sudo mkdir -p /var/www/preview/brand1/lp
sudo mkdir -p /var/www/preview/brand2/lp
sudo mkdir -p /tmp/lp-builds

# Set permissions
echo "Setting permissions..."
sudo chown -R $USER:$USER /var/www
sudo chown -R $USER:$USER /tmp/lp-builds

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Copy Nginx config
echo "Copying Nginx config..."
sudo cp nginx/lp-publisher.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/lp-publisher.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Start with PM2
echo "Starting LP Publisher..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "=== Setup Complete ==="
echo "Dashboard: http://admin.yourdomain.com"
echo ""
echo "Next steps:"
echo "1. Update /etc/nginx/sites-available/lp-publisher.conf with your domains"
echo "2. Run: sudo certbot --nginx (for SSL)"
echo "3. Update .env with your GitHub token and domains"
