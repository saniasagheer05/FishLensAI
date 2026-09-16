"""
FishLensAI - Model 3: Geometric Computer Vision Morphometric Estimator
- Reference Object Calibration (ArUco Marker DICT_4X4_50 / Indian Coins / Reference Scale)
- Fish Body Segmentation and Major Axis Length Extraction (PCA & Oriented Bounding Box)
- Allometric Weight Estimation: W = a * L^b (per species coefficients)
- Ellipsoid Volume Estimation: V = 4/3 * pi * (L/2) * (W/2) * (H/2)
"""

import math
from typing import Dict, Optional, Tuple
import cv2
import numpy as np

# Standard Reference Object Real-World Sizes (in cm)
DEFAULT_ARUCO_SIZE_CM = 5.0  # 5cm x 5cm printed marker
COIN_DIAMETERS_CM = {
    "inr_5": 2.30,   # Indian 5 Rupee Coin: 23mm
    "inr_2": 2.50,   # Indian 2 Rupee Coin: 25mm
    "inr_1": 2.19,   # Indian 1 Rupee Coin: 21.93mm
    "inr_10": 2.70,  # Indian 10 Rupee Coin: 27mm
}

# Allometric Species Parameters (aCoeff, bCoeff)
SPECIES_ALLOMETRIC_PARAMS = {
    "rohu": {"a": 0.0125, "b": 3.02, "default_length_cm": 38.0},
    "catla": {"a": 0.0142, "b": 2.98, "default_length_cm": 46.0},
    "tilapia": {"a": 0.0189, "b": 2.89, "default_length_cm": 28.0},
    "hilsa": {"a": 0.0098, "b": 3.12, "default_length_cm": 35.0},
    "mrigal": {"a": 0.0118, "b": 3.05, "default_length_cm": 34.0},
    "indian_mackerel": {"a": 0.0105, "b": 3.08, "default_length_cm": 25.0},
    "pomfret": {"a": 0.0210, "b": 2.92, "default_length_cm": 27.0},
}


