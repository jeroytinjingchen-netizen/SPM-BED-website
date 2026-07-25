USE [Group3Database];
GO

------------------------------------------------------------
-- 1) Fix customer registration by ensuring a password column exists
------------------------------------------------------------
IF COL_LENGTH('dbo.Customer', 'CustPassword') IS NULL
BEGIN
    ALTER TABLE dbo.Customer
    ADD CustPassword NVARCHAR(255) NULL;
END
GO

------------------------------------------------------------
-- 2) Ensure cart tables exist for server-side cart persistence
------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Cart'
)
BEGIN
    CREATE TABLE [dbo].[Cart](
        [CartID] [char](9) NOT NULL,
        [CustomerID] [char](9) NOT NULL,
        [CreatedAt] [datetime] NOT NULL,
        [UpdatedAt] [datetime] NOT NULL,
        [CartStatus] [varchar](20) NOT NULL,
        CONSTRAINT [PK_Cart] PRIMARY KEY CLUSTERED ([CartID] ASC)
    ) ON [PRIMARY];
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'CartItem'
)
BEGIN
    CREATE TABLE [dbo].[CartItem](
        [CartID] [char](9) NOT NULL,
        [CartItemNo] [int] NOT NULL,
        [StallID] [char](10) NOT NULL,
        [ItemCode] [varchar](20) NOT NULL,
        [Quantity] [int] NOT NULL,
        [UnitPrice] [decimal](6, 2) NOT NULL,
        CONSTRAINT [PK_CartItem] PRIMARY KEY CLUSTERED ([CartID] ASC, [CartItemNo] ASC)
    ) ON [PRIMARY];
END
GO

------------------------------------------------------------
-- 3) Add foreign keys if they do not already exist
------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_Cart_Customer'
)
BEGIN
    ALTER TABLE dbo.Cart WITH CHECK
    ADD CONSTRAINT FK_Cart_Customer
    FOREIGN KEY (CustomerID) REFERENCES dbo.Customer(CustomerID);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_CartItem_Cart'
)
BEGIN
    ALTER TABLE dbo.CartItem WITH CHECK
    ADD CONSTRAINT FK_CartItem_Cart
    FOREIGN KEY (CartID) REFERENCES dbo.Cart(CartID);
END
GO

------------------------------------------------------------
-- 4) Optional useful indexes for lookup speed
------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Cart_CustomerID' AND object_id = OBJECT_ID('dbo.Cart')
)
BEGIN
    CREATE INDEX IX_Cart_CustomerID
    ON dbo.Cart(CustomerID);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_CartItem_CartID' AND object_id = OBJECT_ID('dbo.CartItem')
)
BEGIN
    CREATE INDEX IX_CartItem_CartID
    ON dbo.CartItem(CartID);
END
GO
