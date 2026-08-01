USE [Group3Database];
GO

CREATE TABLE LoyaltyPoints
(
    CustomerID CHAR(9) NOT NULL PRIMARY KEY,

    Points INT NOT NULL
        CONSTRAINT DF_LoyaltyPoints_Points DEFAULT 0,

    LifetimePointsEarned INT NOT NULL
        CONSTRAINT DF_LoyaltyPoints_LifetimePointsEarned DEFAULT 0,

    CONSTRAINT FK_LoyaltyPoints_Customer
        FOREIGN KEY (CustomerID)
        REFERENCES Customer(CustomerID)
);
GO


USE [Group3Database];
GO

ALTER TABLE LoyaltyPoints
ADD LifetimePointsEarned INT NOT NULL
    CONSTRAINT DF_LoyaltyPoints_LifetimePointsEarned DEFAULT 0;
GO

UPDATE LoyaltyPoints
SET LifetimePointsEarned = Points;
GO







USE [Group3Database];
GO

CREATE TABLE Reward (
    RewardID INT IDENTITY(1,1) PRIMARY KEY,
    RewardName VARCHAR(100) NOT NULL,
    RewardDescription VARCHAR(255) NULL,
    PointsRequired INT NOT NULL,
    StockQuantity INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,

    CONSTRAINT CK_Reward_PointsRequired
        CHECK (PointsRequired > 0),

    CONSTRAINT CK_Reward_StockQuantity
        CHECK (StockQuantity >= 0)
);
GO


create reward redemption table 
CREATE TABLE RewardRedemption (
    RedemptionID INT IDENTITY(1,1) PRIMARY KEY,
    CustomerID CHAR(9) NOT NULL,
    RewardID INT NOT NULL,
    PointsUsed INT NOT NULL,
    RedemptionDateTime DATETIME NOT NULL DEFAULT GETDATE(),
    RedemptionStatus VARCHAR(30) NOT NULL DEFAULT 'Pending Collection',

    CONSTRAINT FK_RewardRedemption_Customer
        FOREIGN KEY (CustomerID)
        REFERENCES Customer(CustomerID),

    CONSTRAINT FK_RewardRedemption_Reward
        FOREIGN KEY (RewardID)
        REFERENCES Reward(RewardID)
);
GO






INSERT INTO dbo.Reward (
    RewardName,
    RewardDescription,
    RewardImage,
    PointsRequired,
    StockQuantity
)
VALUES
(
    'HawkerHub Umbrella',
    'Collect a HawkerHub umbrella at the customer service counter.',
    'images/umbrella.png',
    100,
    20
),
(
    'Portable Phone Stand',
    'Collect a foldable phone stand at the customer service counter.',
    'images/phone-stand.png',
    150,
    15
),
(
    'HawkerHub Tumbler',
    'Collect a reusable HawkerHub tumbler at the customer service counter.',
    'images/tumbler.png',
    250,
    10
),
(
    'Wireless Earbuds',
    'Collect a pair of wireless earbuds at the customer service counter.',
    'images/earbuds.png',
    500,
    5
);
GO





