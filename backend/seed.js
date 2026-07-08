import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// ---------- Seed admin user ----------
async function seedAdmin() {
    const SALT_ROUNDS = 10;
    const plainPassword = 'dev';
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    await db.execute(
        `INSERT INTO users (username, email, password, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role)`,
        ['admin', 'admin@quincaillerie.dz', hashedPassword, 'admin']
    );

    console.log('✅ Admin upserted');
    console.log('💡 Admin account: admin@quincaillerie.dz / password: dev');
}

// ---------- Seed wilayas ----------
function randomDeliveryFee() {
    // ~50% free (0), otherwise a random fee 1..1000
    const isFree = Math.random() < 0.5;
    if (isFree) return 0;
    return Math.floor(Math.random() * 1000) + 1;
}

async function seedWilayas() {
    // Adjust this path if Wilaya_Of_Algeria.json lives elsewhere
    const jsonPath = path.join(__dirname, 'Wilaya_Of_Algeria.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const wilayas = Array.isArray(data) ? data : data.wilayas;

    // Clean table first (id is auto-increment, so reset it too)
    await db.execute('DELETE FROM wilayas');
    await db.execute('ALTER TABLE wilayas AUTO_INCREMENT = 1');

    for (const w of wilayas) {
        const delivery_fee = randomDeliveryFee();
        await db.execute(
            `INSERT INTO wilayas (name, delivery_fee)
             VALUES (?, ?)`,
            [w.name, delivery_fee]
        );
    }

    console.log(`✅ Seeded ${wilayas.length} wilayas`);
}

// ---------- Run all seeds ----------
try {
    await seedAdmin();
    await seedWilayas();
} catch (err) {
    console.error('❌ Error seeding database:', err);
} finally {
    await db.end();
}
