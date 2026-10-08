// NOTE: This file is not currently imported anywhere in the mobile app.
// The project uses MongoDB (via the Express backend), not PostgreSQL directly.
// Kept for reference. If re-enabled, use environment variables for credentials.
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'orderOnCampus',
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
});