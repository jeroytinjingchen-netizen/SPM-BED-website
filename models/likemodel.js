const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Check whether the customer has liked the menu item
async function getLike(customerId, stallId, itemCode) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("customerId", sql.Char(9), customerId)
      .input("stallId", sql.Char(10), stallId)
      .input("itemCode", sql.VarChar(20), itemCode)
      .query(`
        SELECT CustomerID, StallID, ItemCode
        FROM Likes
        WHERE CustomerID = @customerId
          AND StallID = @stallId
          AND ItemCode = @itemCode
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Model getLike error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Add a like
async function addLike(customerId, stallId, itemCode) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("customerId", sql.Char(9), customerId)
      .input("stallId", sql.Char(10), stallId)
      .input("itemCode", sql.VarChar(20), itemCode)
      .query(`
        INSERT INTO Likes (CustomerID, StallID, ItemCode)
        OUTPUT
          INSERTED.CustomerID,
          INSERTED.StallID,
          INSERTED.ItemCode
        VALUES (@customerId, @stallId, @itemCode)
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Model addLike error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Remove a like
async function removeLike(customerId, stallId, itemCode) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("customerId", sql.Char(9), customerId)
      .input("stallId", sql.Char(10), stallId)
      .input("itemCode", sql.VarChar(20), itemCode)
      .query(`
        DELETE FROM Likes
        WHERE CustomerID = @customerId
          AND StallID = @stallId
          AND ItemCode = @itemCode
      `);

    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Model removeLike error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Get total likes for a menu item
async function getLikeCount(stallId, itemCode) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("stallId", sql.Char(10), stallId)
      .input("itemCode", sql.VarChar(20), itemCode)
      .query(`
        SELECT COUNT(*) AS LikeCount
        FROM Likes
        WHERE StallID = @stallId
          AND ItemCode = @itemCode
      `);

    return result.recordset[0].LikeCount;
  } catch (error) {
    console.error("Model getLikeCount error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Get all food liked by one customer
async function getCustomerLikes(customerId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("customerId", sql.Char(9), customerId)
      .query(`
        SELECT
          l.CustomerID,
          l.StallID,
          l.ItemCode,
          m.ItemDesc,
          m.ItemPrice,
          m.ItemCategory,
          f.StallName
        FROM Likes l
        INNER JOIN MenuItem m
          ON l.StallID = m.StallID
          AND l.ItemCode = m.ItemCode
        INNER JOIN FoodStall f
          ON m.StallID = f.StallID
        WHERE l.CustomerID = @customerId
        ORDER BY f.StallName, m.ItemDesc
      `);

    return result.recordset;
  } catch (error) {
    console.error("Model getCustomerLikes error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Check whether the menu item exists
async function getMenuItem(stallId, itemCode) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("stallId", sql.Char(10), stallId)
      .input("itemCode", sql.VarChar(20), itemCode)
      .query(`
        SELECT StallID, ItemCode, ItemDesc, ItemPrice, ItemCategory
        FROM MenuItem
        WHERE StallID = @stallId
          AND ItemCode = @itemCode
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Model getMenuItem error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Check whether the customer exists
async function getCustomer(customerId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection
      .request()
      .input("customerId", sql.Char(9), customerId)
      .query(`
        SELECT CustomerID, CustName
        FROM Customer
        WHERE CustomerID = @customerId
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Model getCustomer error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Like if not liked, unlike if already liked
async function toggleLike(customerId, stallId, itemCode) {
  const existingLike = await getLike(customerId, stallId, itemCode);

  if (existingLike) {
    await removeLike(customerId, stallId, itemCode);

    const likeCount = await getLikeCount(stallId, itemCode);

    return {
      liked: false,
      likeCount
    };
  }

  await addLike(customerId, stallId, itemCode);

  const likeCount = await getLikeCount(stallId, itemCode);

  return {
    liked: true,
    likeCount
  };
}

module.exports = {
  getLike,
  addLike,
  removeLike,
  getLikeCount,
  getCustomerLikes,
  getMenuItem,
  getCustomer,
  toggleLike
};