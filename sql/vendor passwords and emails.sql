USE [Group3Database];
GO
-- all vendor passwords is Password123
-- 1. Update Aisha Rahman (OWN000004)
UPDATE dbo.StallOwner
SET OwnerEmail = 'aisha@example.com',
    OwnerPassword = '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVH/T9hhbeWpPznnw73O6ZAG2a7Ea6'
WHERE OwnerID = 'OWN000004';

-- 2. Update Daniel Goh (OWN000005)
UPDATE dbo.StallOwner
SET OwnerEmail = 'daniel@example.com',
    OwnerPassword = '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVH/T9hhbeWpPznnw73O6ZAG2a7Ea6'
WHERE OwnerID = 'OWN000005';

-- 3. Update Farah Noor (OWN000006)
UPDATE dbo.StallOwner
SET OwnerEmail = 'farah@example.com',
    OwnerPassword = '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVH/T9hhbeWpPznnw73O6ZAG2a7Ea6'
WHERE OwnerID = 'OWN000006';

-- 4. Update all remaining NULL owners with a default pattern so none are left blank
UPDATE dbo.StallOwner
SET OwnerEmail = LOWER(REPLACE(OwnerName, ' ', '')) + '@example.com',
    OwnerPassword = '$2b$10$3euPcmQFCiblsZeEu5s7p.9OVH/T9hhbeWpPznnw73O6ZAG2a7Ea6'
WHERE OwnerEmail IS NULL;
GO
