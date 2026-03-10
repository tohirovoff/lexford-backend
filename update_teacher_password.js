const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('lexford', 'postgres', '123456', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false,
});

async function main() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    await sequelize.query(`UPDATE users SET password = '${hash}' WHERE id = 1`);
    console.log('Teacher password updated successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

main();
