CREATE TABLE IF NOT EXISTS operators (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(32) NOT NULL,
  source_operator_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY operators_source_id_unique (source, source_operator_id)
);

CREATE TABLE IF NOT EXISTS routes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(32) NOT NULL,
  source_route_id VARCHAR(191) NOT NULL,
  operator_id BIGINT UNSIGNED,
  route_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY routes_source_id_unique (source, source_route_id),
  CONSTRAINT routes_operator_fk FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(32) NOT NULL,
  source_vehicle_id VARCHAR(191) NOT NULL,
  operator_id BIGINT UNSIGNED,
  registration VARCHAR(32),
  fleet_number VARCHAR(64),
  vehicle_type VARCHAR(64),
  first_seen_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY vehicles_source_id_unique (source, source_vehicle_id),
  CONSTRAINT vehicles_operator_fk FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS provider_status (
  provider VARCHAR(32) NOT NULL PRIMARY KEY,
  last_attempt_at DATETIME(3),
  last_success_at DATETIME(3),
  last_error TEXT,
  last_vehicle_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_fetch_duration_ms INT UNSIGNED
);
