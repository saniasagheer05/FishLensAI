const { query } = require('../config/db');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');

/**
 * Resolves the Python executable across platforms (Windows, Linux, macOS)
 * and hosting environments (Render, local dev, Docker).
 */
function getPythonExecutable() {
  // 1. Check explicit environment variables
  if (process.env.PYTHON_PATH) {
    if (fs.existsSync(process.env.PYTHON_PATH) || !path.isAbsolute(process.env.PYTHON_PATH)) {
      return process.env.PYTHON_PATH;
    }
  }
  if (process.env.PYTHON_EXE) {
    if (fs.existsSync(process.env.PYTHON_EXE) || !path.isAbsolute(process.env.PYTHON_EXE)) {
      return process.env.PYTHON_EXE;
    }
  }

  const isWin = process.platform === 'win32';

  // Candidate roots where virtual environments could be located
  const searchRoots = [
    PROJECT_ROOT,
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '.'),
    '/opt/render/project/src',
  ];

  if (isWin) {
    const winRelPaths = [
      'tflite_env/Scripts/python.exe',
      '.venv/Scripts/python.exe',
      'venv/Scripts/python.exe',
    ];
    for (const root of searchRoots) {
      for (const rel of winRelPaths) {
        const full = path.join(root, rel);
        if (fs.existsSync(full)) {
          return full;
        }
      }
    }
    return 'python.exe';
  }

  // Linux / Render candidates
  const linuxRelPaths = [
    'tflite_env/bin/python',
    'tflite_env/bin/python3',
    '.venv/bin/python',
    '.venv/bin/python3',
    'venv/bin/python',
    'venv/bin/python3',
  ];

  for (const root of searchRoots) {
    for (const rel of linuxRelPaths) {
      const full = path.join(root, rel);
      if (fs.existsSync(full)) {
        return full;
      }
    }
  }

  // Common Linux system paths (including Render)
  const systemPaths = [
    '/opt/render/project/src/tflite_env/bin/python',
    '/opt/render/project/src/tflite_env/bin/python3',
    '/usr/bin/python3',
    '/usr/local/bin/python3',
    '/usr/bin/python',
    '/usr/local/bin/python',
  ];

  for (const sysPath of systemPaths) {
    if (fs.existsSync(sysPath)) {
      return sysPath;
    }
  }

  return 'python3';
}

/**
 * Resolves the path to ml/src/predict_unified.py across local and cloud environments
 */
function getPredictScript() {
  const candidates = [
    path.join(PROJECT_ROOT, 'ml/src/predict_unified.py'),
    path.resolve(__dirname, '../../ml/src/predict_unified.py'),
    path.resolve(__dirname, '../ml/src/predict_unified.py'),
    '/opt/render/project/src/ml/src/predict_unified.py',
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }
  return path.join(PROJECT_ROOT, 'ml/src/predict_unified.py');
}

exports.analyzeScan = async (req, res, next) => {
  let tempFilePath = null;
  try {
    const { image_uri, image_data } = req.body;
    const rawImage = image_data || image_uri;

    if (!rawImage) {
      return res.status(400).json({
        success: false,
        message: 'image_uri or image_data is required for analysis.',
      });
    }

    let inputPathForPython = rawImage;

    // 1. Handle base64 / data URI directly (length > 300 or data: prefix)
    if (rawImage.startsWith('data:') || rawImage.length > 300) {
      let b64 = rawImage;
      if (b64.includes(',')) {
        b64 = b64.split(',')[1];
      }
      b64 = b64.trim();
      const buffer = Buffer.from(b64, 'base64');
      tempFilePath = path.join(os.tmpdir(), `fishlens_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`);
      fs.writeFileSync(tempFilePath, buffer);
      inputPathForPython = tempFilePath;
    } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      // 2. Remote HTTP/HTTPS URL
      const resp = await fetch(rawImage);
      const arrayBuf = await resp.arrayBuffer();
      tempFilePath = path.join(os.tmpdir(), `fishlens_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`);
      fs.writeFileSync(tempFilePath, Buffer.from(arrayBuf));
      inputPathForPython = tempFilePath;
    } else if (rawImage.startsWith('file://')) {
      // 3. Client device URI without base64 data
      return res.status(400).json({
        success: false,
        message: `Client device URI received without valid image_data base64 payload: ${rawImage}`,
      });
    } else {
      // 4. Server-side local path
      if (!path.isAbsolute(inputPathForPython)) {
        const candidate = path.resolve(PROJECT_ROOT, inputPathForPython);
        if (fs.existsSync(candidate)) {
          inputPathForPython = candidate;
        }
      }
      if (!fs.existsSync(inputPathForPython)) {
        return res.status(400).json({
          success: false,
          message: `Image file does not exist on server: ${inputPathForPython}`,
        });
      }
    }

    // Execute predict_unified.py via dynamically resolved Python executable
    const pythonExe = getPythonExecutable();
    const predictScript = getPredictScript();
    console.log(`[analyzeScan] Invoking inference via: "${pythonExe}" "${predictScript}"`);

    execFile(pythonExe, [predictScript, inputPathForPython], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }

      if (error) {
        console.error('[analyzeScan Error]:', error, stderr);
        return res.status(500).json({
          success: false,
          message: `Inference failed: ${error.message}`,
          details: stderr || stdout || '',
          pythonExe,
          predictScript,
        });
      }

      try {
        // Find last non-empty line of stdout which contains the JSON output
        const lines = stdout.trim().split('\n').map(l => l.trim()).filter(Boolean);
        const jsonLine = lines.reverse().find(l => l.startsWith('{') && l.endsWith('}'));
        if (!jsonLine) {
          throw new Error(`Invalid JSON output from model runner: ${stdout}`);
        }

        const modelResult = JSON.parse(jsonLine);
        if (!modelResult.success) {
          return res.status(500).json({
            success: false,
            message: modelResult.error || 'Model inference failed',
          });
        }

        const scanId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        return res.json({
          success: true,
          data: {
            id: scanId,
            imageUri: image_uri || rawImage,
            species: modelResult.species,
            freshness: modelResult.freshness,
            morphometrics: modelResult.morphometrics,
            boundingBox: modelResult.boundingBox,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (parseErr) {
        console.error('[analyzeScan parse error]:', parseErr, stdout);
        return res.status(500).json({
          success: false,
          message: `Failed to parse inference output: ${parseErr.message}`,
          rawOutput: stdout,
        });
      }
    });
  } catch (err) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    next(err);
  }
};

