#!/usr/bin/python
# -*- coding:utf-8 -*-
import sys
import os
import time
import logging
import shutil
from PIL import Image, ImageChops
import numpy as np

libdir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'lib')
if os.path.exists(libdir):
    sys.path.append(libdir)

try:
    from waveshare_epd import epd7in5_V2
except ImportError as e:
    print(f"Warning: waveshare_epd library not found. Running in simulation mode. Error: {e}")
    epd7in5_V2 = None

logging.basicConfig(level=logging.DEBUG)

SHARED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), 'shared')
IMAGE_PATH = os.path.join(SHARED_DIR, 'current_view.png')
PREVIOUS_IMAGE_PATH = os.path.join(SHARED_DIR, 'previous_view.png')
CHANGE_THRESHOLD = 0.015

def get_image_difference_percentage(img1, img2):
    """Calculates the percentage of different pixels between two images."""
    if img1.size != img2.size:
        return 1.0
    
    img1 = img1.convert('RGB')
    img2 = img2.convert('RGB')
    
    diff = ImageChops.difference(img1, img2)
    
    diff_data = np.array(diff)
    
    non_zero_pixels = np.count_nonzero(np.any(diff_data > 0, axis=2))
    
    total_pixels = img1.width * img1.height
    percentage = non_zero_pixels / total_pixels
    return percentage

def update_display(image_path, full_refresh=True):
    if epd7in5_V2 is None:
        logging.info(f"Simulation: Display updated with new image. Full refresh: {full_refresh}")
        return

    try:
        logging.info("Initializing e-Paper...")
        epd = epd7in5_V2.EPD()
        
        if full_refresh:
            logging.info("Mode: Standard Full Refresh")
            epd.init()
        else:
            logging.info("Mode: Fast Full Refresh")
            epd.init_fast()

        logging.info(f"Loading image: {image_path}")
        Himage = Image.open(image_path)
        
        if Himage.width != epd.width or Himage.height != epd.height:
             Himage = Himage.resize((epd.width, epd.height))

        Himage = Himage.convert('1') 

        logging.info("Displaying image...")
        epd.display(epd.getbuffer(Himage))
        
        logging.info("Sleeping display...")
        epd.sleep()
        
    except Exception as e:
        logging.error(f"Error updating display: {e}")
        # traceback.print_exc()

def main():
    logging.info("Starting Display Service...")
    
    if not os.path.exists(SHARED_DIR):
        os.makedirs(SHARED_DIR)

    last_update_time = 0
    update_count = 0
    
    while True:
        try:
            if os.path.exists(IMAGE_PATH):
                current_image = Image.open(IMAGE_PATH)
                
                should_update = False
                
                if os.path.exists(PREVIOUS_IMAGE_PATH):
                    try:
                        previous_image = Image.open(PREVIOUS_IMAGE_PATH)
                        diff_percent = get_image_difference_percentage(current_image, previous_image)
                        logging.debug(f"Image difference: {diff_percent:.2%}")
                        
                        if diff_percent > CHANGE_THRESHOLD:
                            logging.info(f"Change detected ({diff_percent:.2%} > {CHANGE_THRESHOLD:.2%}). Updating display.")
                            should_update = True
                        else:
                            logging.debug("Change below threshold. Skipping update.")
                    except Exception as e:
                        logging.error(f"Error comparing images: {e}")
                        should_update = True
                else:
                    logging.info("No previous image found. First run. Updating display.")
                    should_update = True

                if should_update:
                    update_count += 1
                    is_full_refresh = (update_count % 3 == 1)
                    update_display(IMAGE_PATH, full_refresh=is_full_refresh)

                    current_image.save(PREVIOUS_IMAGE_PATH)
            
            else:
                logging.info("Waiting for image source...")

            time.sleep(5)

        except KeyboardInterrupt:
            logging.info("Exiting...")
            if epd7in5_V2:
                epd7in5_V2.epdconfig.module_exit()
            break
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
