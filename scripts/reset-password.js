// Script to generate SQL for resetting a user's password
import bcrypt from 'bcryptjs';

const username = process.argv[2];
const newPassword = process.argv[3];

if (username === '--list') {
  console.log('\nTo list users, run this SQL in Supabase SQL Editor:');
  console.log('SELECT id, username, display_name, created_at FROM users ORDER BY created_at;\n');
  process.exit(0);
}

if (!username || !newPassword) {
  console.log('\nUsage: node scripts/reset-password.js <username> <new_password>');
  console.log('Example: node scripts/reset-password.js aza newpassword123\n');
  console.log('To list all users:');
  console.log('  node scripts/reset-password.js --list\n');
  process.exit(1);
}

const saltRounds = 10;
const passwordHash = bcrypt.hashSync(newPassword, saltRounds);

console.log(`\n-- SQL to reset password for user: ${username}`);
console.log(`UPDATE users SET password_hash = '${passwordHash}', updated_at = NOW()`);
console.log(`WHERE username = '${username}';`);
console.log('');
