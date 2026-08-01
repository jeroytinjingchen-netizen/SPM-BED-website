const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Get the customer's current redeemable points
// and total lifetime points earned.
async function getPoints(customerID) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.Char(9), customerID)
            .query(`
                SELECT
                    CustomerID,
                    Points,
                    LifetimePointsEarned
                FROM LoyaltyPoints
                WHERE CustomerID = @customerID
            `);

        return result.recordset[0] || null;

    } catch (error) {
        console.error("Get loyalty points database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Create a loyalty account with zero points.
async function createLoyaltyAccount(customerID) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.Char(9), customerID)
            .query(`
                INSERT INTO LoyaltyPoints (
                    CustomerID,
                    Points,
                    LifetimePointsEarned
                )
                OUTPUT
                    INSERTED.CustomerID,
                    INSERTED.Points,
                    INSERTED.LifetimePointsEarned
                VALUES (
                    @customerID,
                    0,
                    0
                )
            `);

        return result.recordset[0];

    } catch (error) {
        console.error("Create loyalty account database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Add points after a successful purchase.
// Both available points and lifetime points increase.
async function addPoints(customerID, pointsToAdd) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.Char(9), customerID)
            .input("pointsToAdd", sql.Int, pointsToAdd)
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM LoyaltyPoints
                    WHERE CustomerID = @customerID
                )
                BEGIN
                    UPDATE LoyaltyPoints
                    SET
                        Points = Points + @pointsToAdd,
                        LifetimePointsEarned =
                            LifetimePointsEarned + @pointsToAdd
                    WHERE CustomerID = @customerID;
                END
                ELSE
                BEGIN
                    INSERT INTO LoyaltyPoints (
                        CustomerID,
                        Points,
                        LifetimePointsEarned
                    )
                    VALUES (
                        @customerID,
                        @pointsToAdd,
                        @pointsToAdd
                    );
                END

                SELECT
                    CustomerID,
                    Points,
                    LifetimePointsEarned
                FROM LoyaltyPoints
                WHERE CustomerID = @customerID;
            `);

        return result.recordset[0];

    } catch (error) {
        console.error("Add loyalty points database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// Redeem points.
// Only available points decrease.
// LifetimePointsEarned must never decrease.
async function redeemPoints(customerID, pointsToRedeem) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.Char(9), customerID)
            .input("pointsToRedeem", sql.Int, pointsToRedeem)
            .query(`
                UPDATE LoyaltyPoints
                SET Points = Points - @pointsToRedeem
                OUTPUT
                    INSERTED.CustomerID,
                    INSERTED.Points,
                    INSERTED.LifetimePointsEarned
                WHERE CustomerID = @customerID
                  AND Points >= @pointsToRedeem
            `);

        return result.recordset[0] || null;

    } catch (error) {
        console.error("Redeem loyalty points database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}



module.exports = {
    getPoints,
    createLoyaltyAccount,
    addPoints,
    redeemPoints,
    
};