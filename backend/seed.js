import mysql from 'mysql2/promise';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config();

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// ─── Categories & Subcategories ───────────────────────────────────────────────

const categories = [
    { name: 'Outillage', subs: ['Outillage à main', 'Outillage électrique'] },
    {
        name: 'Visserie & Fixation',
        subs: ['Vis & Boulons', 'Chevilles & Ancrages'],
    },
    { name: 'Plomberie', subs: ['Tuyaux & Raccords', 'Robinetterie'] },
    { name: 'Électricité', subs: ['Câblage', 'Appareillage'] },
    { name: 'Peinture', subs: ['Peinture murale', 'Accessoires peinture'] },
];

const categoryIds = [];
const subcategoryIds = [];

for (const cat of categories) {
    const [res] = await db.execute('INSERT INTO categories (name) VALUES (?)', [
        cat.name,
    ]);
    const catId = res.insertId;
    categoryIds.push(catId);

    for (const sub of cat.subs) {
        const [subRes] = await db.execute(
            'INSERT INTO subcategories (name, category_id) VALUES (?, ?)',
            [sub, catId]
        );
        subcategoryIds.push({ id: subRes.insertId, category_id: catId });
    }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

const tagNames = ['Promotion', 'Nouveau', 'Bestseller', 'Pro', 'Solde'];
const tagIds = [];

for (const tag of tagNames) {
    const [res] = await db.execute('INSERT INTO tags (name) VALUES (?)', [tag]);
    tagIds.push(res.insertId);
}

// ─── Wilayas ──────────────────────────────────────────────────────────────────

const wilayas = [
    'Adrar',
    'Chlef',
    'Laghouat',
    'Oum El Bouaghi',
    'Batna',
    'Béjaïa',
    'Biskra',
    'Béchar',
    'Blida',
    'Bouira',
    'Tamanrasset',
    'Tébessa',
    'Tlemcen',
    'Tiaret',
    'Tizi Ouzou',
    'Alger',
    'Djelfa',
    'Jijel',
    'Sétif',
    'Saïda',
    'Skikda',
    'Sidi Bel Abbès',
    'Annaba',
    'Guelma',
    'Constantine',
    'Médéa',
    'Mostaganem',
    "M'Sila",
    'Mascara',
    'Ouargla',
    'Oran',
    'El Bayadh',
    'Illizi',
    'Bordj Bou Arréridj',
    'Boumerdès',
    'El Tarf',
    'Tindouf',
    'Tissemsilt',
    'El Oued',
    'Khenchela',
    'Souk Ahras',
    'Tipaza',
    'Mila',
    'Aïn Defla',
    'Naâma',
    'Aïn Témouchent',
    'Ghardaïa',
    'Relizane',
    'Timimoun',
    'Bordj Badji Mokhtar',
    'Ouled Djellal',
    'Beni Abbès',
    'In Salah',
    'In Guezzam',
    'Touggourt',
    'Djanet',
    "M'Ghair",
    'El Meniaa',
];

for (const wilaya of wilayas) {
    const fee = faker.number.float({ min: 200, max: 900, fractionDigits: 2 });
    await db.execute('INSERT INTO wilayas (name, delivery_fee) VALUES (?, ?)', [
        wilaya,
        fee,
    ]);
}

// ─── Users ────────────────────────────────────────────────────────────────────

const userIds = [];

// 1 admin
const [adminRes] = await db.execute(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    ['admin', 'admin@quincaillerie.dz', '$2b$10$hashedpasswordhere', 'admin']
);
userIds.push(adminRes.insertId);

// 10 clients
for (let i = 0; i < 10; i++) {
    const [res] = await db.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [
            faker.internet.username(),
            faker.internet.email(),
            '$2b$10$hashedpasswordhere',
            'client',
        ]
    );
    userIds.push(res.insertId);
}

// ─── Products ─────────────────────────────────────────────────────────────────

const productIds = [];
const productNames = [
    'Marteau 500g',
    'Tournevis cruciforme',
    'Perceuse 750W',
    'Vis M6x30',
    'Cheville 8mm',
    'Tuyau PVC 32mm',
    'Robinet mélangeur',
    'Câble 2.5mm²',
    'Prise murale',
    'Rouleau peinture',
    'Brosse plate 50mm',
    'Scie égoïne',
    'Niveau à bulle',
    'Clé plate 13mm',
    'Meuleuse 125mm',
    'Boîte à onglets',
    'Colle PVC',
    'Interrupteur simple',
    'Disjoncteur 16A',
    'Mastic acrylique',
];

for (let i = 0; i < productNames.length; i++) {
    const sub = subcategoryIds[i % subcategoryIds.length];
    const price = faker.number.float({
        min: 200,
        max: 5000,
        fractionDigits: 2,
    });
    const discountPct = faker.helpers.arrayElement([0, 0, 0, 10, 15, 20]);
    const discountPrice =
        discountPct > 0 ? +(price * (1 - discountPct / 100)).toFixed(2) : 0;

    const [res] = await db.execute(
        `INSERT INTO products
            (name, description, price, initial_price, profit, discount_price, discount_percentage,
             discount_start, discount_end, category_id, subcategory_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            productNames[i],
            faker.commerce.productDescription(),
            price,
            +(price * 0.7).toFixed(2),
            +(price * 0.3).toFixed(2),
            discountPrice,
            discountPct,
            discountPct > 0 ? faker.date.recent({ days: 5 }) : null,
            discountPct > 0 ? faker.date.soon({ days: 30 }) : null,
            sub.category_id,
            sub.id,
        ]
    );

    const productId = res.insertId;
    productIds.push(productId);

    // 1 main image per product
    await db.execute(
        'INSERT INTO product_images (url, product_id, is_main) VALUES (?, ?, 1)',
        [
            `https://placehold.co/600x400?text=${encodeURIComponent(productNames[i])}`,
            productId,
        ]
    );

    // 1-2 tags per product
    const shuffled = tagIds
        .sort(() => 0.5 - Math.random())
        .slice(0, faker.number.int({ min: 1, max: 2 }));
    for (const tagId of shuffled) {
        await db.execute(
            'INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)',
            [productId, tagId]
        );
    }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

const statuses = ['en attente', 'confirmée', 'expédiée', 'livrée', 'annulée'];

for (let i = 0; i < 15; i++) {
    const itemCount = faker.number.int({ min: 1, max: 4 });
    let total = 0;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
        const productId = faker.helpers.arrayElement(productIds);
        const quantity = faker.number.int({ min: 1, max: 5 });
        const unitPrice = faker.number.float({
            min: 200,
            max: 5000,
            fractionDigits: 2,
        });
        total += quantity * unitPrice;
        items.push({ productId, quantity, unitPrice });
    }

    const [orderRes] = await db.execute(
        `INSERT INTO orders
            (total_price, status, full_name, email, phone, wilaya, address, delivery_location, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            +total.toFixed(2),
            faker.helpers.arrayElement(statuses),
            faker.person.fullName(),
            faker.internet.email(),
            `05${faker.string.numeric(8)}`,
            faker.helpers.arrayElement(wilayas),
            faker.location.streetAddress(),
            faker.helpers.arrayElement(['home', 'office']),
            faker.datatype.boolean() ? faker.lorem.sentence() : null,
        ]
    );

    for (const item of items) {
        await db.execute(
            'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
            [orderRes.insertId, item.productId, item.quantity, item.unitPrice]
        );
    }
}

await db.end();
console.log('✅ Seed complete');
