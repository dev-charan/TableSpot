-- Migration: add room GST fields
-- Run once against existing databases.
-- schema.sql already includes these columns for fresh installs.

ALTER TABLE payment_settings
  ADD COLUMN IF NOT EXISTS room_gst_rate DECIMAL(5,2) DEFAULT 5;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS room_gst_rate   DECIMAL(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS room_gst_amount DECIMAL(10,2) DEFAULT 0;
