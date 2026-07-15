// models/customerModel.js
// All direct SQL queries for the Customer table live here.
// Controllers call these functions instead of writing SQL themselves.

const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Generates the next CustomerID in the format CUS000001, CUS000002, ...
async function generateNextCustomerId(pool) {
    const result = await pool.request()
        .query("SELECT MAX(CustomerID) AS maxId FROM dbo.Customer");

    const maxId = result.recordset[0].maxId; // e.g. 'CUS000010' or null
    let nextNumber = 1;

    if (maxId) {
        nextNumber = parseInt(maxId.substring(3), 10) + 1;
    }

    return "CUS" + String(nextNumber).padStart(6, "0");
}

// Returns a customer row (including CustPassword) by email, or undefined if not found.
async function findCustomerByEmail(custEmail) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("email", sql.VarChar(50), custEmail)
        .query("SELECT * FROM dbo.Customer WHERE CustEmail = @email");

    return result.recordset[0];
}

// Returns public customer fields (no password) by CustomerID, or undefined if not found.
async function findCustomerById(customerId) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("id", sql.Char(9), customerId)
        .query(`SELECT CustomerID, CustName, CustContactNo, CustEmail
                FROM dbo.Customer WHERE CustomerID = @id`);

    return result.recordset[0];
}

// Inserts a new customer row. hashedPassword must already be hashed (bcrypt) by the controller.
async function createCustomer({ custName, custNric, custContactNo, custEmail, hashedPassword }) {
    const pool = await sql.connect(dbConfig);
    const newId = await generateNextCustomerId(pool);

    await pool.request()
        .input("id", sql.Char(9), newId)
        .input("nric", sql.VarChar(9), custNric)
        .input("name", sql.VarChar(50), custName)
        .input("contact", sql.VarChar(15), custContactNo)
        .input("email", sql.VarChar(50), custEmail)
        .input("password", sql.VarChar(255), hashedPassword)
        .query(`INSERT INTO dbo.Customer
                    (CustomerID, CustNRIC, CustName, CustContactNo, CustEmail, CustPassword)
                VALUES
                    (@id, @nric, @name, @contact, @email, @password)`);

    return newId;
}

module.exports = {
    findCustomerByEmail,
    findCustomerById,
    createCustomer
};
