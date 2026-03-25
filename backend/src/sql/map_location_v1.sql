-- Map location v1 for properties and tenants

ALTER TABLE properties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS units INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

CREATE INDEX IF NOT EXISTS idx_properties_lat_lng ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tenants_lat_lng ON tenants(latitude, longitude);
