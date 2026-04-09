-- Add REVERSE_LOOKUP to field_type_enum
ALTER TYPE field_type_enum ADD VALUE IF NOT EXISTS 'REVERSE_LOOKUP';