class MorphometricEstimator:
    def __init__(self, aruco_dict_id=cv2.aruco.DICT_4X4_50):
        self.aruco_dict = cv2.aruco.getPredefinedDictionary(aruco_dict_id)
        self.aruco_params = cv2.aruco.DetectorParameters()
        self.detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.aruco_params)

    def detect_aruco_scale(
        self, img_bgr: np.ndarray, marker_real_size_cm: float = DEFAULT_ARUCO_SIZE_CM
    ) -> Optional[Tuple[float, np.ndarray]]:
        """
        Detects ArUco marker in the image and calculates cm_per_pixel scale factor.
        Returns (cm_per_pixel, marker_corners) or None if no marker found.
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        corners, ids, _ = self.detector.detectMarkers(gray)

        if ids is None or len(ids) == 0:
            return None

        # Take first detected marker (ID 0)
        marker_corners = corners[0][0]
        # Calculate pixel edge lengths for all 4 sides and average for perspective robustness
        side1 = np.linalg.norm(marker_corners[0] - marker_corners[1])
        side2 = np.linalg.norm(marker_corners[1] - marker_corners[2])
        side3 = np.linalg.norm(marker_corners[2] - marker_corners[3])
        side4 = np.linalg.norm(marker_corners[3] - marker_corners[0])
        avg_pixel_side = (side1 + side2 + side3 + side4) / 4.0

        if avg_pixel_side <= 0:
            return None

        cm_per_pixel = marker_real_size_cm / avg_pixel_side
        return cm_per_pixel, marker_corners

    def detect_coin_scale(
        self, img_bgr: np.ndarray, coin_type: str = "inr_5"
    ) -> Optional[Tuple[float, Tuple[int, int, int]]]:
        """
        Detects circular reference coin via Hough Circle Transform and computes cm_per_pixel scale.
        """
        real_diameter_cm = COIN_DIAMETERS_CM.get(coin_type, 2.30)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)

        # Detect circles
        rows = blurred.shape[0]
        circles = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=rows / 8,
            param1=100,
            param2=35,
            minRadius=15,
            maxRadius=120,
        )

        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            # Pick strongest circle
            best_circle = circles[0]
            radius_px = best_circle[2]
            diameter_px = radius_px * 2.0
            if diameter_px > 0:
                cm_per_pixel = real_diameter_cm / diameter_px
                return cm_per_pixel, (best_circle[0], best_circle[1], radius_px)

        return None

    def extract_fish_dimensions_px(
        self, img_bgr: np.ndarray, exclude_mask_rect: Optional[np.ndarray] = None
    ) -> Tuple[float, float, Tuple[int, int, int, int]]:
        """
        Extracts fish length and width in pixels using morphological segmentation & PCA.
        Returns: (length_px, width_px, (x, y, w, h) bounding box).
        """
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)

        # Otsu thresholding
        thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # If marker was found, mask out marker region to prevent it from skewing fish contour
        if exclude_mask_rect is not None:
            cv2.fillPoly(thresh, [exclude_mask_rect.astype(np.int32)], 0)

        # Morphological close to bridge gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Find largest contour
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            # Fallback to image proportions
            return float(w * 0.75), float(h * 0.28), (int(w * 0.1), int(h * 0.2), int(w * 0.8), int(h * 0.6))

        # Filter out tiny noise contours
        largest_contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_contour)
        if area < (w * h * 0.02):
            rect = cv2.minAreaRect(largest_contour)
            length_px = max(rect[1])
            width_px = min(rect[1])
            x, y, bw, bh = cv2.boundingRect(largest_contour)
            return float(length_px), float(width_px), (x, y, bw, bh)

        # Oriented Bounding Box via minAreaRect
        rect = cv2.minAreaRect(largest_contour)
        length_px = max(rect[1])
        width_px = min(rect[1])

        # PCA for robust axis determination along contour points
        pts = largest_contour.reshape(-1, 2).astype(np.float64)
        mean, eigenvectors = cv2.PCACompute(pts, mean=None)
        centered = pts - mean
        proj_major = np.dot(centered, eigenvectors[0])
        pca_length_px = np.max(proj_major) - np.min(proj_major)

        final_length_px = max(length_px, pca_length_px)
        final_width_px = max(width_px, final_length_px * 0.24)

        x, y, bw, bh = cv2.boundingRect(largest_contour)
        return float(final_length_px), float(final_width_px), (x, y, bw, bh)

    def estimate_morphometrics(
        self,
        img_bgr: np.ndarray,
        species_id: str = "rohu",
        marker_real_size_cm: float = DEFAULT_ARUCO_SIZE_CM,
        fallback_coin_type: str = "inr_5",
    ) -> Dict:
        """
        Complete end-to-end morphometric estimation pipeline:
        1. Attempts ArUco detection -> 2. Falls back to Coin detection -> 3. Standard framing scale
        4. Calculates Length, Width, Weight (W = a*L^b), and Volume (Ellipsoid).
        """
        h, w = img_bgr.shape[:2]
        species_params = SPECIES_ALLOMETRIC_PARAMS.get(
            species_id.lower(), SPECIES_ALLOMETRIC_PARAMS["rohu"]
        )

        scaling_method = "auto_framing"
        cm_per_pixel = None
        marker_corners = None

        # 1. Try ArUco Marker
        aruco_res = self.detect_aruco_scale(img_bgr, marker_real_size_cm)
        if aruco_res is not None:
            cm_per_pixel, marker_corners = aruco_res
            scaling_method = f"aruco_marker_{marker_real_size_cm}cm"
        else:
            # 2. Try Coin Detection
            coin_res = self.detect_coin_scale(img_bgr, fallback_coin_type)
            if coin_res is not None:
                cm_per_pixel, coin_info = coin_res
                scaling_method = f"coin_calibration_{fallback_coin_type}"

        # 3. Extract fish pixel geometry
        length_px, width_px, bbox = self.extract_fish_dimensions_px(img_bgr, marker_corners)

        # If no reference object was detected, use species canonical framing scale
        if cm_per_pixel is None or cm_per_pixel <= 0:
            canonical_length_cm = species_params["default_length_cm"]
            cm_per_pixel = canonical_length_cm / max(length_px, 100.0)
            scaling_method = "canonical_species_allometry_prior"

        length_cm = round(length_px * cm_per_pixel, 1)
        width_cm = round(width_px * cm_per_pixel, 1)

        # Sanity bounds check based on biology (length between 10cm and 120cm)
        length_cm = max(12.0, min(110.0, length_cm))
        width_cm = max(3.0, min(length_cm * 0.45, width_cm))

        # Weight Calculation: W (grams) = a * (L_cm)^b
        a = species_params["a"]
        b = species_params["b"]
        weight_grams = a * math.pow(length_cm, b)
        weight_kg = round(weight_grams / 1000.0, 2)

        # Ellipsoid Volume Calculation: V = 4/3 * pi * (L/2) * (W/2) * (H/2)
        height_cm = width_cm * 0.6
        volume_cm3 = round((4.0 / 3.0) * math.pi * (length_cm / 2.0) * (width_cm / 2.0) * (height_cm / 2.0), 1)

        return {
            "length_cm": length_cm,
            "width_cm": width_cm,
            "estimated_weight_kg": weight_kg,
            "estimated_weight_grams": round(weight_grams, 1),
            "estimated_volume_cm3": volume_cm3,
            "reference_scaling": scaling_method,
            "cm_per_pixel": round(cm_per_pixel, 5),
            "allometric_formula": f"W = {a} × L^{b}",
            "bounding_box": {
                "x": round(bbox[0] / w, 3),
                "y": round(bbox[1] / h, 3),
                "width": round(bbox[2] / w, 3),
                "height": round(bbox[3] / h, 3),
            },
        }
