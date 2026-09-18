const bcrypt = require('bcryptjs');

const accounts = [
  {
    full_name: 'Super Admin',
    username: 'superadmin',
    department: 'College of Information and Communication Technology (CICT)',
    system_role: 'superadmin',
    password: 'admin123'
  },
  {
    full_name: 'Admin User',
    username: 'admin',
    department: 'College of Information and Communication Technology (CICT)',
    system_role: 'admin',
    password: 'admin123'
  },
  {
    full_name: 'Teacher User',
    username: 'teacher',
    department: 'College of Information and Communication Technology (CICT)',
    system_role: 'teacher',
    password: 'admin123'
  }
];

(async () => {
  console.log('-- SmartGrade Seed Accounts (password for all: admin123)');
  console.log('-- Run these INSERT statements in your Supabase SQL Editor\n');

  for (const acct of accounts) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(acct.password, salt);

    console.log(`INSERT INTO staff_users (full_name, username, department, system_role, password)
VALUES ('${acct.full_name}', '${acct.username}', '${acct.department}', '${acct.system_role}', '${hash}');\n`);
  }

  console.log('-- Done. You can now log in with:');
  console.log('-- superadmin / admin123  (Super Admin)');
  console.log('-- admin      / admin123  (Admin)');
  console.log('-- teacher    / admin123  (Teacher)');
})();
