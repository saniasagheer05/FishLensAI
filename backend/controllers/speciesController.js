const { query } = require('../config/db');

exports.getAllSpecies = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
        id, common_name, scientific_name, family, diet, native_region,
        commercial_value, culinary_notes, optimal_temp_c, shelf_life_days,
        a_coeff, b_coeff, default_length_cm, sample_image_uri, created_at
       FROM fish_species
       ORDER BY common_name ASC`
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSpeciesById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        id, common_name, scientific_name, family, diet, native_region,
        commercial_value, culinary_notes, optimal_temp_c, shelf_life_days,
        a_coeff, b_coeff, default_length_cm, sample_image_uri, created_at
       FROM fish_species
       WHERE LOWER(id) = LOWER($1)`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Species '${id}' not found.`,
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
