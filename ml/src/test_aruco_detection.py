import cv2
import numpy as np

def detect_aruco_marker(image_path, marker_real_size_cm=5.0):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    detector = cv2.aruco.ArucoDetector(aruco_dict, cv2.aruco.DetectorParameters())
    corners, ids, _ = detector.detectMarkers(gray)

    if ids is None:
        print("No marker detected.")
        return None

    marker_corners = corners[0][0]
    pixel_side_length = np.linalg.norm(marker_corners[0] - marker_corners[1])
    cm_per_pixel = marker_real_size_cm / pixel_side_length

    print(f"Marker detected. Pixel side length: {pixel_side_length:.2f}px")
    print(f"Scale: {cm_per_pixel:.4f} cm/pixel")
    return cm_per_pixel

if __name__ == "__main__":
    import sys
    detect_aruco_marker(sys.argv[1])