const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Get all active rewards available for redemption
async function getAllRewards() {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request().query(`
            SELECT
                RewardID,
                RewardName,
                RewardDescription,
                RewardImage,
                PointsRequired,
                StockQuantity,
                IsActive
            FROM Reward
            WHERE IsActive = 1
            ORDER BY PointsRequired ASC
        `);

        return result.recordset;

    } catch (error) {
        console.error("Get rewards database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Get reward details by rewardID
async function getRewardById(rewardID) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("rewardID", sql.Int, rewardID)
            .query(`
                SELECT
                    RewardID,
                    RewardName,
                    RewardDescription,
                    RewardImage,
                    PointsRequired,
                    StockQuantity,
                    IsActive
                FROM Reward
                WHERE RewardID = @rewardID
            `);

        return result.recordset[0] || null;

    } catch (error) {
        console.error("Get reward database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}


// Redeem a reward for a customer, deducting points and updating stock
async function redeemReward(customerID, rewardID) {
    let connection;
    let transaction;

    try {
        connection = await sql.connect(dbConfig);

        transaction = new sql.Transaction(connection);

        await transaction.begin();

        const rewardResult = await new sql.Request(transaction)
            .input("rewardID", sql.Int, rewardID)
            .query(`
                SELECT
                    RewardID,
                    RewardName,
                    PointsRequired,
                    StockQuantity,
                    IsActive
                FROM Reward WITH (UPDLOCK, ROWLOCK)
                WHERE RewardID = @rewardID
            `);

        const reward = rewardResult.recordset[0];

        if (!reward || !reward.IsActive) {
            throw new Error("Reward is unavailable.");
        }

        if (Number(reward.StockQuantity) <= 0) {
            throw new Error("Reward is out of stock.");
        }

        const loyaltyResult = await new sql.Request(transaction)
            .input("customerID", sql.Char(9), customerID)
            .query(`
                SELECT
                    CustomerID,
                    Points,
                    LifetimePointsEarned
                FROM LoyaltyPoints WITH (UPDLOCK, ROWLOCK)
                WHERE CustomerID = @customerID
            `);

        const loyalty = loyaltyResult.recordset[0];

        if (!loyalty) {
            throw new Error("Loyalty account not found.");
        }

        if (Number(loyalty.Points) < Number(reward.PointsRequired)) {
            throw new Error("You do not have enough loyalty points.");
        }

        const updatedLoyaltyResult =
            await new sql.Request(transaction)
                .input("customerID", sql.Char(9), customerID)
                .input(
                    "pointsRequired",
                    sql.Int,
                    Number(reward.PointsRequired)
                )
                .query(`
                    UPDATE LoyaltyPoints
                    SET Points = Points - @pointsRequired
                    OUTPUT
                        INSERTED.CustomerID,
                        INSERTED.Points,
                        INSERTED.LifetimePointsEarned
                    WHERE CustomerID = @customerID
                `);

        await new sql.Request(transaction)
            .input("rewardID", sql.Int, rewardID)
            .query(`
                UPDATE Reward
                SET StockQuantity = StockQuantity - 1
                WHERE RewardID = @rewardID
            `);

        const redemptionResult =
            await new sql.Request(transaction)
                .input("customerID", sql.Char(9), customerID)
                .input("rewardID", sql.Int, rewardID)
                .input(
                    "pointsUsed",
                    sql.Int,
                    Number(reward.PointsRequired)
                )
                .query(`
                    INSERT INTO RewardRedemption (
                        CustomerID,
                        RewardID,
                        PointsUsed,
                        RedemptionDate,
                        Status
                    )
                    OUTPUT
                        INSERTED.RedemptionID,
                        INSERTED.CustomerID,
                        INSERTED.RewardID,
                        INSERTED.PointsUsed,
                        INSERTED.RedemptionDate,
                        INSERTED.Status
                    VALUES (
                        @customerID,
                        @rewardID,
                        @pointsUsed,
                        GETDATE(),
                        'Pending Collection'
                    )
                `);

        await transaction.commit();

        return {
            reward,
            redemption: redemptionResult.recordset[0],
            loyalty: updatedLoyaltyResult.recordset[0]
        };

    } catch (error) {
        if (transaction._aborted !== true) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Reward rollback error:", rollbackError);
            }
        }

        console.error("Redeem reward database error:", error);
        throw error;
    }
}

async function getRedemptionsByCustomer(customerID) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.Char(9), customerID)
            .query(`
                SELECT
                    rr.RedemptionID,
                    rr.CustomerID,
                    rr.RewardID,
                    rr.PointsUsed,
                    rr.RedemptionDate,
                    rr.Status,
                    r.RewardName,
                    r.RewardDescription,
                    r.RewardImage
                FROM RewardRedemption rr
                INNER JOIN Reward r
                    ON rr.RewardID = r.RewardID
                WHERE rr.CustomerID = @customerID
                ORDER BY rr.RedemptionDate DESC
            `);

        return result.recordset;

    //update reward status -- collected / not collected 
    async function updateRewardStatus(redemptionID, status) {

    let connection;

    try {

        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("redemptionID", sql.Int, redemptionID)
            .input("status", sql.VarChar, status)
            .query(`
                UPDATE RewardRedemption
                SET Status = @status

                WHERE RedemptionID = @redemptionID;

                SELECT *
                FROM RewardRedemption

                WHERE RedemptionID = @redemptionID;
            `);

        return result.recordset[0];

    } finally {

        if (connection)
            await connection.close();
    }
}

    } catch (error) {
        console.error("Get redemptions database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

async function updateRewardStatus(redemptionID, status) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("redemptionID", sql.Int, redemptionID)
            .input("status", sql.VarChar(30), status)
            .query(`
                UPDATE RewardRedemption
                SET Status = @status
                OUTPUT
                    INSERTED.RedemptionID,
                    INSERTED.CustomerID,
                    INSERTED.RewardID,
                    INSERTED.PointsUsed,
                    INSERTED.RedemptionDate,
                    INSERTED.Status
                WHERE RedemptionID = @redemptionID
            `);

        return result.recordset[0] || null;

    } catch (error) {
        console.error(
            "Update reward status database error:",
            error
        );
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

module.exports = {
    getAllRewards,
    getRewardById,
    redeemReward,
    getRedemptionsByCustomer,
    updateRewardStatus
};