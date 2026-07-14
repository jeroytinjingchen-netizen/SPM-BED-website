// dbConfig.js
module.exports = {
  user: "FoodDB1",
  password: "password",
  server: "localhost", 
  database: "Group3Database",
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // Required for local development
    port: 1433 // Default SQL Server port
  }
};