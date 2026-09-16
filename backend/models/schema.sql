-- FishLensAI Database Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fish Species Reference Table
CREATE TABLE IF NOT EXISTS fish_species (
    id VARCHAR(50) PRIMARY KEY,
    common_name VARCHAR(100) NOT NULL,
    scientific_name VARCHAR(150) NOT NULL,
    family VARCHAR(100),
    diet TEXT,
    native_region TEXT,
    commercial_value TEXT,
    culinary_notes TEXT,
    optimal_temp_c VARCHAR(50),
    shelf_life_days INT,
    a_coeff NUMERIC(8, 6),
    b_coeff NUMERIC(6, 3),
    default_length_cm NUMERIC(6, 2),
    sample_image_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Scan Results & History Table (Designed for ML Outputs)
CREATE TABLE IF NOT EXISTS scan_results (
    id VARCHAR(100) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    species_id VARCHAR(50) REFERENCES fish_species(id) ON DELETE SET NULL,
    species_name VARCHAR(100) NOT NULL,
    species_scientific_name VARCHAR(150),
    species_confidence NUMERIC(5, 4) DEFAULT 0.0,
    freshness_status VARCHAR(20) NOT NULL,
    freshness_score NUMERIC(5, 2) DEFAULT 0.0,
    freshness_confidence NUMERIC(5, 4) DEFAULT 0.0,
    length_cm NUMERIC(6, 2),
    width_cm NUMERIC(6, 2),
    estimated_weight_kg NUMERIC(6, 3),
    estimated_volume_cm3 NUMERIC(8, 2),
    allometric_formula VARCHAR(100),
    image_uri TEXT,
    bounding_box JSONB,
    model_info JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON scan_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fish_species_common_name ON fish_species(common_name);
