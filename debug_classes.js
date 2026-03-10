
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('lexford', 'postgres', '123456', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const [results, metadata] = await sequelize.query(
      "SELECT id, name, teacher_id FROM classes ORDER BY id ASC"
    );

    console.log("---------------------------------------------------");
    console.log("ID | Class Name | Teacher ID");
    console.log("---------------------------------------------------");
    results.forEach(row => {
      console.log(`${row.id.toString().padEnd(2)} | ${row.name.padEnd(10)} | ${row.teacher_id}`);
    });
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

main();
