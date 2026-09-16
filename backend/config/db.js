const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'fishlensai',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isPgAvailable = null;

// Fallback in-memory storage when PostgreSQL authentication is pending
const inMemoryDb = {
  users: [],
  fish_species: [
    {
      id: 'rohu',
      common_name: 'Rohu',
      scientific_name: 'Labeo rohita',
      family: 'Cyprinidae',
      diet: 'Herbivorous / Column feeder (Phytoplankton & algae)',
      native_region: 'South Asian river basins & Aquaculture',
      commercial_value: 'High commercial demand; premier Indian major carp',
      culinary_notes: 'Rich in Omega-3 fatty acids, mild sweet flavor, tender flaky meat.',
      optimal_temp_c: '0°C to 4°C',
      shelf_life_days: 4,
      a_coeff: 0.0125,
      b_coeff: 3.02,
      default_length_cm: 38.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'catla',
      common_name: 'Catla',
      scientific_name: 'Catla catla',
      family: 'Cyprinidae',
      diet: 'Surface feeder (Zooplankton & micro-crustaceans)',
      native_region: 'Freshwater rivers, lakes, and reservoirs across South Asia',
      commercial_value: 'Premium table fish; highly prized for head cuts',
      culinary_notes: 'Firm white meat with large distinct flakes.',
      optimal_temp_c: '0°C to 4°C',
      shelf_life_days: 3,
      a_coeff: 0.0142,
      b_coeff: 2.98,
      default_length_cm: 46.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'tilapia',
      common_name: 'Tilapia',
      scientific_name: 'Oreochromis niloticus',
      family: 'Cichlidae',
      diet: 'Omnivorous (Aquatic plants, detritus, plankton)',
      native_region: 'Global aquaculture / Tropical freshwater',
      commercial_value: 'High-volume commercial market, everyday staple',
      culinary_notes: 'Lean, delicate flavor with slightly sweet undertones.',
      optimal_temp_c: '0°C to 3°C',
      shelf_life_days: 5,
      a_coeff: 0.0189,
      b_coeff: 2.89,
      default_length_cm: 28.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'hilsa',
      common_name: 'Hilsa',
      scientific_name: 'Tenualosa ilisha',
      family: 'Clupeidae',
      diet: 'Plankton feeder / Anadromous marine & riverine',
      native_region: 'Bay of Bengal, Arabian Sea, Padma & Hooghly estuaries',
      commercial_value: 'Highest value cultural delicacy in South Asian seafood',
      culinary_notes: 'Exceptionally tender, oily meat with distinct aroma.',
      optimal_temp_c: '0°C to 2°C',
      shelf_life_days: 3,
      a_coeff: 0.0108,
      b_coeff: 3.12,
      default_length_cm: 42.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mrigal',
      common_name: 'Mrigal',
      scientific_name: 'Cirrhinus mrigala',
      family: 'Cyprinidae',
      diet: 'Bottom feeder (Detritus, decaying organic matter)',
      native_region: 'Major river networks and freshwater aquaculture ponds',
      commercial_value: 'High staple market presence alongside Rohu and Catla',
      culinary_notes: 'Lean texture with subtle earthy taste.',
      optimal_temp_c: '0°C to 4°C',
      shelf_life_days: 4,
      a_coeff: 0.0131,
      b_coeff: 2.95,
      default_length_cm: 36.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'pomfret',
      common_name: 'Pomfret',
      scientific_name: 'Pampus argenteus',
      family: 'Stromateidae',
      diet: 'Pelagic feeder (Copepods, salps, small jellyfish)',
      native_region: 'Indo-West Pacific coastal marine waters',
      commercial_value: 'High-end commercial table fish; restaurant favorite',
      culinary_notes: 'Buttery texture, delicate fine white flesh.',
      optimal_temp_c: '0°C to 2°C',
      shelf_life_days: 3,
      a_coeff: 0.0215,
      b_coeff: 2.84,
      default_length_cm: 25.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'indian_mackerel',
      common_name: 'Indian Mackerel',
      scientific_name: 'Rastrelliger kanagurta',
      family: 'Scombridae',
      diet: 'Microscopic plankton & larval crustaceans',
      native_region: 'Indian Ocean coastal belts & shelf waters',
      commercial_value: 'Popular high-volume marine catch',
      culinary_notes: 'Strong robust flavor, nutrient-dense oily fish.',
      optimal_temp_c: '0°C to 2°C',
      shelf_life_days: 2,
      a_coeff: 0.0098,
      b_coeff: 3.18,
      default_length_cm: 22.0,
      sample_image_uri: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
    },
  ],
  scan_results: [],
};

pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool Warning]:', err.message);
});

