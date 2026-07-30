const sql = require("mssql");

class MenuItem {
    // GET: Retrieve all menu items for a specific stall
    static async getMenuByStall(stallId) {
        const request = new sql.Request();
        request.input("StallID", sql.Char(10), stallId);
        
        const result = await request.query(
            "SELECT * FROM MenuItem WHERE StallID = @StallID"
        );
        return result.recordset;
    }

    // POST: Add a new menu item
    static async addMenuItem(stallId, itemCode, itemDesc, itemPrice, itemCategory, isSpecial) {
        const request = new sql.Request();
        request.input("StallID", sql.Char(10), stallId);
        request.input("ItemCode", sql.VarChar(20), itemCode);
        request.input("ItemDesc", sql.VarChar(100), itemDesc);
        request.input("ItemPrice", sql.Decimal(6, 2), itemPrice);
        request.input("ItemCategory", sql.VarChar(30), itemCategory);
        request.input("IsSpecial", sql.Bit, isSpecial);

        const result = await request.query(`
            INSERT INTO MenuItem (StallID, ItemCode, ItemDesc, ItemPrice, ItemCategory, IsSpecial)
            VALUES (@StallID, @ItemCode, @ItemDesc, @ItemPrice, @ItemCategory, @IsSpecial)
        `);
        return result;
    }

    // DELETE: Remove a menu item
    static async deleteMenuItem(stallId, itemCode) {
        const request = new sql.Request();
        
        // Safely pass the parameters to prevent SQL injection
        request.input("StallID", sql.Char(10), stallId);
        request.input("ItemCode", sql.VarChar(20), itemCode);

        // Run the delete query
        const result = await request.query(`
            DELETE FROM MenuItem 
            WHERE StallID = @StallID AND ItemCode = @ItemCode
        `);
        
        return result.rowsAffected[0] > 0; 
    }

    // PUT: Update an existing menu item
    static async updateMenuItem(stallId, itemCode, itemDesc, itemPrice, itemCategory, isSpecial) {
        const request = new sql.Request();
        
        request.input("StallID", sql.Char(10), stallId);
        request.input("ItemCode", sql.VarChar(20), itemCode);
        request.input("ItemDesc", sql.VarChar(100), itemDesc);
        request.input("ItemPrice", sql.Decimal(6, 2), itemPrice);
        request.input("ItemCategory", sql.VarChar(30), itemCategory);
        request.input("IsSpecial", sql.Bit, isSpecial);

        const result = await request.query(`
            UPDATE MenuItem 
            SET ItemDesc = @ItemDesc, ItemPrice = @ItemPrice, ItemCategory = @ItemCategory, IsSpecial = @IsSpecial
            WHERE StallID = @StallID AND ItemCode = @ItemCode
        `);
        
        return result.rowsAffected[0] > 0; 
    }

    // PUT: Toggle IsAvailable status for Feature 2
    static async toggleMenuItem(stallId, itemCode) {
        const request = new sql.Request();
        request.input("StallID", sql.Char(10), stallId);
        request.input("ItemCode", sql.VarChar(20), itemCode);

        // Fetch current status
        const check = await request.query(`SELECT IsAvailable FROM MenuItem WHERE StallID = @StallID AND ItemCode = @ItemCode`);
        if (check.recordset.length === 0) return false;

        // Determine new status (handles NULL if SQL command wasn't run yet)
        const currentStatus = check.recordset[0].IsAvailable === null ? 1 : check.recordset[0].IsAvailable;
        const newStatus = currentStatus ? 0 : 1;

        request.input("NewStatus", sql.Bit, newStatus);
        const result = await request.query(`UPDATE MenuItem SET IsAvailable = @NewStatus WHERE StallID = @StallID AND ItemCode = @ItemCode`);
        
        return result.rowsAffected[0] > 0;
    }
}

module.exports = MenuItem;