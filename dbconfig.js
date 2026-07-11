// dbConfig.js
module.exports = {
  user: "Hawker_db_user",
  password: "123",
  server: "localhost", 
  database: "Hawker_db",
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // Required for local development
    port: 1433 // Default SQL Server port
  }
};