-- Migration: Fix payrolls table schema by dropping obsolete columns
-- These columns are likely from an older version or a different project and are causing NOT NULL constraint violations

ALTER TABLE payrolls DROP COLUMN IF EXISTS basic_salary;
ALTER TABLE payrolls DROP COLUMN IF EXISTS allowances;
ALTER TABLE payrolls DROP COLUMN IF EXISTS deductions;
ALTER TABLE payrolls DROP COLUMN IF EXISTS total;
ALTER TABLE payrolls DROP COLUMN IF EXISTS payment_date;
ALTER TABLE payrolls DROP COLUMN IF EXISTS processed_by_id;
ALTER TABLE payrolls DROP COLUMN IF EXISTS month_year;

-- Ensure period_month and period_year are correctly typed if needed (already bigint in DB, int in Go)
-- They are already there, so no need to add them.

-- Verify the remaining columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payrolls'
ORDER BY column_name;
