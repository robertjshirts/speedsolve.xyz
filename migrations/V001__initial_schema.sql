CREATE TABLE IF NOT EXISTS migrations (
    version integer PRIMARY KEY,
    description varchar(100) NOT NULL,
    applied_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    checksum integer NOT NULL,
    success bool NOT NULL
);

INSERT INTO migrations (version, description, checksum, success) VALUES
( 1, 'initial_schema', 0, true);