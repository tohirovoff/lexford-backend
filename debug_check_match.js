
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('lexford', 'postgres', '123456', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function main() {
  try {
    const [results] = await sequelize.query(
      "SELECT id, name, teacher_id FROM classes WHERE id = 2"
    );
    console.log("---------------------------------------------------");
    console.log("Checking Class ID 2 (5-B):");
    console.log(results);
    console.log("---------------------------------------------------");
    
    const [user] = await sequelize.query(
      "SELECT id, username, role FROM users WHERE id = 2"
    );
    console.log("Checking User ID 2 (teacher_valiyev):");
    console.log(user);
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main();
