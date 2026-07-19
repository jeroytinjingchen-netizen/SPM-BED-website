const sql = require("mssql");
const dbConfig = require("../dbConfig");

/*
    Get all liked menu items for one customer
*/
async function getLikesByCustomer(customerID) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.VarChar, customerID)
            .query(`
                SELECT
                    l.CustomerID,
                    l.StallID,
                    l.ItemCode,
                    m.ItemDesc,
                    m.ItemPrice,
                    m.ItemCategory
                FROM Likes l
                INNER JOIN MenuItem m
                    ON l.StallID = m.StallID
                    AND l.ItemCode = m.ItemCode
                WHERE l.CustomerID = @customerID
                ORDER BY m.ItemDesc
            `);

        return result.recordset;

    } catch (error) {
        console.error("Get likes database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

/*
    Check whether a customer has already liked an item
*/
async function getLike(customerID, stallID, itemCode) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.VarChar, customerID)
            .input("stallID", sql.VarChar, stallID)
            .input("itemCode", sql.VarChar, itemCode)
            .query(`
                SELECT CustomerID, StallID, ItemCode
                FROM Likes
                WHERE CustomerID = @customerID
                  AND StallID = @stallID
                  AND ItemCode = @itemCode
            `);

        return result.recordset[0];

    } catch (error) {
        console.error("Get like database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

/*
    Add a liked menu item
*/
async function createLike(customerID, stallID, itemCode) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.VarChar, customerID)
            .input("stallID", sql.VarChar, stallID)
            .input("itemCode", sql.VarChar, itemCode)
            .query(`
                INSERT INTO Likes (
                    CustomerID,
                    StallID,
                    ItemCode
                )
                OUTPUT
                    INSERTED.CustomerID,
                    INSERTED.StallID,
                    INSERTED.ItemCode
                VALUES (
                    @customerID,
                    @stallID,
                    @itemCode
                )
            `);

        return result.recordset[0];

    } catch (error) {
        console.error("Create like database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

/*
    Remove a liked menu item
*/
async function deleteLike(customerID, stallID, itemCode) {
    let connection;

    try {
        connection = await sql.connect(dbConfig);

        const result = await connection.request()
            .input("customerID", sql.VarChar, customerID)
            .input("stallID", sql.VarChar, stallID)
            .input("itemCode", sql.VarChar, itemCode)
            .query(`
                DELETE FROM Likes
                WHERE CustomerID = @customerID
                  AND StallID = @stallID
                  AND ItemCode = @itemCode
            `);

        return result.rowsAffected[0] > 0;

    } catch (error) {
        console.error("Delete like database error:", error);
        throw error;

    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

module.exports = {
    getLikesByCustomer,
    getLike,
    createLike,
    deleteLike
};