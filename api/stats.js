const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dbPath = path.join(process.cwd(), 'data', 'db.json');

  if (!fs.existsSync(dbPath)) {
    return res.json({
      totalServers: 0,
      totalUsers: 0,
      activePanels: 0
    });
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const totalServers = db.servers.length;
  const onlineServers = db.servers.filter(s => s.status === 'online').length;
  const totalUsers = db.users.length;

  res.json({
    totalServers,
    totalUsers,
    activePanels: onlineServers * 10
  });
};