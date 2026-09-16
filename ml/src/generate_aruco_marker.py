import cv2
import numpy as np

MARKER_ID = 0
MARKER_SIZE_PX = 600  # image resolution, not physical size
OUTPUT_PATH = "ml/models/aruco_marker_0.png"

aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
marker_img = np.zeros((MARKER_SIZE_PX, MARKER_SIZE_PX), dtype=np.uint8)
cv2.aruco.generateImageMarker(aruco_dict, MARKER_ID, MARKER_SIZE_PX, marker_img, 1)

cv2.imwrite(OUTPUT_PATH, marker_img)
print(f"[OK] Marker saved to: {OUTPUT_PATH}")
print("Print this at EXACTLY 5cm x 5cm (or update marker_real_size_cm in the detection script to match whatever size you print it at).")
print("Measure the printed marker with a ruler after printing to confirm the actual physical size — printer scaling can be inaccurate.")