const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as db');
    isPgAvailable = true;
    return {
      connected: true,
      database: res.rows[0].db,
      timestamp: res.rows[0].now,
      mode: 'PostgreSQL Live',
    };
  } catch (error) {
    isPgAvailable = false;
    return {
      connected: false,
      error: error.message,
      mode: 'Standby Store (Update DB_PASSWORD in backend/.env to connect live PostgreSQL)',
    };
  }
};

const query = async (text, params = []) => {
  // If PostgreSQL is verified or not yet tested, attempt live query first
  if (isPgAvailable !== false) {
    try {
      const res = await pool.query(text, params);
      isPgAvailable = true;
      return res;
    } catch (err) {
      if (err.code === '28P01' || err.code === 'ECONNREFUSED' || err.code === '3D000') {
        isPgAvailable = false;
      } else {
        throw err;
      }
    }
  }

  // Resilient fallback logic when PostgreSQL credentials are being configured
  const sql = text.trim();

  // Users insert
  if (sql.startsWith('INSERT INTO users')) {
    const [username, email, password_hash] = params;
    const user = {
      id: inMemoryDb.users.length + 1,
      username,
      email,
      password_hash,
      created_at: new Date().toISOString(),
    };
    inMemoryDb.users.push(user);
    return { rows: [user], rowCount: 1 };
  }

  // Users select by email or username
  if (sql.includes('FROM users WHERE email = $1 OR username = $2')) {
    const [email, username] = params;
    const found = inMemoryDb.users.filter(u => u.email === email || u.username === username);
    return { rows: found, rowCount: found.length };
  }

  // Users select by email
  if (sql.includes('FROM users WHERE email = $1')) {
    const [email] = params;
    const found = inMemoryDb.users.filter(u => u.email === email);
    return { rows: found, rowCount: found.length };
  }

  // Users select by id
  if (sql.includes('FROM users WHERE id = $1')) {
    const [id] = params;
    const found = inMemoryDb.users.filter(u => u.id === id);
    return { rows: found, rowCount: found.length };
  }

  // Fish Species by id
  if (sql.includes('FROM fish_species') && sql.includes('LOWER(id)')) {
    const [id] = params;
    const found = inMemoryDb.fish_species.filter(s => s.id.toLowerCase() === id.toLowerCase());
    return { rows: found, rowCount: found.length };
  }

  // Fish Species list
  if (sql.includes('FROM fish_species') && !sql.includes('WHERE')) {
    return { rows: inMemoryDb.fish_species, rowCount: inMemoryDb.fish_species.length };
  }

  // Scan Results insert
  if (sql.startsWith('INSERT INTO scan_results')) {
    const [
      id, user_id, species_id, species_name, species_scientific_name,
      species_confidence, freshness_status, freshness_score, freshness_confidence,
      length_cm, width_cm, estimated_weight_kg, estimated_volume_cm3,
      allometric_formula, image_uri, bounding_box, model_info, created_at
    ] = params;

    const scan = {
      id,
      user_id,
      species_id,
      species_name,
      species_scientific_name,
      species_confidence,
      freshness_status,
      freshness_score,
      freshness_confidence,
      length_cm,
      width_cm,
      estimated_weight_kg,
      estimated_volume_cm3,
      allometric_formula,
      image_uri,
      bounding_box: bounding_box ? JSON.parse(bounding_box) : null,
      model_info: model_info ? JSON.parse(model_info) : null,
      created_at: created_at.toISOString ? created_at.toISOString() : created_at,
    };

    inMemoryDb.scan_results.unshift(scan);
    return { rows: [scan], rowCount: 1 };
  }

  // Scan Results list
  if (sql.startsWith('SELECT * FROM scan_results')) {
    return { rows: inMemoryDb.scan_results, rowCount: inMemoryDb.scan_results.length };
  }

  // Scan Results count
  if (sql.startsWith('SELECT COUNT(*) FROM scan_results')) {
    return { rows: [{ count: inMemoryDb.scan_results.length.toString() }], rowCount: 1 };
  }

  // Scan Results by id
  if (sql.includes('FROM scan_results WHERE id = $1')) {
    const [id] = params;
    const found = inMemoryDb.scan_results.filter(s => s.id === id);
    return { rows: found, rowCount: found.length };
  }

  // Scan Results delete by id
  if (sql.startsWith('DELETE FROM scan_results WHERE id = $1')) {
    const [id] = params;
    const initialLen = inMemoryDb.scan_results.length;
    inMemoryDb.scan_results = inMemoryDb.scan_results.filter(s => s.id !== id);
    const deletedCount = initialLen - inMemoryDb.scan_results.length;
    return { rows: [{ id }], rowCount: deletedCount };
  }

  // Scan Results delete all
  if (sql.startsWith('DELETE FROM scan_results')) {
    const count = inMemoryDb.scan_results.length;
    inMemoryDb.scan_results = [];
    return { rows: [], rowCount: count };
  }

  return { rows: [], rowCount: 0 };
};

module.exports = {
  pool,
  query,
  testConnection,
  inMemoryDb,
};