exports.createScan = async (req, res, next) => {
  try {
    const {
      id,
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
      bounding_box,
      model_info,
      timestamp,
    } = req.body;

    if (!species_name || !freshness_status) {
      return res.status(400).json({
        success: false,
        message: 'species_name and freshness_status are required.',
      });
    }

    const scanId = id || `scan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const userId = req.user ? req.user.id : null;
    const createdAt = timestamp ? new Date(timestamp) : new Date();

    const validSpecies = ['rohu', 'catla', 'tilapia', 'hilsa', 'mrigal', 'pomfret', 'indian_mackerel'];
    const cleanSpeciesId = (species_id && validSpecies.includes(species_id.toLowerCase()))
      ? species_id.toLowerCase()
      : null;

    const insertSql = `
      INSERT INTO scan_results (
        id, user_id, species_id, species_name, species_scientific_name,
        species_confidence, freshness_status, freshness_score, freshness_confidence,
        length_cm, width_cm, estimated_weight_kg, estimated_volume_cm3,
        allometric_formula, image_uri, bounding_box, model_info, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        species_id = EXCLUDED.species_id,
        species_name = EXCLUDED.species_name,
        species_scientific_name = EXCLUDED.species_scientific_name,
        species_confidence = EXCLUDED.species_confidence,
        freshness_status = EXCLUDED.freshness_status,
        freshness_score = EXCLUDED.freshness_score,
        freshness_confidence = EXCLUDED.freshness_confidence,
        length_cm = EXCLUDED.length_cm,
        width_cm = EXCLUDED.width_cm,
        estimated_weight_kg = EXCLUDED.estimated_weight_kg,
        estimated_volume_cm3 = EXCLUDED.estimated_volume_cm3,
        allometric_formula = EXCLUDED.allometric_formula,
        image_uri = EXCLUDED.image_uri,
        bounding_box = EXCLUDED.bounding_box,
        model_info = EXCLUDED.model_info,
        created_at = EXCLUDED.created_at
      RETURNING *
    `;

    const values = [
      scanId,
      userId,
      cleanSpeciesId,
      species_name,
      species_scientific_name || null,
      species_confidence !== undefined ? Number(species_confidence) : 0,
      freshness_status,
      freshness_score !== undefined ? Number(freshness_score) : 0,
      freshness_confidence !== undefined ? Number(freshness_confidence) : 0,
      length_cm !== undefined ? Number(length_cm) : null,
      width_cm !== undefined ? Number(width_cm) : null,
      estimated_weight_kg !== undefined ? Number(estimated_weight_kg) : null,
      estimated_volume_cm3 !== undefined ? Number(estimated_volume_cm3) : null,
      allometric_formula || null,
      image_uri || null,
      bounding_box ? JSON.stringify(bounding_box) : null,
      model_info ? JSON.stringify(model_info) : null,
      createdAt,
    ];

    const result = await query(insertSql, values);

    return res.status(201).json({
      success: true,
      message: 'Scan result saved successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.getScanHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const offset = parseInt(req.query.offset || '0', 10);
    const userId = req.user ? req.user.id : null;

    let sql = 'SELECT * FROM scan_results';
    const params = [];

    if (userId) {
      sql += ' WHERE user_id = $1 OR user_id IS NULL';
      params.push(userId);
      sql += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      sql += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const result = await query(sql, params);

    // Count total
    const countSql = userId
      ? 'SELECT COUNT(*) FROM scan_results WHERE user_id = $1 OR user_id IS NULL'
      : 'SELECT COUNT(*) FROM scan_results';
    const countRes = await query(countSql, userId ? [userId] : []);
    const total = parseInt(countRes.rows[0].count, 10);

    return res.json({
      success: true,
      count: result.rows.length,
      total,
      limit,
      offset,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

exports.getScanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM scan_results WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Scan '${id}' not found.`,
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteScan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM scan_results WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Scan '${id}' not found or already deleted.`,
      });
    }

    return res.json({
      success: true,
      message: `Scan '${id}' deleted successfully.`,
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

exports.clearHistory = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;

    if (userId) {
      await query('DELETE FROM scan_results WHERE user_id = $1', [userId]);
    } else {
      await query('DELETE FROM scan_results');
    }

    return res.json({
      success: true,
      message: 'Scan history cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
};
