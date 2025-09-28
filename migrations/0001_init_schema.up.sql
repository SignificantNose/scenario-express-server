CREATE TABLE scenarios (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE emitters (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    z FLOAT NOT NULL,
    audio_file_uri TEXT
);

CREATE TABLE listeners (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    z FLOAT NOT NULL
);
