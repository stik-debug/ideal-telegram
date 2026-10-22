const { open } = require('./db'); const { hash } = require('./auth');
const [email, password, name = 'Admin'] = process.argv.slice(2);
if (!email || !password || password.length < 10) { console.error('Usage: npm run create-admin -- email password(>=10 chars) [name]'); process.exit(1); }
const db = open(process.env.DB_FILE || './data/skillforge.db');
db.prepare("INSERT INTO users(email,name,pass_hash,role) VALUES(?,?,?, 'admin') ON CONFLICT(email) DO UPDATE SET role='admin'").run(email.toLowerCase(), name, hash(password));
console.log('Admin ready:', email);
