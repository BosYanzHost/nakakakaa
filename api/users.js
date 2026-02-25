const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const dbPath = path.join(process.cwd(), 'data', 'db.json');

  // Baca database
  if (!fs.existsSync(dbPath)) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], servers: [] }));
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // GET all users
  if (req.method === 'GET') {
    return res.json(db.users);
  }

  // POST new user
  if (req.method === 'POST') {
    const { id, username, role } = req.body;

    if (!id || !username || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Data tidak lengkap' 
      });
    }

    // Cek duplikat
    if (db.users.find(u => u.id === id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User sudah ada!' 
      });
    }

    // Tambah user baru
    const newUser = { id, username, role };
    db.users.push(newUser);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return res.json({ success: true, user: newUser });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};