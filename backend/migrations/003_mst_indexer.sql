-- Durable replay checkpoint for the MST title-event indexer.
CREATE TABLE IF NOT EXISTS mst_indexer_checkpoints (
  checkpoint_name TEXT PRIMARY KEY,
  last_block BIGINT NOT NULL DEFAULT -1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);