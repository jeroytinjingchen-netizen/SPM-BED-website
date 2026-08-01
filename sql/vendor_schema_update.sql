USE [Group3Database];
GO

------------------------------------------------------------
-- Add vendor login credentials to StallOwner
-- (same idea as append_2_fixes.sql did for Customer.CustPassword)
------------------------------------------------------------
IF COL_LENGTH('dbo.StallOwner', 'OwnerEmail') IS NULL
BEGIN
    ALTER TABLE dbo.StallOwner
    ADD OwnerEmail VARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.StallOwner', 'OwnerPassword') IS NULL
BEGIN
    ALTER TABLE dbo.StallOwner
    ADD OwnerPassword VARCHAR(255) NULL;
END
GO

------------------------------------------------------------
-- OwnerEmail should be unique once vendors start registering,
-- same as CustEmail is implicitly relied on for login lookups.
-- Only add the constraint if no duplicate/NULL rows would break it.
------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_StallOwner_OwnerEmail' AND object_id = OBJECT_ID('dbo.StallOwner')
)
BEGIN
    -- Filtered unique index: allows many NULLs (existing seeded owners
    -- with no email yet) but enforces uniqueness once an email is set.
    CREATE UNIQUE NONCLUSTERED INDEX UQ_StallOwner_OwnerEmail
    ON dbo.StallOwner(OwnerEmail)
    WHERE OwnerEmail IS NOT NULL;
END
GO
