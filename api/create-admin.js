const fs = require('fs');
const path = require('path');
const https = require('https');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, targetId, serverId, createdBy } = req.body;

  if (!username || !targetId || !serverId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Data tidak lengkap' 
    });
  }

  // Baca database
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const server = db.servers.find(s => s.id === serverId);
  if (!server) {
    return res.status(404).json({ 
      success: false, 
      message: 'Server tidak ditemukan' 
    });
  }

  const password = username + '117';
  const email = username + '@gmail.com';

  try {
    // CREATE ADMIN USER
    const userResponse = await request({
      hostname: server.domain.replace('https://', ''),
      path: '/api/application/users',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + server.plta
      }
    }, {
      email,
      username,
      first_name: username,
      last_name: 'Admin',
      language: 'en',
      root_admin: true,
      password
    });

    if (userResponse.statusCode !== 201) {
      throw new Error(userResponse.body?.errors?.[0]?.detail || 'Gagal membuat admin');
    }

    const user = userResponse.body.attributes;

    // Update user count di database
    const serverIndex = db.servers.findIndex(s => s.id === serverId);
    if (serverIndex !== -1) {
      db.servers[serverIndex].userCount = (db.servers[serverIndex].userCount || 0) + 1;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    }

    return res.json({
      success: true,
      data: {
        username: user.username,
        password,
        domain: server.domain,
        serverName: server.name,
        targetId
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Gagal membuat admin' 
    });
  }
};