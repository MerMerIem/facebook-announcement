import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const SALT_ROUNDS = 10;
const plainPassword = 'dev';
const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

await db.execute(
    `INSERT INTO users (username, email, password, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role)`,
    ['admin', 'admin@quincaillerie.dz', hashedPassword, 'admin']
);

await db.end();
console.log('✅ Admin upserted');
console.log('💡 Admin account: admin@quincaillerie.dz / password: dev');
