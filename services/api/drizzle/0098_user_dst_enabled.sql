-- Add dst_enabled column to users table
ALTER TABLE users ADD COLUMN dst_enabled BOOLEAN NOT NULL DEFAULT false;
