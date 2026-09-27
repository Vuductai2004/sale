-- P5 controlled autonomy, tenant provisioning and connector state.
-- All tenant-scoped writes remain subject to the same RLS context as 0005. The
-- sole cross-tenant bootstrap path is the SECURITY DEFINER function at the end
-- of this migration.

CREATE TABLE agentos.tenants (
  tenant_id UUID PRIMARY KEY DEFAULT agentos.uuid_generate_v7(),
  status TEXT NOT NULL CHECK (status = 'PROVISIONED'),
  display_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key CHAR(64) NOT NULL UNIQUE,
  request_fingerprint CHAR(64) NOT NULL
);

CREATE TABLE agentos.tenant_workspaces (
  tenant_id UUID PRIMARY KEY REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  admin_binding_ref VARCHAR(128) NOT NULL,
  status TEXT NOT NULL CHECK (status = 'UNCONFIGURED')
);

CREATE TABLE agentos.tenant_capabilities (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  capability_id VARCHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status = 'UNCONFIGURED'),
  PRIMARY KEY (tenant_id, capability_id)
);

CREATE TABLE agentos.connector_configurations (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  connector_id VARCHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('UNBOUND', 'DISABLED')),
  secret_ref VARCHAR(128),
  PRIMARY KEY (tenant_id, connector_id)
);

CREATE TABLE agentos.autonomy_policies (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  skill_id VARCHAR(128) NOT NULL,
  policy_version VARCHAR(64) NOT NULL,
  policy_id UUID NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('MINIMUM', 'PROMOTED', 'PAUSED', 'DEMOTED')),
  previous_approved_state TEXT NOT NULL CHECK (previous_approved_state IN ('MINIMUM', 'PROMOTED', 'PAUSED', 'DEMOTED')),
  evidence_window_ref VARCHAR(128),
  approver_id VARCHAR(128),
  reason TEXT NOT NULL,
  parameters JSONB NOT NULL,
  provenance JSONB NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  rollback_policy_version VARCHAR(64) NOT NULL,
  rollback_state TEXT NOT NULL,
  audit_ref VARCHAR(128),
  evidence_ref VARCHAR(128),
  PRIMARY KEY (tenant_id, skill_id, policy_version)
);

CREATE TABLE agentos.autonomy_policy_events (
  event_id UUID PRIMARY KEY DEFAULT agentos.uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  skill_id VARCHAR(128) NOT NULL,
  policy_version VARCHAR(64) NOT NULL,
  trigger TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  actor VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  audit_ref VARCHAR(128),
  snapshot JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agentos.autonomy_control_events (
  event_id UUID PRIMARY KEY DEFAULT agentos.uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  actor VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  skill_id VARCHAR(128),
  policy_version VARCHAR(64),
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE agentos.tenant_autonomy_controls (
  tenant_id UUID PRIMARY KEY REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT FALSE,
  actor VARCHAR(128),
  reason TEXT,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agentos.unresolved_owner_inputs (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  input_id VARCHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status = 'UNRESOLVED'),
  PRIMARY KEY (tenant_id, input_id)
);

CREATE TABLE agentos.namespace_bindings (
  tenant_id UUID PRIMARY KEY REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  redis_prefix TEXT NOT NULL,
  vector_filter TEXT NOT NULL,
  storage_prefix TEXT NOT NULL
);

CREATE TABLE agentos.token_cost_records (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  record_id UUID NOT NULL,
  run_id VARCHAR(128) NOT NULL,
  correlation_id VARCHAR(128) NOT NULL,
  model VARCHAR(128),
  provider VARCHAR(128),
  input_tokens INT,
  output_tokens INT,
  cached_tokens INT,
  estimated_cost_amount NUMERIC,
  currency VARCHAR(8),
  cost_status TEXT NOT NULL CHECK (cost_status IN ('RECORDED', 'UNAVAILABLE')),
  provenance JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, record_id)
);

CREATE TABLE agentos.shopify_installations (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  shop_domain VARCHAR(255) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'BOUND', 'REVOKED')),
  state_token_hash CHAR(64),
  secret_ref VARCHAR(128),
  installed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, shop_domain)
);

CREATE TABLE agentos.shopify_webhook_deliveries (
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  delivery_id VARCHAR(128) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, delivery_id)
);

CREATE TABLE agentos.residency_configurations (
  tenant_id UUID PRIMARY KEY REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  region VARCHAR(64),
  status TEXT NOT NULL CHECK (status IN ('UNRESOLVED', 'CONFIGURED'))
);

