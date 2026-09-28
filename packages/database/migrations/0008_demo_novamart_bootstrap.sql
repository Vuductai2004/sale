-- NovaMart demo tenant shell bootstrap for local/CI three-agent demonstration.
-- Provisions the fixed synthetic tenant UUID 99999999-9999-4999-8999-999999999999
-- with the same safe AUTH-0 / UNCONFIGURED / UNBOUND / MINIMUM baseline as 0006,
-- without overwriting existing tenant or capability state on replay.

CREATE OR REPLACE FUNCTION agentos.provision_novamart_demo_tenant(
  p_idempotency_key CHAR(64),
  p_request_fingerprint CHAR(64)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agentos, pg_temp
AS $$
DECLARE
  c_tenant_id CONSTANT UUID := '99999999-9999-4999-8999-999999999999'::UUID;
  c_display_name CONSTANT VARCHAR(128) := 'NovaMart Demo';
  c_provisioning_event_id CONSTANT UUID := '99999999-9999-4999-8999-999999999901'::UUID;
  v_existing_tenant_id UUID;
  v_existing_status TEXT;
  v_existing_display_name VARCHAR(128);
  v_existing_idempotency_key CHAR(64);
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

  SELECT tenant_id, status, display_name, idempotency_key, request_fingerprint
    INTO v_existing_tenant_id, v_existing_status, v_existing_display_name, v_existing_idempotency_key, v_existing_fingerprint
    FROM agentos.tenants
   WHERE tenant_id = c_tenant_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_status <> 'PROVISIONED'
       OR v_existing_display_name <> c_display_name
       OR v_existing_idempotency_key <> p_idempotency_key
       OR v_existing_fingerprint <> p_request_fingerprint THEN
      RAISE EXCEPTION 'existing tenant 99999999-9999-4999-8999-999999999999 has mismatched identity or provisioning keys'
        USING ERRCODE = '23505', CONSTRAINT = 'tenants_pkey';
    END IF;
  ELSE
    SELECT tenant_id, status, display_name, idempotency_key, request_fingerprint
      INTO v_existing_tenant_id, v_existing_status, v_existing_display_name, v_existing_idempotency_key, v_existing_fingerprint
      FROM agentos.tenants
     WHERE idempotency_key = p_idempotency_key
     FOR UPDATE;

    IF FOUND THEN
      RAISE EXCEPTION 'idempotency key is already bound to another tenant row'
        USING ERRCODE = '23505', CONSTRAINT = 'tenants_idempotency_key_key';
    END IF;

    INSERT INTO agentos.tenants (tenant_id, status, display_name, idempotency_key, request_fingerprint)
    VALUES (c_tenant_id, 'PROVISIONED', c_display_name, p_idempotency_key, p_request_fingerprint)
    ON CONFLICT DO NOTHING;

    SELECT tenant_id, status, display_name, idempotency_key, request_fingerprint
      INTO v_existing_tenant_id, v_existing_status, v_existing_display_name, v_existing_idempotency_key, v_existing_fingerprint
      FROM agentos.tenants
     WHERE tenant_id = c_tenant_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_existing_status <> 'PROVISIONED'
       OR v_existing_display_name <> c_display_name
       OR v_existing_idempotency_key <> p_idempotency_key
       OR v_existing_fingerprint <> p_request_fingerprint THEN
      RAISE EXCEPTION 'existing tenant 99999999-9999-4999-8999-999999999999 has mismatched identity or provisioning keys'
        USING ERRCODE = '23505', CONSTRAINT = 'tenants_pkey';
    END IF;
  END IF;

  INSERT INTO agentos.tenant_workspaces (tenant_id, admin_binding_ref, status)
  VALUES (c_tenant_id, 'tenant:' || c_tenant_id::TEXT, 'UNCONFIGURED')
  ON CONFLICT (tenant_id) DO NOTHING;

  FOREACH v_agent_code IN ARRAY ARRAY[
    'MKT-01', 'MKT-02', 'MKT-03', 'MKT-04', 'MKT-05', 'MKT-06',
    'SAL-01', 'SAL-02', 'SAL-03', 'SAL-04', 'SAL-05',
    'CS-01', 'CS-02'
  ] LOOP
    INSERT INTO agentos.agents (tenant_id, code, name, domain, assigned_authority, is_active)
    VALUES (
      c_tenant_id,
      v_agent_code,
      v_agent_code,
      CASE
        WHEN v_agent_code LIKE 'MKT-%' THEN 'marketing'
        WHEN v_agent_code LIKE 'SAL-%' THEN 'sales'
        ELSE 'support'
      END,
      'AUTH-0',
      FALSE
    )
    ON CONFLICT (tenant_id, code) DO NOTHING;
  END LOOP;

  FOREACH v_capability_id IN ARRAY ARRAY['care', 'sales', 'marketing'] LOOP
    INSERT INTO agentos.tenant_capabilities (tenant_id, capability_id, status)
    VALUES (c_tenant_id, v_capability_id, 'UNCONFIGURED')
    ON CONFLICT (tenant_id, capability_id) DO NOTHING;
  END LOOP;

  FOREACH v_connector_id IN ARRAY ARRAY['API-001', 'API-002', 'API-003', 'ADPT-GL-001', 'ADPT-GL-002', 'ADPT-GL-003', 'SHOPIFY'] LOOP
    INSERT INTO agentos.connector_configurations (tenant_id, connector_id, status)
    VALUES (c_tenant_id, v_connector_id, 'UNBOUND')
    ON CONFLICT (tenant_id, connector_id) DO NOTHING;
  END LOOP;

  FOREACH v_owner_input IN ARRAY ARRAY[
    'ASM-001', 'ASM-002', 'ASM-003', 'ASM-004', 'FLOOR_POLICY', 'REFUND_POLICY',
    'RETENTION_POLICY', 'KPI_BASELINE', 'PROVIDER_CREDENTIALS', 'RESIDENCY_REGION', 'PROMOTION_LIMITS'
  ] LOOP
    INSERT INTO agentos.unresolved_owner_inputs (tenant_id, input_id, status)
    VALUES (c_tenant_id, v_owner_input, 'UNRESOLVED')
    ON CONFLICT (tenant_id, input_id) DO NOTHING;
  END LOOP;

  INSERT INTO agentos.namespace_bindings (tenant_id, redis_prefix, vector_filter, storage_prefix)
  VALUES (
    c_tenant_id,
    'tenant:' || c_tenant_id::TEXT,
    'tenant_id=' || c_tenant_id::TEXT,
    'tenant/' || c_tenant_id::TEXT
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO agentos.residency_configurations (tenant_id, status)
  VALUES (c_tenant_id, 'UNRESOLVED')
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO agentos.tenant_autonomy_controls (tenant_id, paused, kill_switch)
  VALUES (c_tenant_id, FALSE, FALSE)
  ON CONFLICT (tenant_id) DO NOTHING;

  FOREACH v_skill_id IN ARRAY ARRAY[
    'skill.sales.check_stock', 'skill.sales.search_product', 'skill.sales.retrieve_customer',
    'skill.care.search_faq', 'skill.mkt.segment_audience', 'skill.mkt.generate_content'
  ] LOOP
    INSERT INTO agentos.autonomy_policies (
      tenant_id, skill_id, policy_version, policy_id, state, previous_approved_state,
      reason, parameters, provenance, effective_at, rollback_policy_version, rollback_state
    ) VALUES (
      c_tenant_id, v_skill_id, 'MINIMUM', agentos.uuid_generate_v7(), 'MINIMUM', 'MINIMUM',
      'SAFE_MINIMUM', '{}'::jsonb,
      '{"source":"SERVER_POLICY","decision":"SAFE_MINIMUM"}'::jsonb,
      CURRENT_TIMESTAMP, 'MINIMUM', 'MINIMUM'
    )
    ON CONFLICT (tenant_id, skill_id, policy_version) DO NOTHING;
  END LOOP;

  INSERT INTO agentos.provisioning_events (event_id, tenant_id, idempotency_key, event_type, payload)
  VALUES (
    c_provisioning_event_id,
    c_tenant_id,
    p_idempotency_key,
    'TENANT_PROVISIONED',
    jsonb_build_object('tenant_id', c_tenant_id)
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN c_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION agentos.provision_novamart_demo_tenant()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agentos, pg_temp
AS $$
DECLARE
  c_idempotency_key CONSTANT CHAR(64) := 'a9f4074913447922c5577959b02c1b0c934e7f77694473284f22382b621b6064';
  c_request_fingerprint CONSTANT CHAR(64) := 'e3d62b23859d8d9b5835f81e567683226c077103b0a4d098007e3d97028f789a';
BEGIN
  RETURN agentos.provision_novamart_demo_tenant(c_idempotency_key, c_request_fingerprint);
END;
$$;

REVOKE ALL ON FUNCTION agentos.provision_novamart_demo_tenant(CHAR(64), CHAR(64)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agentos.provision_novamart_demo_tenant(CHAR(64), CHAR(64)) TO agentos_app;

REVOKE ALL ON FUNCTION agentos.provision_novamart_demo_tenant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agentos.provision_novamart_demo_tenant() TO agentos_app;
