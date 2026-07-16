const sql = require("mssql");
const dbConfig = require("../dbconfig");

async function createFeedback(feedbackData) {
  const pool = await sql.connect(dbConfig);

  const result = await pool
    .request()
    .input("fbkID", sql.Char(9), feedbackData.fbkID)
    .input(
      "fbkComment",
      sql.VarChar(200),
      feedbackData.fbkComment
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
      INSERT INTO Feedback (
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

module.exports = {
  createFeedback
};