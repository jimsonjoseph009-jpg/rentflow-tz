-- Property discovery features: persistent favorites + saved searches + alert logs

CREATE TABLE IF NOT EXISTS property_favorites (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS saved_property_searches (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  query TEXT,
  sort_by VARCHAR(40) NOT NULL DEFAULT 'name_asc',
  last_seen_property_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_search_alert_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_id INT NOT NULL REFERENCES saved_property_searches(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, search_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_property_favorites_user_created
  ON property_favorites(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_property_searches_user_created
  ON saved_property_searches(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_search_alert_logs_user_created
  ON property_search_alert_logs(user_id, created_at DESC);

