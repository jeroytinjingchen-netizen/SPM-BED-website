const sql = require("mssql");
const bcrypt = require("bcrypt");
const dbConfig = require("./dbConfig");

async function fixAllVendorPasswords() {
    try {
        // 1. Generate a real, mathematically valid bcrypt hash for 'Password123'
        const realHash = await bcrypt.hash("Password123", 10);
        
        // 2. Connect to your SQL database
        const pool = await sql.connect(dbConfig);
        
        // 3. Update EVERY vendor in dbo.StallOwner with the valid hash
        const result = await pool.request()
            .input("pass", sql.VarChar(255), realHash)
            .query(`
                UPDATE dbo.StallOwner 
                SET OwnerPassword = @pass
            `);
            
        console.log("=========================================");
        console.log(`SUCCESS! Updated ${result.rowsAffected[0]} vendors in your database.`);
        console.log("All accounts can now log in with password: Password123");
        console.log("=========================================");
        process.exit(0);
    } catch (err) {
        console.error("Error updating vendors:", err);
        process.exit(1);
    }
}

fixAllVendorPasswords();