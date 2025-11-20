// Script to generate SQL for creating a user with hashed password
import bcrypt from 'bcryptjs';

const username = process.argv[2] || 'aza';
const password = process.argv[3] || 'aza';

const saltRounds = 10;
const passwordHash = bcrypt.hashSync(password, saltRounds);

console.log(`\n-- SQL to create user: ${username}`);
console.log(`INSERT INTO users (username, password_hash, display_name)`);
console.log(`VALUES ('${username}', '${passwordHash}', '${username}');`);
console.log('');
