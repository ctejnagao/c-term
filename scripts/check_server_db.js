const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://ctej_admin:ctej8077@192.168.2.10:5432/ctej_erp_db' });

async function check() {
  try {
    await client.connect();
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log('Tables on CTEJ-Server:', tables.rows.map(r => r.table_name));

    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'PurchaseOrder';");
    console.log('Columns in PurchaseOrder:', cols.rows.map(r => r.column_name));

    const seq = await client.query("SELECT * FROM \"SequenceTracker\" WHERE key = 'PURCHASE_ORDER';");
    console.log('SequenceTracker PURCHASE_ORDER:', seq.rows);
  } catch (err) {
    console.error('Check CTEJ-Server DB error:', err.message);
  } finally {
    await client.end();
  }
}

check();
