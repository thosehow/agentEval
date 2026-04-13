DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agenteval_app') THEN
    CREATE ROLE agenteval_app LOGIN PASSWORD 'agenteval_app';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agenteval_agent') THEN
    CREATE ROLE agenteval_agent LOGIN PASSWORD 'agenteval_agent';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE agenteval TO agenteval_app;
GRANT CONNECT ON DATABASE agenteval TO agenteval_agent;
GRANT CREATE ON DATABASE agenteval TO agenteval_app;
ALTER ROLE agenteval_agent SET default_transaction_read_only = on;

\connect agenteval

GRANT USAGE ON SCHEMA public TO agenteval_app;
GRANT CREATE ON SCHEMA public TO agenteval_app;
GRANT USAGE ON SCHEMA public TO agenteval_agent;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agenteval_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO agenteval_app;
