import pg from "pg";
const { Client } = pg;

// Test session pooler (port 5432)
async function test(label, config) {
  const client = new Client({ ...config, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query("SELECT version()");
    console.log(`✅ ${label}: Connected! ${r.rows[0].version.split(" ").slice(0,2).join(" ")}`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`❌ ${label}: ${e.message}`);
    return false;
  }
}

const base = {
  user: "postgres.utkfkkbzmtalmnnmcona",
  password: "Paki2ngki2ng!@#",
  database: "postgres",
};

await test("Session pooler :5432", { ...base, host: "aws-0-ap-southeast-1.pooler.supabase.com", port: 5432 });
await test("Transaction pooler :6543", { ...base, host: "aws-0-ap-southeast-1.pooler.supabase.com", port: 6543 });
await test("Direct host :5432", { ...base, user: "postgres", host: "db.utkfkkbzmtalmnnmcona.supabase.co", port: 5432 });
