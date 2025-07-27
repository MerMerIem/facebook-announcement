import mysql2 from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql2.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    port: process.env.DB_PORT || '3306',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quincaillerie_sekkar'
});

db.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the MySQL database:', err.message);
      return;
    }
    console.log('Connected to the MySQL database successfully!',process.env.DB_NAME);
    connection.release();
});
  
export default db.promise();