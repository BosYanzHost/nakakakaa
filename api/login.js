const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Telegram ID diperlukan' 
      });
    }

    // Baca database
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    
    // Cek apakah file exists
    if (!fs.existsSync(dbPath)) {
      // Buat folder data jika belum ada
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // Buat file db.json default
      fs.writeFileSync(dbPath, JSON.stringify({ users: [], servers: [] }));
    }

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // Cari user
    const user = db.users.find(u => u.id === telegramId);

    if (user) {
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'ID Telegram tidak terdaftar! Hubungi owner.'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};