const { query } = require('../config/db');

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

    const insertSql = `
      INSERT INTO scan_results (
        id, user_id, species_id, species_name, species_scientific_name,
        species_confidence, freshness_status, freshness_score, freshness_confidence,
        length_cm, width_cm, estimated_weight_kg, estimated_volume_cm3,
        allometric_formula, image_uri, bounding_box, model_info, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING *
    `;

    const values = [
      scanId,
      userId,
      species_id || null,
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
