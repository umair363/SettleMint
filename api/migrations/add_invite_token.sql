-- Run this in the Neon SQL editor to add invite columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_groups_invite_token ON groups(invite_token);
