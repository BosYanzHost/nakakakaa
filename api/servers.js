const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

  // GET all servers
  if (req.method === 'GET') {
    return res.json(db.servers);
  }

  // POST new server
  if (req.method === 'POST') {
    const input = req.body;
    
    const newServer = {
      id: 'srv_' + Date.now() + Math.random().toString(36).substr(2, 5),
      name: input.name || input.domain.replace('https://', '').replace('http://', ''),
      domain: input.domain,
      plta: input.plta,
      pltc: input.pltc,
      status: input.status || 'online',
      serverCount: input.serverCount || 0,
      userCount: input.userCount || 0,
      added_by: input.added_by || '',
      added_at: new Date().toISOString()
    };

    db.servers.push(newServer);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return res.json({ success: true, server: newServer });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { id, all, offline } = req.query;

    // Delete by ID
    if (id) {
      const index = db.servers.findIndex(s => s.id === id);
      if (index === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Server tidak ditemukan' 
        });
      }

      const deletedServer = db.servers[index];
      db.servers.splice(index, 1);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      return res.json({ success: true, server: deletedServer });
    }

    // Delete all servers
    if (all === 'true') {
      const count = db.servers.length;
      db.servers = [];
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      return res.json({ success: true, count });
    }

    // Delete offline servers
    if (offline === 'true') {
      const offlineServers = db.servers.filter(s => s.status === 'offline');
      const count = offlineServers.length;
      
      db.servers = db.servers.filter(s => s.status !== 'offline');
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      return res.json({ success: true, count });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};