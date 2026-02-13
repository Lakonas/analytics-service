CREATE TABLE events(
ID SERIAL PRIMARY KEY NOT NULL,
source VARCHAR (255),
event_type VARCHAR (255),
occurred_at TIMESTAMP NOT NULL,
metadata JSONB,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX idx_occurred_at ON events(occurred_at);
CREATE INDEX idx_source_occurred ON events(source, occurred_at);
CREATE INDEX idx_event_type_occurred ON events(event_type, occurred_at);