CREATE TABLE agentos.provisioning_events (
  event_id UUID PRIMARY KEY DEFAULT agentos.uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES agentos.tenants (tenant_id) ON DELETE RESTRICT,
  idempotency_key CHAR(64) NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_autonomy_policy_events_skill
  ON agentos.autonomy_policy_events (tenant_id, skill_id, policy_version, occurred_at, event_id);
CREATE INDEX idx_token_cost_records_run
  ON agentos.token_cost_records (tenant_id, run_id, recorded_at, record_id);
CREATE INDEX idx_provisioning_events_tenant_time
  ON agentos.provisioning_events (tenant_id, occurred_at, event_id);

-- Every P5 table is tenant isolated. Keep this predicate byte-for-byte aligned
-- with 0005_cross_domain_handoffs.sql.
ALTER TABLE agentos.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.tenants
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.tenant_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.tenant_workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.tenant_workspaces
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.tenant_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.tenant_capabilities FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.tenant_capabilities
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.connector_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.connector_configurations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.connector_configurations
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.autonomy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.autonomy_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.autonomy_policies
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.autonomy_policy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.autonomy_policy_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.autonomy_policy_events
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.tenant_autonomy_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.tenant_autonomy_controls FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.tenant_autonomy_controls
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.autonomy_control_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.autonomy_control_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.autonomy_control_events
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.unresolved_owner_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.unresolved_owner_inputs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.unresolved_owner_inputs
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.namespace_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.namespace_bindings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.namespace_bindings
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.token_cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.token_cost_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.token_cost_records
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.shopify_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.shopify_installations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.shopify_installations
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.shopify_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.shopify_webhook_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.shopify_webhook_deliveries
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.residency_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.residency_configurations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.residency_configurations
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

ALTER TABLE agentos.provisioning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentos.provisioning_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON agentos.provisioning_events
  AS PERMISSIVE FOR ALL
  USING (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]))
  WITH CHECK (tenant_id = ANY (string_to_array(current_setting('app.current_tenant_id', true), ',')::uuid[]));

GRANT SELECT ON agentos.tenants TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.tenant_workspaces TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.tenant_capabilities TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.connector_configurations TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.autonomy_policies TO agentos_app;
GRANT SELECT, INSERT ON agentos.autonomy_policy_events TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.tenant_autonomy_controls TO agentos_app;
GRANT SELECT, INSERT ON agentos.autonomy_control_events TO agentos_app;
GRANT SELECT, INSERT ON agentos.unresolved_owner_inputs TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.namespace_bindings TO agentos_app;
GRANT SELECT, INSERT ON agentos.token_cost_records TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.shopify_installations TO agentos_app;
GRANT SELECT, INSERT ON agentos.shopify_webhook_deliveries TO agentos_app;
GRANT SELECT, INSERT, UPDATE ON agentos.residency_configurations TO agentos_app;
GRANT SELECT, INSERT ON agentos.provisioning_events TO agentos_app;

REVOKE DELETE, TRUNCATE ON agentos.tenants FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.tenant_workspaces FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.tenant_capabilities FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.connector_configurations FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.autonomy_policies FROM agentos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON agentos.autonomy_policy_events FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.tenant_autonomy_controls FROM agentos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON agentos.autonomy_control_events FROM agentos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON agentos.unresolved_owner_inputs FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.namespace_bindings FROM agentos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON agentos.token_cost_records FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.shopify_installations FROM agentos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON agentos.shopify_webhook_deliveries FROM agentos_app;
REVOKE DELETE, TRUNCATE ON agentos.residency_configurations FROM agentos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON agentos.provisioning_events FROM agentos_app;

