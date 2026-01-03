#!/bin/bash

SERVICE_DIR="/etc/systemd/system"
CURRENT_DIR=$(pwd)
USER_NAME=$(whoami)

echo "Installing services..."

sed -i "s|WorkingDirectory=.*|WorkingDirectory=$CURRENT_DIR/../screenshot-service|g" eink-screenshot.service
sed -i "s|User=.*|User=$USER_NAME|g" eink-screenshot.service

sed -i "s|WorkingDirectory=.*|WorkingDirectory=$CURRENT_DIR/../display-service|g" eink-display.service
sed -i "s|User=.*|User=$USER_NAME|g" eink-display.service

NODE_PATH=$(which node)
PYTHON_PATH=$(which python3)
PNPM_PATH=$(which pnpm)

if [ -n "$PNPM_PATH" ]; then
    echo "pnpm found at $PNPM_PATH. Installing Node dependencies..."
    cd ../screenshot-service
    pnpm install
    cd ../systemd
elif [ -n "$(which npm)" ]; then
    echo "npm found. Installing Node dependencies..."
    cd ../screenshot-service
    npm install
    cd ../systemd
fi

if [ -n "$NODE_PATH" ]; then
    sed -i "s|ExecStart=.*|ExecStart=$NODE_PATH capture.js|g" eink-screenshot.service
fi

if [ -n "$PYTHON_PATH" ]; then
    sed -i "s|ExecStart=.*|ExecStart=$PYTHON_PATH display.py|g" eink-display.service
fi

echo "Configuration updated with current paths and user."

echo "Copying service files to $SERVICE_DIR..."
sudo cp eink-screenshot.service $SERVICE_DIR/
sudo cp eink-display.service $SERVICE_DIR/

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Enabling and starting services..."
sudo systemctl enable eink-screenshot.service
sudo systemctl enable eink-display.service
sudo systemctl restart eink-screenshot.service
sudo systemctl restart eink-display.service

echo "Done! Services are running."
echo "Check status with:"
echo "  sudo systemctl status eink-screenshot.service"
echo "  sudo systemctl status eink-display.service"
