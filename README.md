# e-Ink Home

Project to display a custom Home Assistant dashboard on a Waveshare 7.5" E-Ink display. It uses Node.js w/ Puppeteer to capture screenshots of the dashboard and a Python script to update the E-Ink display when changes happen. It's designed to help me a bit with avoiding forgetting to check my tasks and notifications.

## Architecture

1.  **Screenshot Service (`capture.js`)**:
    *   Runs a Chromium browser via Puppeteer.
    *   Logs into Home Assistant automatically.
    *   Continuously monitors the dashboard for visual changes using `pixelmatch`.
    *   Saves a new screenshot to `shared/current_view.png` when a change is detected.

2.  **Display Service (`display.py`)**:
    *   Monitors the shared directory for file updates.
    *   Updates the Waveshare E-Ink display.
    *   Switches between "Fast" and "Standard" refresh modes to avoid ghosting.

## Hardware Requirements

*   **Server/Device** to run the screenshot service (e.g., Raspberry Pi, PC). Note that it obviously needs to support the HAT.
*   **Waveshare 7.5inch e-Paper HAT (V2)**

## Software Requirements

*   **Node.js**
*   **Python 3**
*   **Chromium installed** (for Puppeteer)
*   **Home Assistant** instance (not required, you can just use any web page, but the project is optimized for HA of course)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/einkshenanigans.git
cd einkshenanigans
```

### 2. Setup Screenshot Service

```bash
npm install
```

Create a `.env` file:
```ini
CAPTURE_URL=your_url
HA_USERNAME=your_ha_username
HA_PASSWORD=your_ha_password
# Optional: Path to chromium if not standard Pi
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### 3. Setup Display Service
Install the required Python libraries:

```bash
pip3 install RPi.GPIO spidev Pillow numpy
```

*Note: You will also need the Waveshare e-Paper drivers. The repo already includes them in the `lib` directory.*

## Usage

### Running the Screenshot Service
```bash
node ./capture.js
```

### Running the Display Service
```bash
python3 ./display.py
```