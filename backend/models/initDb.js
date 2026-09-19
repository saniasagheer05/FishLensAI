const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const initialSpecies = [
  {
    id: 'rohu',
    common_name: 'Rohu',
    scientific_name: 'Labeo rohita',
    family: 'Cyprinidae',
    diet: 'Herbivorous / Column feeder (Phytoplankton & algae)',
    native_region: 'South Asian river basins (Ganges, Indus, Brahmaputra) & Aquaculture',
    commercial_value: 'High commercial demand; premier Indian major carp',
    culinary_notes: 'Rich in Omega-3 fatty acids, mild sweet flavor, tender flaky meat.',
    optimal_temp_c: '0°C to 4°C',
    shelf_life_days: 4,
    a_coeff: 0.0125,
    b_coeff: 3.02,
    default_length_cm: 38.0,
    sample_image_uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
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
  },
  {
    id: 'tilapia',
    common_name: 'Tilapia',
    scientific_name: 'Oreochromis niloticus',
    family: 'Cichlidae',
    diet: 'Omnivorous (Aquatic plants, detritus, plankton)',
    native_region: 'Global aquaculture / Tropical freshwater and brackish bodies',
    commercial_value: 'High-volume commercial market, everyday staple',
    culinary_notes: 'Lean, delicate flavor with slightly sweet undertones.',
    optimal_temp_c: '0°C to 3°C',
    shelf_life_days: 5,
    a_coeff: 0.0189,
    b_coeff: 2.89,
    default_length_cm: 28.0,
    sample_image_uri: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=800&q=80',
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
  },
];

async function initializeDatabase() {
  console.log('[DB Init] Initializing database...');

  let appPool;

  if (process.env.DATABASE_URL) {
    console.log('[DB Init] Using DATABASE_URL connection string...');
    appPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  } else {
    const targetDb = process.env.DB_NAME || 'fishlensai';
    console.log(`[DB Init] Connecting to PostgreSQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}...`);

    // Step 1: Ensure database exists by connecting to default postgres database
    const adminPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres',
    });

    try {
      const checkRes = await adminPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [targetDb]
      );

      if (checkRes.rowCount === 0) {
        console.log(`[DB Init] Database "${targetDb}" does not exist. Creating...`);
        await adminPool.query(`CREATE DATABASE "${targetDb}"`);
        console.log(`[DB Init] Database "${targetDb}" created successfully.`);
      } else {
        console.log(`[DB Init] Database "${targetDb}" already exists.`);
      }
    } catch (err) {
      console.warn(`[DB Init] Notice when checking/creating database: ${err.message}`);
    } finally {
      await adminPool.end();
    }

    // Step 2: Connect to target database
    appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: targetDb,
    });
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('[DB Init] Executing schema DDL...');
    await appPool.query(schemaSql);
    console.log('[DB Init] Schema tables created successfully (users, fish_species, scan_results).');

    // Step 3: Seed initial fish species
    console.log('[DB Init] Seeding fish species catalogue...');
    for (const s of initialSpecies) {
      const insertSql = `
        INSERT INTO fish_species (
          id, common_name, scientific_name, family, diet, native_region,
          commercial_value, culinary_notes, optimal_temp_c, shelf_life_days,
          a_coeff, b_coeff, default_length_cm, sample_image_uri
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          common_name = EXCLUDED.common_name,
          scientific_name = EXCLUDED.scientific_name,
          family = EXCLUDED.family,
          diet = EXCLUDED.diet,
          native_region = EXCLUDED.native_region,
          commercial_value = EXCLUDED.commercial_value,
          culinary_notes = EXCLUDED.culinary_notes,
          optimal_temp_c = EXCLUDED.optimal_temp_c,
          shelf_life_days = EXCLUDED.shelf_life_days,
          a_coeff = EXCLUDED.a_coeff,
          b_coeff = EXCLUDED.b_coeff,
          default_length_cm = EXCLUDED.default_length_cm,
          sample_image_uri = EXCLUDED.sample_image_uri;
      `;
      await appPool.query(insertSql, [
        s.id, s.common_name, s.scientific_name, s.family, s.diet, s.native_region,
        s.commercial_value, s.culinary_notes, s.optimal_temp_c, s.shelf_life_days,
        s.a_coeff, s.b_coeff, s.default_length_cm, s.sample_image_uri,
      ]);
    }
    console.log(`[DB Init] Successfully seeded ${initialSpecies.length} fish species.`);
    console.log('[DB Init] Database initialization complete!');
  } catch (err) {
    console.error('[DB Init] Error during database initialization:', err);
    throw err;
  } finally {
    await appPool.end();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };
