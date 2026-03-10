const { Sequelize, DataTypes, Model } = require('sequelize');

const sequelize = new Sequelize('lexford', 'postgres', '123456', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false,
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    
    // Direct query to check admin user
    const [users] = await sequelize.query("SELECT id, username, role, coins FROM users WHERE id = 3");
    console.log('Admin user (raw SQL):', JSON.stringify(users, null, 2));
    
    // Check class 1
    const [classes] = await sequelize.query("SELECT * FROM classes WHERE id = 1");
    console.log('Class 1:', JSON.stringify(classes, null, 2));
    
    // Check all users with role info
    const [allUsers] = await sequelize.query("SELECT id, username, role FROM users WHERE role = 'admin'");
    console.log('All admins:', JSON.stringify(allUsers, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

main();
