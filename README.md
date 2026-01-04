# e-Ink Home

Project to display a custom Home Assistant dashboard on a Waveshare 7.5" E-Ink display. It uses Node.js w/ Puppeteer to capture screenshots of the dashboard and a Python script to update the E-Ink display when changes happen. It's designed to help me a bit with avoiding forgetting to check my tasks and notifications.

## Architecture

1.  **Screenshot Service (`capture.js`)**:
    *   Runs a Chromium browser via Puppeteer.
    *   **Dynamic Configuration**: Fetches screen rotation rules, URLs, and schedules from a `device.json` file.
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
JSON_URL=http://path/to/your/device.json
# Optional: Fallback URL if JSON is unreachable
CAPTURE_URL=https://google.com
HA_USERNAME=your_ha_username
HA_PASSWORD=your_ha_password
# Optional: Path to chromium if not standard Pi
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### 3. Configuration (`device.json`)

You need to host or provide a `device.json` file that tells the service what to display.

```json
{
    "screens": [
        {
            "url": "http://homeassistant.local:8123/dashboard-eink/0?kiosk",
            "duration": 20
        },
        {
            "url": "http://homeassistant.local:8123/dashboard-eink/night?kiosk",
            "starttime": "22:00",
            "endtime": "06:00"
        }
    ],
    "randomize_screens": true,
    "json_refresh_interval": 3
}
```

*   **screens**: List of URLs to display.
    *   **duration**: (Optional, needs to be set if not using starttime/endtime) Minutes to display before rotating (default: 20).
    *   **starttime/endtime**: (Optional, needs to be set if not using duration) Time range (HH:MM) where this screen takes priority over rotation.
*   **randomize_screens**: If true, picks random screens instead of sequential order.
*   **json_refresh_interval**: Minutes between checking for config updates.

### 4. Setup Display Service
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