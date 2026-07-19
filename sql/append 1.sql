-- Cart header table
CREATE TABLE [dbo].[Cart](
    [CartID] [char](9) NOT NULL,
    [CustomerID] [char](9) NOT NULL,
    [CreatedAt] [datetime] NOT NULL,
    [UpdatedAt] [datetime] NOT NULL,
    [CartStatus] [varchar](20) NOT NULL,
 CONSTRAINT [PK_Cart] PRIMARY KEY CLUSTERED
(
    [CartID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF,
ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
ON [PRIMARY]
) ON [PRIMARY];
GO

-- Cart items table
CREATE TABLE [dbo].[CartItem](
    [CartID] [char](9) NOT NULL,
    [CartItemNo] [int] NOT NULL,
    [StallID] [char](10) NOT NULL,
    [ItemCode] [varchar](20) NOT NULL,
    [Quantity] [int] NOT NULL,
    [UnitPrice] [decimal](6, 2) NOT NULL,
 CONSTRAINT [PK_CartItem] PRIMARY KEY CLUSTERED
(
    [CartID] ASC,
    [CartItemNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF,
ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF)
ON [PRIMARY]
) ON [PRIMARY];
GO

ALTER TABLE [dbo].[Cart]
ADD CONSTRAINT [FK_Cart_Customer]
FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customer]([CustomerID]);

ALTER TABLE [dbo].[CartItem]
ADD CONSTRAINT [FK_CartItem_Cart]
FOREIGN KEY ([CartID]) REFERENCES [dbo].[Cart]([CartID]);

ALTER TABLE [dbo].[CartItem]
ADD CONSTRAINT [FK_CartItem_MenuItem]
FOREIGN KEY ([StallID], [ItemCode])
REFERENCES [dbo].[MenuItem]([StallID], [ItemCode]);