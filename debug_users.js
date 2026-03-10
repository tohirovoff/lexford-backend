
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('lexford', 'postgres', '123456', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function main() {
  try {
    const [results, metadata] = await sequelize.query(
      "SELECT id, username, role FROM users ORDER BY id ASC"
    );

    console.log("-----------------------------------------");
    console.log("ID | Username          | Role");
    console.log("-----------------------------------------");
    results.forEach(row => {
      console.log(`${row.id.toString().padEnd(2)} | ${row.username.padEnd(17)} | ${row.role}`);
    });
    console.log("-----------------------------------------");

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main();
