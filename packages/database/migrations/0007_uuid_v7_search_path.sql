-- The P5 SECURITY DEFINER provisioning function pins search_path to agentos, pg_temp.
-- The original UUID v7 helper resolved pgcrypto.gen_random_bytes through the caller's
-- path, so its first tenant insert failed there. Use PostgreSQL 16's core CSPRNG
-- UUID source and binary send function instead; both are in pg_catalog. Keep 0000's
-- checksum/history immutable, and pin this helper's own trusted search path.
CREATE OR REPLACE FUNCTION agentos.uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
    ts_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    b BYTEA := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
BEGIN
    b := SET_BYTE(b, 0, ((ts_ms >> 40) & 255)::INT);
    b := SET_BYTE(b, 1, ((ts_ms >> 32) & 255)::INT);
    b := SET_BYTE(b, 2, ((ts_ms >> 24) & 255)::INT);
    b := SET_BYTE(b, 3, ((ts_ms >> 16) & 255)::INT);
    b := SET_BYTE(b, 4, ((ts_ms >>  8) & 255)::INT);
    b := SET_BYTE(b, 5, ( ts_ms        & 255)::INT);
    b := SET_BYTE(b, 6, (7 << 4) | (GET_BYTE(b, 6) & 15));
    b := SET_BYTE(b, 8, (GET_BYTE(b, 8) & 63) | 128);
    RETURN ENCODE(b, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = pg_catalog, pg_temp;
