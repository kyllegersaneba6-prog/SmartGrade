const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node hashPassword.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hashed Password:', hash);
  console.log('\nSQL to insert admin:');
  console.log(`INSERT INTO admin_users (username, password) VALUES ('admin', '${hash}');`);
});
