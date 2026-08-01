// models/vendorModel.js
// All direct SQL queries for the StallOwner (vendor) table live here.
// Controllers call these functions instead of writing SQL themselves.

const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Generates the next OwnerID in the format OWN000001, OWN000002, ...
async function generateNextOwnerId(pool) {
    const result = await pool.request()
        .query("SELECT MAX(OwnerID) AS maxId FROM dbo.StallOwner");

    const maxId = result.recordset[0].maxId; // e.g. 'OWN000010' (char(10), space-padded) or null
    let nextNumber = 1;

    if (maxId) {
        nextNumber = parseInt(maxId.trim().substring(3), 10) + 1;
    }

    return "OWN" + String(nextNumber).padStart(6, "0");
}

// Returns a vendor row (including OwnerPassword) by email, or undefined if not found.
async function findVendorByEmail(ownerEmail) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("email", sql.VarChar(50), ownerEmail)
        .query("SELECT * FROM dbo.StallOwner WHERE OwnerEmail = @email");

    return result.recordset[0];
}

// Returns public vendor fields (no password) by OwnerID, or undefined if not found.
async function findVendorById(ownerId) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("id", sql.Char(10), ownerId)
        .query(`SELECT OwnerID, OwnerName, OwnerNRIC, OwnerContactNo, OwnerEmail
                FROM dbo.StallOwner WHERE OwnerID = @id`);

    return result.recordset[0];
}

// Inserts a new vendor row. hashedPassword must already be hashed (bcrypt) by the controller.
// NOTE: this only creates the StallOwner row. Linking the owner to a stall
// (via RentalAgreement) is a separate step handled elsewhere.
async function createVendor({ ownerName, ownerNric, ownerContactNo, ownerEmail, hashedPassword }) {
    const pool = await sql.connect(dbConfig);
    const newId = await generateNextOwnerId(pool);

    await pool.request()
        .input("id", sql.Char(10), newId)
        .input("nric", sql.Char(9), ownerNric)
        .input("name", sql.VarChar(50), ownerName)
        .input("contact", sql.Char(10), ownerContactNo)
        .input("email", sql.VarChar(50), ownerEmail)
        .input("password", sql.VarChar(255), hashedPassword)
        .query(`INSERT INTO dbo.StallOwner
                    (OwnerID, OwnerNRIC, OwnerName, OwnerContactNo, OwnerEmail, OwnerPassword)
                VALUES
                    (@id, @nric, @name, @contact, @email, @password)`);

    return newId;
}

// Returns the list of StallIDs this owner currently has a rental agreement for.
// Useful right after login, since StallOwner has no direct StallID column.
async function getStallsByOwnerId(ownerId) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("id", sql.Char(10), ownerId)
        .query(`SELECT ra.StallID, fs.StallName
                FROM dbo.RentalAgreement ra
                JOIN dbo.FoodStall fs ON fs.StallID = ra.StallID
                WHERE ra.OwnerID = @id`);

    return result.recordset;
}

// Updates a vendor's editable fields (name, contact number, email).
// NRIC and password are intentionally excluded, same reasoning as customerModel.
async function updateVendor(ownerId, { ownerName, ownerContactNo, ownerEmail }) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("id", sql.Char(10), ownerId)
        .input("name", sql.VarChar(50), ownerName)
        .input("contact", sql.Char(10), ownerContactNo)
        .input("email", sql.VarChar(50), ownerEmail)
        .query(`UPDATE dbo.StallOwner
                SET OwnerName = @name, OwnerContactNo = @contact, OwnerEmail = @email
                WHERE OwnerID = @id`);

    return result.rowsAffected[0] > 0;
}

// Deletes a vendor row by ID. Returns true if a row was deleted.
async function deleteVendor(ownerId) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input("id", sql.Char(10), ownerId)
        .query("DELETE FROM dbo.StallOwner WHERE OwnerID = @id");

    return result.rowsAffected[0] > 0;
}

module.exports = {
    findVendorByEmail,
    findVendorById,
    createVendor,
    getStallsByOwnerId,
    updateVendor,
    deleteVendor
};