CREATE OR REPLACE FUNCTION agentos.provision_tenant_shell(
  p_idempotency_key CHAR(64),
  p_request_fingerprint CHAR(64),
  p_display_name VARCHAR(128)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agentos, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_existing_fingerprint CHAR(64);
  v_capability_id TEXT;
  v_agent_code TEXT;
  v_connector_id TEXT;
  v_skill_id TEXT;
  v_owner_input TEXT;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'idempotency_key must be a lowercase SHA-256 digest' USING ERRCODE = '22023';
  END IF;
  IF p_request_fingerprint IS NULL OR p_request_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'request_fingerprint must be a lowercase SHA-256 digest' USING ERRCODE = '22023';
  END IF;
  IF p_display_name IS NULL OR btrim(p_display_name) = '' THEN
    RAISE EXCEPTION 'display_name is required' USING ERRCODE = '22023';
  END IF;

  SELECT tenant_id, request_fingerprint
    INTO v_tenant_id, v_existing_fingerprint
    FROM agentos.tenants
   WHERE idempotency_key = p_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_fingerprint <> p_request_fingerprint THEN
      RAISE EXCEPTION 'idempotency key is already bound to another request fingerprint'
        USING ERRCODE = '23505', CONSTRAINT = 'tenants_idempotency_key_key';
    END IF;
    RETURN v_tenant_id;
  END IF;

  INSERT INTO agentos.tenants (status, display_name, idempotency_key, request_fingerprint)
  VALUES ('PROVISIONED', p_display_name, p_idempotency_key, p_request_fingerprint)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING tenant_id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id, request_fingerprint
      INTO v_tenant_id, v_existing_fingerprint
      FROM agentos.tenants
     WHERE idempotency_key = p_idempotency_key
     FOR UPDATE;
    IF v_existing_fingerprint <> p_request_fingerprint THEN
      RAISE EXCEPTION 'idempotency key is already bound to another request fingerprint'
        USING ERRCODE = '23505', CONSTRAINT = 'tenants_idempotency_key_key';
    END IF;
    RETURN v_tenant_id;
  END IF;

  INSERT INTO agentos.tenant_workspaces (tenant_id, admin_binding_ref, status)
  VALUES (v_tenant_id, 'tenant:' || v_tenant_id::TEXT, 'UNCONFIGURED');

  FOREACH v_agent_code IN ARRAY ARRAY[
    'MKT-01', 'MKT-02', 'MKT-03', 'MKT-04', 'MKT-05', 'MKT-06',
    'SAL-01', 'SAL-02', 'SAL-03', 'SAL-04', 'SAL-05',
    'CS-01', 'CS-02'
  ] LOOP
    INSERT INTO agentos.agents (tenant_id, code, name, domain, assigned_authority, is_active)
    VALUES (
      v_tenant_id,
      v_agent_code,
      v_agent_code,
      CASE
        WHEN v_agent_code LIKE 'MKT-%' THEN 'marketing'
        WHEN v_agent_code LIKE 'SAL-%' THEN 'sales'
        ELSE 'support'
      END,
      'AUTH-0',
      FALSE
    );
  END LOOP;

  FOREACH v_capability_id IN ARRAY ARRAY['care', 'sales', 'marketing'] LOOP
    INSERT INTO agentos.tenant_capabilities (tenant_id, capability_id, status)
    VALUES (v_tenant_id, v_capability_id, 'UNCONFIGURED');
  END LOOP;

  FOREACH v_connector_id IN ARRAY ARRAY['API-001', 'API-002', 'API-003', 'ADPT-GL-001', 'ADPT-GL-002', 'ADPT-GL-003', 'SHOPIFY'] LOOP
    INSERT INTO agentos.connector_configurations (tenant_id, connector_id, status)
    VALUES (v_tenant_id, v_connector_id, 'UNBOUND');
  END LOOP;

  FOREACH v_owner_input IN ARRAY ARRAY[
    'ASM-001', 'ASM-002', 'ASM-003', 'ASM-004', 'FLOOR_POLICY', 'REFUND_POLICY',
    'RETENTION_POLICY', 'KPI_BASELINE', 'PROVIDER_CREDENTIALS', 'RESIDENCY_REGION', 'PROMOTION_LIMITS'
  ] LOOP
    INSERT INTO agentos.unresolved_owner_inputs (tenant_id, input_id, status)
    VALUES (v_tenant_id, v_owner_input, 'UNRESOLVED');
  END LOOP;

  INSERT INTO agentos.namespace_bindings (tenant_id, redis_prefix, vector_filter, storage_prefix)
  VALUES (
    v_tenant_id,
    'tenant:' || v_tenant_id::TEXT,
    'tenant_id=' || v_tenant_id::TEXT,
    'tenant/' || v_tenant_id::TEXT
  );

  INSERT INTO agentos.residency_configurations (tenant_id, status)
  VALUES (v_tenant_id, 'UNRESOLVED');

  INSERT INTO agentos.tenant_autonomy_controls (tenant_id, paused, kill_switch)
  VALUES (v_tenant_id, FALSE, FALSE);

  FOREACH v_skill_id IN ARRAY ARRAY[
    'skill.sales.check_stock', 'skill.sales.search_product', 'skill.sales.retrieve_customer',
    'skill.care.search_faq', 'skill.mkt.segment_audience', 'skill.mkt.generate_content'
  ] LOOP
    INSERT INTO agentos.autonomy_policies (
      tenant_id, skill_id, policy_version, policy_id, state, previous_approved_state,
      reason, parameters, provenance, effective_at, rollback_policy_version, rollback_state
    ) VALUES (
      v_tenant_id, v_skill_id, 'MINIMUM', agentos.uuid_generate_v7(), 'MINIMUM', 'MINIMUM',
      'SAFE_MINIMUM', '{}'::jsonb,
      '{"source":"SERVER_POLICY","decision":"SAFE_MINIMUM"}'::jsonb,
      CURRENT_TIMESTAMP, 'MINIMUM', 'MINIMUM'
    );
  END LOOP;

  INSERT INTO agentos.provisioning_events (tenant_id, idempotency_key, event_type, payload)
  VALUES (
    v_tenant_id, p_idempotency_key, 'TENANT_PROVISIONED',
    jsonb_build_object('tenant_id', v_tenant_id)
  );

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION agentos.provision_tenant_shell(CHAR(64), CHAR(64), VARCHAR(128)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agentos.provision_tenant_shell(CHAR(64), CHAR(64), VARCHAR(128)) TO agentos_app;
