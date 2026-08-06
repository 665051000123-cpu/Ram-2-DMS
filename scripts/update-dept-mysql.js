const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid'); // assuming uuid is installed, if not we'll use crypto

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'dms_db'
  });

  const email = '000000';
  const newDeptName = 'DEV';

  console.log(`Searching for department: ${newDeptName}`);
  const [deptRows] = await connection.execute('SELECT id FROM Department WHERE name = ?', [newDeptName]);
  
  let deptId;
  if (deptRows.length > 0) {
    deptId = deptRows[0].id;
    console.log(`Found department: ${newDeptName} with ID: ${deptId}`);
  } else {
    console.log(`Creating new department: ${newDeptName}`);
    deptId = require('crypto').randomUUID(); // using native crypto
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.execute(
      'INSERT INTO Department (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [deptId, newDeptName, now, now]
    );
  }

  console.log(`Updating user: ${email} to department: ${newDeptName}`);
  await connection.execute('UPDATE User SET departmentId = ? WHERE email = ?', [deptId, email]);

  console.log('Success: User is now in', newDeptName);
  await connection.end();
}

main().catch(console.error);
