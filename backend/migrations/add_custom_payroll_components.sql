-- Migration: Add custom payroll components to payrolls and payroll_templates tables
-- Run this BEFORE restarting the backend

-- Add custom JSONB columns to payrolls table
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS custom_income_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS custom_deduction_items jsonb DEFAULT '[]'::jsonb;

-- Add custom JSONB columns to payroll_templates table
ALTER TABLE payroll_templates ADD COLUMN IF NOT EXISTS custom_income_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE payroll_templates ADD COLUMN IF NOT EXISTS custom_deduction_items jsonb DEFAULT '[]'::jsonb;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name IN ('payrolls', 'payroll_templates') 
  AND column_name LIKE 'custom_%'
ORDER BY table_name, column_name;
