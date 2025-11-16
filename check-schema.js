import { query } from './config/database.js';

const result = await query(
    'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
    ['officials']
);

console.log('\n📋 Officials Table Schema:\n');
result.rows.forEach(row => {
    console.log(`  ${row.column_name}: ${row.data_type}`);
});

process.exit(0);
