const sql = require("mssql");
const dbConfig = require("../dbConfig");

// GET all feedback
async function getAllFeedback() {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(`
        SELECT
            FbkID,
            FbkComment,
            FbkDateTime,
            FbkRating,
            CustomerID,
            StallID
        FROM dbo.Feedback
        ORDER BY FbkDateTime DESC
    `);

    return result.recordset;
}

// GET one feedback by ID
async function getFeedbackById(fbkID) {
    const pool = await sql.connect(dbConfig);

    const result = await pool
        .request()
        .input("fbkID", sql.Char(9), fbkID)
        .query(`
            SELECT
                FbkID,
                FbkComment,
                FbkDateTime,
                FbkRating,
                CustomerID,
                StallID
            FROM dbo.Feedback
            WHERE FbkID = @fbkID
        `);

    return result.recordset[0] || null;
}

// Generate FBK000001, FBK000002, etc.
async function generateFeedbackID(pool) {
    const result = await pool.request().query(`
        SELECT
            ISNULL(
                MAX(
                    TRY_CAST(SUBSTRING(FbkID, 4, 6) AS INT)
                ),
                0
            ) + 1 AS NextNumber
        FROM dbo.Feedback
    `);

    const nextNumber = result.recordset[0].NextNumber;

    return `FBK${String(nextNumber).padStart(6, "0")}`;
}

// POST create feedback
async function createFeedback(feedbackData) {
    const pool = await sql.connect(dbConfig);

    const fbkID = await generateFeedbackID(pool);

    const result = await pool
        .request()
        .input("fbkID", sql.Char(9), fbkID)
        .input(
            "fbkComment",
            sql.VarChar(200),
            feedbackData.fbkComment || null
        )
        .input(
            "fbkRating",
            sql.TinyInt,
            feedbackData.fbkRating
        )
        .input(
            "customerID",
            sql.Char(9),
            feedbackData.customerID
        )
        .input(
            "stallID",
            sql.Char(10),
            feedbackData.stallID
        )
        .query(`
            INSERT INTO dbo.Feedback (
                FbkID,
                FbkComment,
                FbkDateTime,
                FbkRating,
                CustomerID,
                StallID
            )
            OUTPUT INSERTED.*
            VALUES (
                @fbkID,
                @fbkComment,
                GETDATE(),
                @fbkRating,
                @customerID,
                @stallID
            )
        `);

    return result.recordset[0];
}

// PUT/PATCH update feedback
async function updateFeedback(fbkID, feedbackData) {
    const pool = await sql.connect(dbConfig);

    const updateFields = [];

    const request = pool
        .request()
        .input("fbkID", sql.Char(9), fbkID);

    if (feedbackData.fbkComment !== undefined) {
        request.input(
            "fbkComment",
            sql.VarChar(200),
            feedbackData.fbkComment || null
        );

        updateFields.push("FbkComment = @fbkComment");
    }

    if (feedbackData.fbkRating !== undefined) {
        request.input(
            "fbkRating",
            sql.TinyInt,
            feedbackData.fbkRating
        );

        updateFields.push("FbkRating = @fbkRating");
    }

    if (feedbackData.stallID !== undefined) {
        request.input(
            "stallID",
            sql.Char(10),
            feedbackData.stallID
        );

        updateFields.push("StallID = @stallID");
    }

    if (updateFields.length === 0) {
        return null;
    }

    updateFields.push("FbkDateTime = GETDATE()");

    const result = await request.query(`
        UPDATE dbo.Feedback
        SET ${updateFields.join(", ")}
        OUTPUT INSERTED.*
        WHERE FbkID = @fbkID
    `);

    return result.recordset[0] || null;
}

// DELETE feedback
async function deleteFeedback(fbkID) {
    const pool = await sql.connect(dbConfig);

    const result = await pool
        .request()
        .input("fbkID", sql.Char(9), fbkID)
        .query(`
            DELETE FROM dbo.Feedback
            OUTPUT DELETED.*
            WHERE FbkID = @fbkID
        `);

    return result.recordset[0] || null;
}

module.exports = {
    getAllFeedback,
    getFeedbackById,
    createFeedback,
    updateFeedback,
    deleteFeedback
};