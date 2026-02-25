const fs = require('fs');
const path = require('path');
const https = require('https');

// Panel specs
const panelSpecs = {
  '1gb':  { memo: '1024', cpu: '30', disk: '1024' },
  '2gb':  { memo: '2048', cpu: '60', disk: '2048' },
  '3gb':  { memo: '3072', cpu: '90', disk: '3072' },
  '4gb':  { memo: '4048', cpu: '110', disk: '4048' },
  '5gb':  { memo: '5048', cpu: '140', disk: '5048' },
  '6gb':  { memo: '6048', cpu: '170', disk: '6048' },
  '7gb':  { memo: '7048', cpu: '200', disk: '7048' },
  '8gb':  { memo: '8048', cpu: '230', disk: '8048' },
  '9gb':  { memo: '9048', cpu: '260', disk: '9048' },
  '10gb': { memo: '10000', cpu: '500', disk: '15000' },
  'unli': { memo: '0', cpu: '0', disk: '0' }
};

// Helper untuk request HTTP/HTTPS
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

  const { panelName, targetId, serverId, spec, createdBy } = req.body;

  if (!panelName || !targetId || !serverId || !spec) {
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

  const specs = panelSpecs[spec];
  if (!specs) {
    return res.status(400).json({ 
      success: false, 
      message: 'Spesifikasi tidak valid' 
    });
  }

  const password = panelName + Math.floor(Math.random() * 1000);
  const email = panelName + '@gmail.com';

  try {
    // 1. CREATE USER
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
      username: panelName,
      first_name: panelName,
      last_name: panelName,
      language: 'en',
      password
    });

    if (userResponse.statusCode !== 201) {
      throw new Error(userResponse.body?.errors?.[0]?.detail || 'Gagal membuat user');
    }

    const user = userResponse.body.attributes;

    // 2. CREATE SERVER
    const serverResponse = await request({
      hostname: server.domain.replace('https://', ''),
      path: '/api/application/servers',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + server.plta
      }
    }, {
      name: panelName + spec,
      description: '',
      user: user.id,
      egg: 1,
      docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
      startup: 'npm start',
      environment: {
        INST: 'npm',
        USER_UPLOAD: '0',
        AUTO_UPDATE: '0',
        CMD_RUN: 'npm start'
      },
      limits: {
        memory: parseInt(specs.memo),
        swap: 0,
        disk: parseInt(specs.disk),
        io: 500,
        cpu: parseInt(specs.cpu)
      },
      feature_limits: {
        databases: 5,
        backups: 5,
        allocations: 1
      },
      deploy: {
        locations: [1],
        dedicated_ip: false,
        port_range: []
      }
    });

    if (serverResponse.statusCode !== 201) {
      // Rollback - delete user
      await request({
        hostname: server.domain.replace('https://', ''),
        path: '/api/application/users/' + user.id,
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + server.plta
        }
      });
      
      throw new Error(serverResponse.body?.errors?.[0]?.detail || 'Gagal membuat server');
    }

    const panel = serverResponse.body.attributes;

    // Update server count di database
    const serverIndex = db.servers.findIndex(s => s.id === serverId);
    if (serverIndex !== -1) {
      db.servers[serverIndex].serverCount = (db.servers[serverIndex].serverCount || 0) + 1;
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
        spec,
        targetId
      }
    });

  } catch (error) {
    console.error('Create panel error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Gagal membuat panel' 
    });
  }
};