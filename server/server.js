const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const LZString = require('lz-string');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'bpjs-apotek-secret-key';
const ENCRYPTION_KEY = 'your-32-char-secret-key-for-encrypt';
const SETTINGS_DATA_PATH = path.join(__dirname, '../data/settings.json');
const LOGS_DATA_PATH = path.join(__dirname, '../data/logs.json');

// MySQL Database Configuration
// Load settings from JSON file
const fs = require('fs');
let settings = {};
try {
  const settingsData = fs.readFileSync(SETTINGS_DATA_PATH, 'utf8');
  settings = JSON.parse(settingsData);
} catch (error) {
  console.error('Error loading settings:', error);
}

// Helper function to check if data is encrypted (contains ':' which indicates IV:encrypted format)
const isEncrypted = (data) => {
  return typeof data === 'string' && data.includes(':') && data.length > 32;
};

// Decrypt password if encrypted
let dbPassword = settings.simrs_settings?.password || '';
if (dbPassword && isEncrypted(dbPassword)) {
  try {
    dbPassword = decrypt(dbPassword);
  } catch (error) {
    console.error('Failed to decrypt database password:', error);
    // Keep original value if decryption fails
  }
}

const dbConfig = {
  host: settings.simrs_settings?.host || 'localhost',
  user: settings.simrs_settings?.username || 'root',
  password: dbPassword || '',
  database: settings.simrs_settings?.database || 'mlite',
  port: settings.simrs_settings?.port || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// BPJS API Helper Functions
const stringEncrypt = (key, data) => {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

const stringDecrypt = (key, encryptedData) => {
  try {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    
    const textParts = encryptedData.split(':');
    if (textParts.length !== 2) {
      // Fallback for old format without IV
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encrypted = textParts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

const sendToBpjsApi = async (url, data, consid, secretkey, userkey, timestamp) => {
  try {
    const key = consid + secretkey + timestamp;
    const jsonData = JSON.stringify(data);
    const compressedData = LZString.compressToEncodedURIComponent(jsonData);
    const encryptedData = stringEncrypt(key, compressedData);
    
    const signature = crypto
      .createHmac('sha256', consid + '&' + timestamp)
      .update(encryptedData)
      .digest('base64');
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-cons-id': consid,
      'X-timestamp': timestamp,
      'X-signature': signature,
      'user_key': userkey
    };
    
    const response = await axios.post(url, `request=${encryptedData}`, {
      headers,
      timeout: 30000
    });
    
    if (response.data && response.data.metaData) {
      if (response.data.metaData.code === '200') {
        // Decrypt response if needed
        if (response.data.response) {
          try {
            const decryptedResponse = stringDecrypt(key, response.data.response);
            if (decryptedResponse) {
              const decompressedResponse = LZString.decompressFromEncodedURIComponent(decryptedResponse);
              if (decompressedResponse) {
                response.data.response = JSON.parse(decompressedResponse);
              }
            }
          } catch (decryptError) {
            console.error('Error decrypting BPJS response:', decryptError);
          }
        }
        
        return {
          success: true,
          data: response.data,
          message: response.data.metaData.message
        };
      } else {
        return {
          success: false,
          data: response.data,
          message: response.data.metaData.message
        };
      }
    } else {
      return {
        success: false,
        data: response.data,
        message: 'Invalid response format from BPJS API'
      };
    }
  } catch (error) {
    console.error('BPJS API Error:', error.message);
    return {
      success: false,
      data: null,
      message: error.response?.data?.metaData?.message || error.message
    };
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read users from JSON file
const getUsersData = () => {
  try {
    const usersPath = path.join(__dirname, '../data/user.json');
    const data = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users data:', error);
    return { users: [] };
  }
};

// Helper function to update users data
const updateUsersData = (usersData) => {
  try {
    const usersPath = path.join(__dirname, '../data/user.json');
    fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    return true;
  } catch (error) {
    console.error('Error updating users data:', error);
    return false;
  }
};

// Helper function to read settings data
const readSettingsData = () => {
  try {
    if (fs.existsSync(SETTINGS_DATA_PATH)) {
      const data = fs.readFileSync(SETTINGS_DATA_PATH, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading settings data:', error);
    return null;
  }
};

// Helper function to update settings data
const updateSettingsData = (settingsData) => {
  try {
    fs.writeFileSync(SETTINGS_DATA_PATH, JSON.stringify(settingsData, null, 2));
    return true;
  } catch (error) {
    console.error('Error updating settings data:', error);
    return false;
  }
};

// Helper function to log API calls
const logApiCall = (logEntry) => {
  try {
    let logs = [];
    
    // Read existing logs if file exists
    if (fs.existsSync(LOGS_DATA_PATH)) {
      const data = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
      logs = JSON.parse(data);
    }
    
    // Add new log entry
    logs.unshift(logEntry); // Add to beginning for newest first
    
    // Keep only last 1000 entries to prevent file from growing too large
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    
    // Write back to file
    fs.writeFileSync(LOGS_DATA_PATH, JSON.stringify(logs, null, 2));
    
    console.log('API call logged:', logEntry.operation);
    return true;
  } catch (error) {
    console.error('Error logging API call:', error);
    return false;
  }
};

// Helper function to generate unique log ID
const generateLogId = () => {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
};

// Encryption functions
const encrypt = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = textParts.join(':');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const usersData = getUsersData();
  const user = usersData.users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (!user.isActive) {
    return res.status(401).json({ error: 'Account is deactivated' });
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  updateUsersData(usersData);

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      email: user.email,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      lastLogin: user.lastLogin
    }
  });
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  const usersData = getUsersData();
  const user = usersData.users.find(u => u.id === req.user.id);

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      lastLogin: user.lastLogin
    }
  });
});

// Logout endpoint (optional - mainly for logging purposes)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Get user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const usersData = getUsersData();
  const user = usersData.users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BPJS Apotek Auth Server is running' });
});

// Get BPJS settings
app.get('/api/settings', authenticateToken, (req, res) => {
  try {
    const settingsData = readSettingsData();
    
    if (!settingsData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Settings not found' 
      });
    }

    // Helper function to check if data is encrypted (contains ':' which indicates IV:encrypted format)
    const isEncrypted = (data) => {
      return typeof data === 'string' && data.includes(':') && data.length > 32;
    };

    // Decrypt sensitive data before sending (only if encrypted)
    const bpjsSettings = { ...settingsData.bpjs_settings };
    if (bpjsSettings.consumerSecret) {
      if (isEncrypted(bpjsSettings.consumerSecret)) {
        try {
          bpjsSettings.consumerSecret = decrypt(bpjsSettings.consumerSecret);
        } catch (error) {
          console.error('Failed to decrypt consumerSecret:', error);
          // Keep original value if decryption fails
        }
      }
      // If not encrypted, keep the original plain text value
    }
    if (bpjsSettings.userKey) {
      if (isEncrypted(bpjsSettings.userKey)) {
        try {
          bpjsSettings.userKey = decrypt(bpjsSettings.userKey);
        } catch (error) {
          console.error('Failed to decrypt userKey:', error);
          // Keep original value if decryption fails
        }
      }
      // If not encrypted, keep the original plain text value
    }

    // Decrypt SIMRS settings if they exist
    let simrsSettings = null;
    if (settingsData.simrs_settings) {
      simrsSettings = { ...settingsData.simrs_settings };
      if (simrsSettings.password) {
        if (isEncrypted(simrsSettings.password)) {
          try {
            simrsSettings.password = decrypt(simrsSettings.password);
          } catch (error) {
            console.error('Failed to decrypt SIMRS password:', error);
            // Keep original value if decryption fails
          }
        }
        // If not encrypted, keep the original plain text value
      }
    }

    res.json({
      success: true,
      data: {
        bpjs_settings: bpjsSettings,
        simrs_settings: simrsSettings,
        bridging_simrs: settingsData.bridging_simrs || false
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update BPJS settings
app.put('/api/settings', authenticateToken, (req, res) => {
  try {
    const { bpjs_settings, bridging_simrs, simrs_settings } = req.body;
    
    if (!bpjs_settings) {
      return res.status(400).json({ 
        success: false, 
        message: 'BPJS settings are required' 
      });
    }

    // Validate required fields
    const requiredFields = ['baseUrl', 'consumerID', 'consumerSecret', 'userKey'];
    for (const field of requiredFields) {
      if (!bpjs_settings[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `${field} is required` 
        });
      }
    }

    let settingsData = readSettingsData() || { bpjs_settings: {} };
    
    // Encrypt sensitive data before saving
    const encryptedSettings = { ...bpjs_settings };
    encryptedSettings.consumerSecret = encrypt(bpjs_settings.consumerSecret);
    encryptedSettings.userKey = encrypt(bpjs_settings.userKey);
    encryptedSettings.lastUpdated = new Date().toISOString();
    encryptedSettings.updatedBy = req.user.username;

    // Update settings
    settingsData.bpjs_settings = encryptedSettings;
    
    // Update bridging_simrs if provided
    if (bridging_simrs !== undefined) {
      settingsData.bridging_simrs = bridging_simrs;
    }
    
    // Update simrs_settings if provided
    if (simrs_settings) {
      // Encrypt SIMRS password if provided
      const encryptedSimrsSettings = { ...simrs_settings };
      if (simrs_settings.password) {
        encryptedSimrsSettings.password = encrypt(simrs_settings.password);
      }
      encryptedSimrsSettings.lastUpdated = new Date().toISOString();
      encryptedSimrsSettings.updatedBy = req.user.username;
      settingsData.simrs_settings = encryptedSimrsSettings;
    }

    if (updateSettingsData(settingsData)) {
      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save settings' 
      });
    }
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Test BPJS connection
app.post('/api/settings/test-connection', authenticateToken, (req, res) => {
  try {
    const { baseUrl, consumerID, consumerSecret, userKey, kodePpkApotek } = req.body;
    
    if (!baseUrl || !consumerID || !consumerSecret || !userKey || !kodePpkApotek) {
      return res.status(400).json({ 
        success: false, 
        message: 'All BPJS credentials including Kode PPK Apotek are required for testing' 
      });
    }

    // Simulate connection test (in real implementation, you would make actual API call to BPJS)
    setTimeout(() => {
      // For demo purposes, we'll simulate a successful connection
      const isSuccess = Math.random() > 0.2; // 80% success rate for demo
      
      if (isSuccess) {
        res.json({
          success: true,
          message: 'Connection to BPJS API successful',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to connect to BPJS API. Please check your credentials.',
          timestamp: new Date().toISOString()
        });
      }
    }, 1000);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Test SIMRS database connection
app.post('/api/settings/test-simrs-connection', authenticateToken, async (req, res) => {
  try {
    const { host, port, database, username, password } = req.body;
    
    if (!host || !port || !database || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All database credentials are required for testing' 
      });
    }

    // Create test connection configuration
    const testConfig = {
      host: host,
      user: username,
      password: password,
      database: database,
      port: parseInt(port),
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    };

    let connection;
    try {
      // Test database connection
      connection = await mysql.createConnection(testConfig);
      
      // Test with a simple query
      await connection.execute('SELECT 1 as test');
      
      res.json({
        success: true,
        message: 'Connection to SIMRS database successful',
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      res.status(400).json({
        success: false,
        message: `Failed to connect to SIMRS database: ${dbError.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  } catch (error) {
    console.error('Test SIMRS connection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Save SIMRS settings
app.put('/api/settings/simrs', authenticateToken, (req, res) => {
  try {
    const { simrs_settings, bridging_simrs } = req.body;
    
    if (!simrs_settings) {
      return res.status(400).json({ 
        success: false, 
        message: 'SIMRS settings are required' 
      });
    }

    // Validate required fields if bridging is enabled
    if (bridging_simrs) {
      const requiredFields = ['host', 'port', 'database', 'username', 'password', 'simrs_type'];
      for (const field of requiredFields) {
        if (!simrs_settings[field]) {
          return res.status(400).json({ 
            success: false, 
            message: `${field} is required when bridging SIMRS is enabled` 
          });
        }
      }
    }

    let settingsData = readSettingsData() || { bpjs_settings: {} };
    
    // Encrypt sensitive data before saving
    const encryptedSimrsSettings = { ...simrs_settings };
    if (simrs_settings.password) {
      encryptedSimrsSettings.password = encrypt(simrs_settings.password);
    }
    encryptedSimrsSettings.lastUpdated = new Date().toISOString();
    encryptedSimrsSettings.updatedBy = req.user.username;

    // Update settings
    settingsData.simrs_settings = encryptedSimrsSettings;
    settingsData.bridging_simrs = bridging_simrs;

    if (updateSettingsData(settingsData)) {
      res.json({
        success: true,
        message: 'SIMRS settings saved successfully'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save SIMRS settings' 
      });
    }
  } catch (error) {
    console.error('Save SIMRS settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Fetch Obat Lokal endpoint
app.get('/api/obat-lokal', authenticateToken, async (req, res) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;
    
    // Read settings to check bridging_simrs
    const settings = readSettingsData();
    const bridgingSimrs = settings?.bridging_simrs || false;
    
    if (bridgingSimrs) {
      // Fetch from MySQL database
      let query = 'SELECT * FROM databarang WHERE status = ?';
      let params = ['1'];
      
      // Add search functionality if search term is provided
      if (search) {
        query += ' AND (nama_brng LIKE ? OR kode_brng LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      // Add ordering and pagination
      query += ' ORDER BY nama_brng ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const [rows] = await pool.execute(query, params);
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM databarang WHERE status = ?';
      let countParams = ['1'];
      
      if (search) {
        countQuery += ' AND (nama_brng LIKE ? OR kode_brng LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }
      
      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;
      
      // Simpan hasil query dalam format JSON
      const resultData = {
        timestamp: new Date().toISOString(),
        search_params: {
          search: search || null,
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        query_result: rows,
        total_records: total,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        },
        query_executed: query.replace(/\s+/g, ' ').trim()
      };
      
      // Save to file and return response for database mode
      const dataObatLokalPath = path.join(__dirname, '../data/obat-lokal');
      let saveSuccess = false;
      let saveErrorMessage = null;
      
      try {
        if (!fs.existsSync(dataObatLokalPath)) {
          fs.mkdirSync(dataObatLokalPath, { recursive: true });
        }
        
        const searchParam = search ? `_search_${search.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        const filename = `obat_lokal${searchParam}_${Date.now()}.json`;
        const filePath = path.join(dataObatLokalPath, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(resultData, null, 2), 'utf8');
        saveSuccess = true;
      } catch (saveError) {
        console.error('Error saving obat lokal data to JSON:', saveError);
        saveErrorMessage = saveError.message;
      }
      
      res.json({
        success: true,
        message: saveSuccess ? 'Data obat lokal berhasil diambil dan disimpan dalam format JSON' : 'Data obat lokal berhasil diambil tetapi gagal disimpan ke file JSON',
        data: rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        },
        save_status: {
          success: saveSuccess,
          error: saveErrorMessage,
          path: dataObatLokalPath
        }
      });
    } else {
      // Fetch from local file obat_lokal.json
      const obatLokalFilePath = path.join(__dirname, '../data/obat_lokal.json');
      
      if (!fs.existsSync(obatLokalFilePath)) {
        // Return empty data if file doesn't exist
        return res.json({
          success: true,
          message: 'No local obat data found',
          data: [],
          pagination: {
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: false
          }
        });
      }
      
      try {
        const fileData = JSON.parse(fs.readFileSync(obatLokalFilePath, 'utf8'));
        let obatData = fileData.query_result || [];
        
        // Apply search filter if provided
        if (search) {
          const searchLower = search.toLowerCase();
          obatData = obatData.filter(obat => 
            obat.nama_brng?.toLowerCase().includes(searchLower) ||
            obat.kode_brng?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply pagination
        const total = obatData.length;
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedData = obatData.slice(startIndex, endIndex);
        
        res.json({
          success: true,
          message: 'Data obat lokal berhasil diambil dari file JSON',
          data: paginatedData,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: endIndex < total
          }
        });
      } catch (fileError) {
        console.error('Error reading obat_lokal.json:', fileError);
        res.json({
          success: true,
          message: 'Error reading local obat data, returning empty result',
          data: [],
          pagination: {
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: false
          }
        });
      }
    }
  } catch (error) {
    console.error('Fetch obat lokal error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch obat lokal data',
      error: error.message 
    });
  }
});

// Save new obat data to obat_lokal.json
app.post('/api/obat-lokal', authenticateToken, async (req, res) => {
  try {
    const obatData = req.body;
    const obatLokalPath = path.join(__dirname, '../data/obat_lokal.json');
    
    // Read existing data
    let existingData = {
      timestamp: new Date().toISOString(),
      search_params: {
        search: null,
        limit: 100,
        offset: 0
      },
      query_result: [],
      total_records: 0,
      pagination: {
        total: 0,
        limit: 100,
        offset: 0,
        has_next: false,
        has_prev: false
      }
    };
    
    if (fs.existsSync(obatLokalPath)) {
      const fileContent = fs.readFileSync(obatLokalPath, 'utf8');
      existingData = JSON.parse(fileContent);
    }
    
    // Check if obat already exists
    const existingIndex = existingData.query_result.findIndex(
      item => item.kode_brng === obatData.kode_brng
    );
    
    if (existingIndex === -1) {
      // Add new obat
      existingData.query_result.push({
        kode_brng: obatData.kode_brng,
        nama_brng: obatData.nama_brng,
        kode_sat: obatData.kode_sat || '---',
        letak_barang: obatData.letak_barang || '-'
      });
      
      // Update counts
      existingData.total_records = existingData.query_result.length;
      existingData.pagination.total = existingData.query_result.length;
      existingData.timestamp = new Date().toISOString();
      
      // Save to file
      fs.writeFileSync(obatLokalPath, JSON.stringify(existingData, null, 2));
      
      res.json({
        success: true,
        message: 'Obat data saved successfully',
        data: obatData
      });
    } else {
      res.json({
        success: true,
        message: 'Obat already exists',
        data: obatData
      });
    }
    
  } catch (error) {
    console.error('Save obat lokal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save obat data',
      error: error.message
    });
  }
});

// Fetch DPHO data from BPJS API
app.get('/api/dpho', authenticateToken, async (req, res) => {
  try {
    const { search = '', limit = 100, offset = 0 } = req.query;
    
    // Get BPJS settings
    const settingsPath = path.join(__dirname, '../data/settings.json');
    let bpjsSettings = {};
    
    try {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const allSettings = JSON.parse(settingsData);
      bpjsSettings = { ...allSettings.bpjs_settings };
      
      // Helper function to check if data is encrypted (contains ':' which indicates IV:encrypted format)
      const isEncrypted = (data) => {
        return typeof data === 'string' && data.includes(':') && data.length > 32;
      };
      
      // Decrypt sensitive data before using (only if encrypted)
      if (bpjsSettings.consumerSecret) {
        if (isEncrypted(bpjsSettings.consumerSecret)) {
          try {
            bpjsSettings.consumerSecret = decrypt(bpjsSettings.consumerSecret);
          } catch (error) {
            console.error('Failed to decrypt consumerSecret:', error);
            // Keep original value if decryption fails
          }
        }
      }
      if (bpjsSettings.userKey) {
        if (isEncrypted(bpjsSettings.userKey)) {
          try {
            bpjsSettings.userKey = decrypt(bpjsSettings.userKey);
          } catch (error) {
            console.error('Failed to decrypt userKey:', error);
            // Keep original value if decryption fails
          }
        }
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'BPJS settings not configured' 
      });
    }
    
    if (!bpjsSettings.baseUrl || !bpjsSettings.consumerID || !bpjsSettings.consumerSecret || !bpjsSettings.userKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'BPJS credentials incomplete' 
      });
    }
    
    // Generate timestamp and signature
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Use consumer secret directly
    const stringToSign = bpjsSettings.consumerID + '&' + timestamp;
    const signature = crypto.createHmac('sha256', bpjsSettings.consumerSecret)
      .update(stringToSign)
      .digest('base64');
    
    console.log('Auth Debug:', {
      consumerID: bpjsSettings.consumerID,
      consumerSecret: bpjsSettings.consumerSecret ? '***' : 'undefined',
      timestamp: timestamp,
      stringToSign: stringToSign,
      signature: signature
    });
    
    // Prepare BPJS API request
    const bpjsUrl = `${bpjsSettings.baseUrl}/referensi/dpho`;
    const headers = {
      'X-cons-id': bpjsSettings.consumerID,
      'X-timestamp': timestamp.toString(),
      'X-signature': signature,
      'user_key': bpjsSettings.userKey,
      'Content-Type': 'application/json; charset=utf-8'
    };
    
    // Add kodePpkApotek if available
    if (bpjsSettings.kodePpkApotek) {
      headers['X-kode-ppk'] = bpjsSettings.kodePpkApotek;
    }
    
    console.log('Fetching DPHO from BPJS:', bpjsUrl);
    
    // Log API call start
    const startTime = Date.now();
    const logId = generateLogId();
    
    const response = await fetch(bpjsUrl, {
      method: 'GET',
      headers: headers
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`BPJS API error: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log('Raw response length:', responseText.length);
    
    // Parse the initial JSON response
    let initialResponse;
    try {
      initialResponse = JSON.parse(responseText);
    } catch (error) {
      throw new Error('Failed to parse initial BPJS response');
    }
    
    // Check if response contains compressed data
    let bpjsData;
    if (initialResponse.response && typeof initialResponse.response === 'string') {
      console.log('Found compressed data in response field');
      
      // Decrypt and decompress the response field using BPJS method
        try {
          const encryptedData = initialResponse.response;
          
          console.log('Encrypted data preview:', encryptedData.substring(0, 100));
          console.log('Encrypted data length:', encryptedData.length);
          
          // Generate key using SHA-256 (consId + secretKey + timestamp)
          const keyString = bpjsSettings.consumerID + bpjsSettings.consumerSecret + timestamp;
          const hashKey = crypto.createHash('sha256').update(keyString).digest();
          
          // Create IV from first 16 bytes of hashKey
          const iv = Buffer.from(hashKey.slice(0, 16));
          
          // Create SecretKey from hashKey
          const key = hashKey;
          
          console.log('Attempting AES-256-CBC decryption...');
          
          // Decrypt using AES-256-CBC with PKCS5Padding
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          let decrypted = decipher.update(Buffer.from(encryptedData, 'base64'));
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          
          console.log('Decryption successful, attempting LZ-string decompression...');
          
          // Decompress using LZ-string
          const decompressed = LZString.decompressFromEncodedURIComponent(decrypted.toString('utf8'));
          
          if (decompressed && decompressed.trim()) {
            console.log('Successfully decrypted and decompressed response, length:', decompressed.length);
            const decompressedData = JSON.parse(decompressed);
            
            // Reconstruct the full response
            bpjsData = {
              ...initialResponse,
              response: decompressedData
            };
          } else {
            throw new Error('Decompression failed after successful decryption');
          }
        } catch (error) {
          console.error('Decryption/Decompression error:', error.message);
          throw new Error('Failed to decrypt and decompress BPJS response');
        }
    } else {
      // Response is not compressed
      console.log('Response is not compressed');
      bpjsData = initialResponse;
    }
    
    if (!bpjsData.response || !bpjsData.response.list) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid BPJS response format',
        data: bpjsData 
      });
    }
    
    let dphoList = bpjsData.response.list;
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      dphoList = dphoList.filter(item => 
        item.namaobat.toLowerCase().includes(searchLower) ||
        item.kodeobat.toLowerCase().includes(searchLower) ||
        (item.generik && item.generik.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply pagination
    const total = dphoList.length;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = dphoList.slice(startIndex, endIndex);
    
    // Log successful API call
    const logEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Get DPHO',
      method: 'GET',
      endpoint: '/referensi/dpho',
      requestHeaders: {
        'X-cons-id': headers['X-cons-id'],
        'X-timestamp': headers['X-timestamp'],
        'X-signature': headers['X-signature'] ? '***' : undefined,
        'user_key': headers['user_key'] ? '***' : undefined,
        'Content-Type': headers['Content-Type']
      },
      requestBody: null,
      responseStatus: response.status,
      responseHeaders: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      },
      responseBody: {
        success: true,
        totalRecords: total,
        returnedRecords: paginatedData.length,
        dataRaw: bpjsData,
        metaData: bpjsData.metaData
      },
      duration: duration,
      success: true
    };
    
    logApiCall(logEntry);
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < total
      },
      metaData: bpjsData.metaData
    });
    
  } catch (error) {
    console.error('Fetch DPHO error:', error);
    
    // Log failed API call if we have the necessary data
    if (typeof startTime !== 'undefined' && typeof logId !== 'undefined') {
      const errorEndTime = Date.now();
      const errorDuration = errorEndTime - startTime;
      
      const errorLogEntry = {
        id: logId,
        timestamp: new Date().toISOString(),
        operation: 'Get DPHO',
        method: 'GET',
        endpoint: '/referensi/dpho',
        requestHeaders: typeof headers !== 'undefined' ? {
          'X-cons-id': headers['X-cons-id'],
          'X-timestamp': headers['X-timestamp'],
          'X-signature': headers['X-signature'] ? '***' : undefined,
          'user_key': headers['user_key'] ? '***' : undefined,
          'Content-Type': headers['Content-Type']
        } : {},
        requestBody: null,
        responseStatus: typeof response !== 'undefined' ? response.status : 0,
        responseHeaders: {},
        responseBody: {
          success: false,
          error: error.message
        },
        duration: errorDuration,
        success: false
      };
      
      logApiCall(errorLogEntry);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch DPHO data',
      error: error.message 
    });
  }
});

// Get monitoring klaim endpoint
app.get('/api/monitoring/klaim/:bulan/:tahun/:jenisObat/:status', async (req, res) => {
  try {
    const { bulan, tahun, jenisObat, status } = req.params;
    
    // Get BPJS settings
    const settingsPath = path.join(__dirname, '../data/settings.json');
    let bpjsSettings = {};
    
    try {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const allSettings = JSON.parse(settingsData);
      bpjsSettings = { ...allSettings.bpjs_settings };
      
      // Helper function to check if data is encrypted (contains ':' which indicates IV:encrypted format)
      const isEncrypted = (data) => {
        return typeof data === 'string' && data.includes(':') && data.length > 32;
      };
      
      // Decrypt sensitive data before using (only if encrypted)
      if (bpjsSettings.consumerSecret) {
        if (isEncrypted(bpjsSettings.consumerSecret)) {
          try {
            bpjsSettings.consumerSecret = decrypt(bpjsSettings.consumerSecret);
          } catch (error) {
            console.error('Failed to decrypt consumerSecret:', error);
            // Keep original value if decryption fails
          }
        }
      }
      if (bpjsSettings.userKey) {
        if (isEncrypted(bpjsSettings.userKey)) {
          try {
            bpjsSettings.userKey = decrypt(bpjsSettings.userKey);
          } catch (error) {
            console.error('Failed to decrypt userKey:', error);
            // Keep original value if decryption fails
          }
        }
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'BPJS settings not configured' 
      });
    }
    
    if (!bpjsSettings.baseUrl || !bpjsSettings.consumerID || !bpjsSettings.consumerSecret || !bpjsSettings.userKey || !bpjsSettings.kodePpkApotek) {
      return res.status(400).json({ 
        success: false, 
        message: 'BPJS credentials incomplete' 
      });
    }
    
    // Generate timestamp and signature
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = bpjsSettings.consumerID + '&' + timestamp;
    const signature = crypto.createHmac('sha256', bpjsSettings.consumerSecret)
      .update(stringToSign)
      .digest('base64');
    
    // Prepare BPJS API request for monitoring klaim
    const bpjsUrl = `${bpjsSettings.baseUrl}/monitoring/klaim/${bulan}/${tahun}/${jenisObat}/${status}`;
    const headers = {
      'X-cons-id': bpjsSettings.consumerID,
      'X-timestamp': timestamp.toString(),
      'X-signature': signature,
      'user_key': bpjsSettings.userKey,
      'X-kode-ppk': bpjsSettings.kodePpkApotek,
      'Content-Type': 'application/json; charset=utf-8'
    };
    
    console.log('Fetching Monitoring Klaim from BPJS:', bpjsUrl);
    
    const response = await fetch(bpjsUrl, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      console.log(`BPJS API returned status: ${response.status}`);
      if (response.status === 504) {
        throw new Error('BPJS API Gateway Timeout - Service temporarily unavailable');
      } else if (response.status === 503) {
        throw new Error('BPJS API Service Unavailable - Please try again later');
      } else if (response.status === 401) {
        throw new Error('BPJS API Authentication failed - Please check credentials');
      } else {
        throw new Error(`BPJS API error! status: ${response.status}`);
      }
    }
    
    const rawData = await response.text();
    console.log('Raw monitoring response length:', rawData.length);
    
    let responseData;
    try {
      responseData = JSON.parse(rawData);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from BPJS API');
    }
    
    // Check if response contains encrypted data
    if (responseData && responseData.response && typeof responseData.response === 'string') {
      console.log('Found encrypted data in response field');
      console.log('Encrypted data preview:', responseData.response.substring(0, 100));
      console.log('Encrypted data length:', responseData.response.length);
      
      try {
        // Decrypt the response using the same method as DPHO endpoint
        console.log('Attempting AES-256-CBC decryption...');
        
        // Generate key using SHA-256 (consId + secretKey + timestamp)
        const keyString = bpjsSettings.consumerID + bpjsSettings.consumerSecret + timestamp;
        const hashKey = crypto.createHash('sha256').update(keyString).digest();
        
        // Create IV from first 16 bytes of hashKey
        const iv = Buffer.from(hashKey.slice(0, 16));
        
        // Create SecretKey from hashKey
        const key = hashKey;
        
        const encrypted = responseData.response;
        
        // Decrypt using AES-256-CBC with PKCS5Padding
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        console.log('Decryption successful, attempting LZ-string decompression...');
        
        // Decompress using LZ-string
        const decompressed = LZString.decompressFromEncodedURIComponent(decrypted.toString('utf8'));
        
        if (decompressed) {
          console.log('Successfully decrypted and decompressed response, length:', decompressed.length);
          responseData = JSON.parse(decompressed);
        } else {
          console.log('Decompression failed, using decrypted data as-is');
          responseData = JSON.parse(decrypted.toString('utf8'));
        }
      } catch (decryptError) {
        console.error('Decryption/decompression failed:', decryptError);
        throw new Error('Failed to decrypt response data');
      }
    }
    
    // Log the API call
    const logId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const logEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Get Monitoring Klaim',
      method: 'GET',
      endpoint: `/monitoring/klaim/${bulan}/${tahun}/${jenisObat}/${status}`,
      requestHeaders: {
        'X-cons-id': headers['X-cons-id'],
        'X-timestamp': headers['X-timestamp'],
        'X-signature': '***',
        'user_key': '***',
        'X-kode-ppk': headers['X-kode-ppk'],
        'Content-Type': headers['Content-Type']
      },
      requestBody: null,
      responseStatus: response.status,
      responseHeaders: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      },
      responseBody: {
        success: true,
        message: 'Monitoring klaim data retrieved successfully',
        dataRaw: responseData,
        dataCount: responseData?.response?.rekap?.jumlahdata || 0
      },
      duration: 0,
      success: true
    };
    
    // Save log
    let logs = [];
    if (fs.existsSync(LOGS_DATA_PATH)) {
      const existingData = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
      logs = JSON.parse(existingData);
    }
    logs.push(logEntry);
    fs.writeFileSync(LOGS_DATA_PATH, JSON.stringify(logs, null, 2));
    console.log('API call logged: Get Monitoring Klaim');
    
    res.json({
      success: true,
      data: responseData,
      dataRaw: responseData
    });
    
  } catch (error) {
    console.error('Monitoring klaim error:', error);
    
    // Log error
    const logId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const errorLogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Get Monitoring Klaim',
      method: 'GET',
      endpoint: `/monitoring/klaim/${req.params.bulan}/${req.params.tahun}/${req.params.jenisObat}/${req.params.status}`,
      requestHeaders: {},
      requestBody: null,
      responseStatus: 0,
      responseHeaders: {},
      responseBody: {
        success: false,
        error: error.message
      },
      duration: 0,
      success: false
    };
    
    let logs = [];
    if (fs.existsSync(LOGS_DATA_PATH)) {
      const existingData = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
      logs = JSON.parse(existingData);
    }
    logs.push(errorLogEntry);
    fs.writeFileSync(LOGS_DATA_PATH, JSON.stringify(logs, null, 2));
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch monitoring klaim data',
      error: error.message 
    });
  }
});

// Get SEP data from BPJS API endpoint
app.get('/api/sep/:noSep', async (req, res) => {
  try {
    const { noSep } = req.params;
    
    if (!noSep || noSep.length !== 19) {
      return res.status(400).json({
        success: false,
        message: 'Parameter noSep harus 19 digit'
      });
    }

    // Directly use BPJS API for all SEP requests

    // Read BPJS settings for real API calls
    const settingsData = readSettingsData();
    let bpjsSettings = { ...settingsData?.bpjs_settings };
    if (!bpjsSettings) {
      return res.status(500).json({
        success: false,
        message: 'BPJS settings not configured'
      });
    }
    
    // Helper function to check if data is encrypted (contains ':' which indicates IV:encrypted format)
    const isEncrypted = (data) => {
      return typeof data === 'string' && data.includes(':') && data.length > 32;
    };
    
    // Decrypt sensitive data before using (only if encrypted)
    if (bpjsSettings.consumerSecret) {
      if (isEncrypted(bpjsSettings.consumerSecret)) {
        try {
          bpjsSettings.consumerSecret = decrypt(bpjsSettings.consumerSecret);
        } catch (error) {
          console.error('Failed to decrypt consumerSecret:', error);
          // Keep original value if decryption fails
        }
      }
    }
    if (bpjsSettings.userKey) {
      if (isEncrypted(bpjsSettings.userKey)) {
        try {
          bpjsSettings.userKey = decrypt(bpjsSettings.userKey);
        } catch (error) {
          console.error('Failed to decrypt userKey:', error);
          // Keep original value if decryption fails
        }
      }
    }

    // Generate timestamp and signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = bpjsSettings.consumerID + '&' + timestamp;
    const signature = crypto
      .createHmac('sha256', bpjsSettings.consumerSecret + '&' + bpjsSettings.userKey)
      .update(stringToSign)
      .digest('base64');

    // Prepare headers
    const headers = {
      'X-cons-id': bpjsSettings.consumerID,
      'X-timestamp': timestamp,
      'X-signature': signature,
      'user_key': bpjsSettings.userKey,
      'X-kode-ppk': bpjsSettings.kodePpkApotek,
      'Content-Type': 'application/json; charset=utf-8'
    };

    // Make API call to BPJS
    const url = `${bpjsSettings.baseUrl}/sep/${noSep}`;
    console.log('Fetching SEP data from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      console.log(`BPJS API returned status: ${response.status}`);
      if (response.status === 504) {
        throw new Error('BPJS API Gateway Timeout - Service temporarily unavailable');
      } else if (response.status === 503) {
        throw new Error('BPJS API Service Unavailable - Please try again later');
      } else if (response.status === 401) {
        throw new Error('BPJS API Authentication failed - Please check credentials');
      } else {
        throw new Error(`BPJS API error! status: ${response.status}`);
      }
    }

    const rawData = await response.text();
    console.log('Raw response received, length:', rawData.length);
    console.log('Raw response content:', rawData.substring(0, 500) + '...');
    
    let responseData;
    try {
      responseData = JSON.parse(rawData);
      console.log('Parsed response structure:', JSON.stringify(responseData, null, 2).substring(0, 1000) + '...');
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from BPJS API');
    }
    
    // Check if response contains encrypted data
    if (responseData && responseData.response && typeof responseData.response === 'string') {
      console.log('Found encrypted data in response field');
      console.log('Encrypted response length:', responseData.response.length);
      console.log('Encrypted response preview:', responseData.response.substring(0, 100) + '...');
      
      try {
        // Decrypt the response using the same method as DPHO endpoint
        console.log('Attempting AES-256-CBC decryption...');
        
        // Generate key using SHA-256 (consId + secretKey + timestamp)
        const keyString = bpjsSettings.consumerID + bpjsSettings.consumerSecret + timestamp;
        const hashKey = crypto.createHash('sha256').update(keyString).digest();
        
        // Create IV from first 16 bytes of hashKey
        const iv = Buffer.from(hashKey.slice(0, 16));
        
        // Create SecretKey from hashKey
        const key = hashKey;
        
        const encrypted = responseData.response;
        
        // Decrypt using AES-256-CBC with PKCS5Padding
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        console.log('Decryption successful, attempting LZ-string decompression...');
        
        // Decompress using LZ-string
        const decompressed = LZString.decompressFromEncodedURIComponent(decrypted.toString('utf8'));
        
        if (decompressed) {
          console.log('Successfully decrypted and decompressed response');
          responseData = JSON.parse(decompressed);
        } else {
          console.log('Decompression failed, using decrypted data as-is');
          responseData = JSON.parse(decrypted.toString('utf8'));
        }
      } catch (decryptError) {
        console.error('Decryption/decompression failed:', decryptError);
        throw new Error('Failed to decrypt response data');
      }
    }
    
    // Log the API call
    const logId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const logEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Get SEP Data',
      method: 'GET',
      endpoint: `/sep/${noSep}`,
      requestHeaders: {
        'X-cons-id': headers['X-cons-id'],
        'X-timestamp': headers['X-timestamp'],
        'X-signature': '***',
        'user_key': '***',
        'X-kode-ppk': headers['X-kode-ppk'],
        'Content-Type': headers['Content-Type']
      },
      requestBody: null,
      responseStatus: response.status,
      responseHeaders: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      },
      responseBody: {
        success: true,
        message: 'SEP data retrieved successfully',
        dataRaw: responseData
      },
      duration: 0,
      success: true
    };
    
    // Save log
    let logs = [];
    if (fs.existsSync(LOGS_DATA_PATH)) {
      const existingData = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
      logs = JSON.parse(existingData);
    }
    logs.push(logEntry);
    fs.writeFileSync(LOGS_DATA_PATH, JSON.stringify(logs, null, 2));
    console.log('API call logged: Get SEP Data');
    
    res.json({
      success: true,
      data: responseData,
      dataRaw: responseData
    });
    
  } catch (error) {
    console.error('SEP data error:', error);
    
    // Log error
    const logId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const errorLogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Get SEP Data',
      method: 'GET',
      endpoint: `/sep/${req.params.noSep}`,
      requestHeaders: {},
      requestBody: null,
      responseStatus: 0,
      responseHeaders: {},
      responseBody: {
        success: false,
        error: error.message
      },
      duration: 0,
      success: false
    };
    
    let logs = [];
    if (fs.existsSync(LOGS_DATA_PATH)) {
      const existingData = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
      logs = JSON.parse(existingData);
    }
    logs.push(errorLogEntry);
    fs.writeFileSync(LOGS_DATA_PATH, JSON.stringify(logs, null, 2));
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch SEP data',
      error: error.message 
    });
  }
});

// Get data resep endpoint
app.post('/api/data-resep', async (req, res) => {
  try {
    const { no_rawat } = req.body;
    
    // If no_rawat is not provided, return empty data (for bridging_simrs = false case)
    if (!no_rawat) {
      return res.json({
        success: true,
        message: 'No prescription data requested (bridging_simrs disabled)',
        data: [],
        total: 0
      });
    }

    // Directly use database for all prescription requests

    // Read mapping data from JSON file
    const mappingPath = path.join(__dirname, '../data/mapping_obat.json');
    let mappingData = { mappings: [] };
    
    if (fs.existsSync(mappingPath)) {
      const mappingContent = fs.readFileSync(mappingPath, 'utf8');
      mappingData = JSON.parse(mappingContent);
    }

    // Create mapping lookup for faster access
    const mappingLookup = {};
    mappingData.mappings.forEach(mapping => {
      mappingLookup[mapping.localCode] = {
        kd_obat_bpjs: mapping.bpjsCode,
        nama_obat_bpjs: mapping.bpjsName
      };
    });

    // SQL query for prescription data
    const query = `
      SELECT 
        ro.no_resep, 
        ro.tgl_perawatan, 
        ro.jam, 
        ro.tgl_peresepan, 
        ro.jam_peresepan, 
        ro.status, 
        ro.tgl_penyerahan, 
        ro.jam_penyerahan, 
        'non_racikan' as jenis_resep, 
        rd.kode_brng, 
        rd.jml, 
        rd.aturan_pakai, 
        db.nama_brng as nama_item, 
        NULL as no_racik, 
        NULL as nama_racik, 
        NULL as kd_racik, 
        NULL as jml_dr, 
        NULL as nm_racik, 
        NULL as detail_racikan, 
        NULL as kd_obat_bpjs, 
        NULL as nama_obat_bpjs 
      FROM resep_obat ro 
      LEFT JOIN resep_dokter rd ON ro.no_resep = rd.no_resep 
      LEFT JOIN databarang db ON rd.kode_brng = db.kode_brng 
      WHERE rd.kode_brng IS NOT NULL 
      AND ro.no_rawat = ? 
      
      UNION ALL 
      
      SELECT 
        ro.no_resep, 
        ro.tgl_perawatan, 
        ro.jam, 
        ro.tgl_peresepan, 
        ro.jam_peresepan, 
        ro.status, 
        ro.tgl_penyerahan, 
        ro.jam_penyerahan, 
        'racikan' as jenis_resep, 
        NULL as kode_brng, 
        NULL as jml, 
        rdr.aturan_pakai, 
        rdr.nama_racik as nama_item, 
        rdr.no_racik, 
        rdr.nama_racik, 
        rdr.kd_racik, 
        rdr.jml_dr, 
        mr.nm_racik, 
        ( 
          SELECT JSON_ARRAYAGG( 
            JSON_OBJECT( 
              'kode_brng', rdrd.kode_brng, 
              'jml', rdrd.jml, 
              'nama_brng', db.nama_brng 
            ) 
          ) 
          FROM resep_dokter_racikan_detail rdrd 
          LEFT JOIN databarang db ON rdrd.kode_brng = db.kode_brng 
          WHERE rdrd.no_resep = rdr.no_resep AND rdrd.no_racik = rdr.no_racik 
        ) as detail_racikan, 
        NULL as kd_obat_bpjs, 
        NULL as nama_obat_bpjs 
      FROM resep_obat ro 
      LEFT JOIN resep_dokter_racikan rdr ON ro.no_resep = rdr.no_resep 
      LEFT JOIN metode_racik mr ON rdr.kd_racik = mr.kd_racik 
      WHERE rdr.no_racik IS NOT NULL 
      AND ro.no_rawat = ? 
      ORDER BY no_resep, jenis_resep, no_racik
    `;

    // Execute query
    const [rows] = await pool.execute(query, [no_rawat, no_rawat]);
    
    // Process results and add mapping data
    const processedData = rows.map(row => {
      const result = { ...row };
      
      // Add mapping data for non-racikan items
      if (row.jenis_resep === 'non_racikan' && row.kode_brng && mappingLookup[row.kode_brng]) {
        result.kd_obat_bpjs = mappingLookup[row.kode_brng].kd_obat_bpjs;
        result.nama_obat_bpjs = mappingLookup[row.kode_brng].nama_obat_bpjs;
      }
      
      // Add mapping data for racikan detail items
      if (row.jenis_resep === 'racikan' && row.detail_racikan) {
        try {
          const detailArray = JSON.parse(row.detail_racikan);
          const updatedDetail = detailArray.map(detail => {
            const mapping = mappingLookup[detail.kode_brng];
            return {
              ...detail,
              kd_obat_bpjs: mapping ? mapping.kd_obat_bpjs : null,
              nama_obat_bpjs: mapping ? mapping.nama_obat_bpjs : null
            };
          });
          result.detail_racikan = JSON.stringify(updatedDetail);
        } catch (e) {
          console.error('Error parsing detail_racikan JSON:', e);
        }
      }
      
      return result;
    });

    // Simpan hasil query dalam format JSON
    const resultData = {
      timestamp: new Date().toISOString(),
      no_rawat: no_rawat,
      query_result: processedData,
      total_records: processedData.length,
      query_executed: query.replace(/\s+/g, ' ').trim()
    };

    // Simpan ke file JSON
    const dataResepPath = path.join(__dirname, '../data/resep');
    console.log('Attempting to save to path:', dataResepPath);
    
    let saveSuccess = false;
    let saveErrorMessage = null;
    
    try {
      // Pastikan direktori ada
      if (!fs.existsSync(dataResepPath)) {
        console.log('Creating directory:', dataResepPath);
        fs.mkdirSync(dataResepPath, { recursive: true });
      }
      
      // Cek apakah direktori berhasil dibuat dan dapat diakses
      const stats = fs.statSync(dataResepPath);
      if (!stats.isDirectory()) {
        throw new Error('Path exists but is not a directory');
      }
      
      const filename = `resep_${no_rawat.replace(/\//g, '_')}_${Date.now()}.json`;
      const filePath = path.join(dataResepPath, filename);
      
      console.log('Attempting to write file:', filePath);
      fs.writeFileSync(filePath, JSON.stringify(resultData, null, 2), 'utf8');
      
      // Verifikasi file berhasil ditulis
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        console.log(`Data resep berhasil disimpan ke: ${filePath} (${fileStats.size} bytes)`);
        saveSuccess = true;
      } else {
        throw new Error('File was not created successfully');
      }
    } catch (saveError) {
      console.error('Error saving prescription data to JSON:', saveError);
      saveErrorMessage = saveError.message;
    }

    res.json({
      success: true,
      message: saveSuccess ? 'Data resep berhasil diambil dan disimpan dalam format JSON' : 'Data resep berhasil diambil tetapi gagal disimpan ke file JSON',
      data: processedData,
      total: processedData.length,
      save_status: {
        success: saveSuccess,
        error: saveErrorMessage,
        path: dataResepPath
      }
    });

  } catch (error) {
    console.error('Error fetching prescription data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data resep',
      error: error.message
    });
  }
});

// Get logs data endpoint
app.get('/api/logs', authenticateToken, (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    let logs = [];
    
    // Read logs if file exists
    if (fs.existsSync(LOGS_DATA_PATH)) {
      const data = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
      logs = JSON.parse(data);
    }
    
    // Apply pagination
    const total = logs.length;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = logs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < total
      }
    });
  } catch (error) {
    console.error('Error reading logs data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to read logs data',
      error: error.message 
    });
  }
});

// API endpoint untuk mendapatkan statistik dashboard
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    if (!fs.existsSync(LOGS_DATA_PATH)) {
      return res.json({
        success: true,
        data: {
          totalResepHariIni: 0,
          klaimDisetujui: 0,
          menungguVerifikasi: 0,
          pasienAktif: 0,
          totalOperations: 0
        }
      });
    }
    
    const logsData = fs.readFileSync(LOGS_DATA_PATH, 'utf8');
    const logs = JSON.parse(logsData);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log('Analyzing logs for date:', today);
    
    // Initialize counters
    let totalResepHariIni = 0;
    let klaimDisetujui = 0;
    let menungguVerifikasi = 0;
    let pasienAktifSet = new Set();
    
    // Analyze logs
    logs.forEach(log => {
      const logDate = log.timestamp ? log.timestamp.split('T')[0] : null;
      
      // Count operations for today
      if (logDate === today) {
        if (log.operation && log.operation.includes('SEP')) {
          totalResepHariIni++;
        }
        
        // Extract patient info for active patients count
        if (log.responseBody && typeof log.responseBody === 'object') {
          if (log.responseBody.noka) {
            pasienAktifSet.add(log.responseBody.noka);
          }
          if (log.responseBody.peserta && log.responseBody.peserta.noKartu) {
            pasienAktifSet.add(log.responseBody.peserta.noKartu);
          }
        }
      }
      
      // Count claims from monitoring data
      if (log.operation === 'Get Monitoring Klaim' && log.responseBody && log.responseBody.listsep) {
        log.responseBody.listsep.forEach(sep => {
          if (sep.biayasetujui && sep.biayasetujui > 0) {
            klaimDisetujui++;
          } else if (sep.biayapengajuan && sep.biayapengajuan > 0) {
            menungguVerifikasi++;
          }
        });
      }
    });
    
    const stats = {
      totalResepHariIni,
      klaimDisetujui,
      menungguVerifikasi,
      pasienAktif: pasienAktifSet.size,
      totalOperations: logs.length
    };
    
    console.log('=== STATISTIK BERDASARKAN DATA LOGS.JSON ===');
    console.log('Total Resep Hari Ini:', stats.totalResepHariIni);
    console.log('Klaim Disetujui:', stats.klaimDisetujui);
    console.log('Menunggu Verifikasi:', stats.menungguVerifikasi);
    console.log('Pasien Aktif:', stats.pasienAktif);
    console.log('Total Operasi dalam Log:', stats.totalOperations);
    console.log('============================================\n');
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate statistics',
      error: error.message 
    });
  }
});

// Save mapping data endpoint
// Load mapping data from JSON file
app.get('/api/load-mapping', (req, res) => {
  try {
    const fileName = 'mapping_obat.json';
    const filePath = path.join(__dirname, '..', 'data', fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.json({ 
        success: true, 
        message: 'No mapping data found',
        mappings: [],
        totalMappings: 0
      });
    }
    
    // Read mapping data from JSON file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const mappingData = JSON.parse(fileContent);
    
    console.log(`Mapping data loaded from: ${filePath}`);
    res.json({ 
      success: true, 
      message: 'Data mapping berhasil dimuat dari file mapping_obat.json',
      ...mappingData
    });
  } catch (error) {
    console.error('Error loading mapping data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal memuat data mapping dari file mapping_obat.json',
      mappings: [],
      totalMappings: 0
    });
  }
});

app.post('/api/save-mapping', (req, res) => {
  try {
    const mappingData = req.body;
    const fileName = 'mapping_obat.json';
    const filePath = path.join(__dirname, '..', 'data', fileName);
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write mapping data to JSON file
    fs.writeFileSync(filePath, JSON.stringify(mappingData, null, 2));
    
    console.log(`Mapping data saved to: ${filePath}`);
    res.json({ 
      success: true, 
      message: 'Data mapping berhasil disimpan ke file mapping_obat.json',
      fileName: fileName,
      filePath: filePath
    });
  } catch (error) {
    console.error('Error saving mapping data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal menyimpan data mapping ke file mapping_obat.json' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Save SEP data to file
app.post('/api/save-sep-data', async (req, res) => {
  try {
    const { noSep, data, dataRaw } = req.body;
    
    if (!noSep || !data) {
      return res.status(400).json({
        success: false,
        message: 'Parameter noSep dan data harus diisi'
      });
    }

    // Create sep directory if it doesn't exist
    const sepDir = path.join(__dirname, '../data/sep');
    if (!fs.existsSync(sepDir)) {
      fs.mkdirSync(sepDir, { recursive: true });
    }

    // Prepare data structure with dataRaw if provided
    const sepDataToSave = {
      timestamp: data.timestamp,
      ...(dataRaw && { dataRaw: dataRaw }),
      post_data: data.post_data
    };

    // Save data to file
    const fileName = `${noSep}.json`;
    const filePath = path.join(sepDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(sepDataToSave, null, 2), 'utf8');
    
    console.log(`SEP data saved to: ${filePath}`);
    
    return res.json({
      success: true,
      message: `Data SEP berhasil disimpan ke ${fileName}`,
      filePath: filePath
    });
    
  } catch (error) {
    console.error('Error saving SEP data:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan data SEP',
      error: error.message
    });
  }
});

// 404 handler
// Get all SEP data from saved files
app.get('/api/sep-data', (req, res) => {
  try {
    const sepDataPath = path.join(__dirname, '../data/sep');
    
    // Check if sep directory exists
    if (!fs.existsSync(sepDataPath)) {
      return res.json({ success: true, data: [] });
    }
    
    // Read all JSON files from sep directory
    const files = fs.readdirSync(sepDataPath).filter(file => file.endsWith('.json'));
    const sepDataList = [];
    
    files.forEach(file => {
      try {
        const filePath = path.join(sepDataPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const sepData = JSON.parse(fileContent);
        
        // Extract relevant data for the table
        const tableData = {
          noSep: sepData.post_data.REFASALSJP,
          noKunjungan: sepData.post_data.no_rawat,
          noResep: sepData.post_data.NORESEP,
          poli: sepData.post_data.POLIRSP,
          tglResep: sepData.post_data.TGLRSP,
          tglPelayanan: sepData.post_data.TGLPELRSP,
          timestamp: sepData.timestamp,
          jumlahObat: sepData.post_data.obat.length,
          jumlahRacikan: sepData.post_data.racikan.length,
          status: 'Tersimpan',
          fileName: file,
          // Include complete post_data for modal detail
          post_data: sepData.post_data,
          // Include dataRaw information if available
          ...(sepData.dataRaw && {
            faskesasalresep: sepData.dataRaw.faskesasalresep,
            nmfaskesasalresep: sepData.dataRaw.nmfaskesasalresep,
            nokartu: sepData.dataRaw.nokartu,
            namapeserta: sepData.dataRaw.namapeserta,
            jnskelamin: sepData.dataRaw.jnskelamin,
            tgllhr: sepData.dataRaw.tgllhr,
            nmjenispeserta: sepData.dataRaw.nmjenispeserta,
            tglsep: sepData.dataRaw.tglsep,
            tglplgsep: sepData.dataRaw.tglplgsep,
            jnspelayanan: sepData.dataRaw.jnspelayanan,
            nmdiag: sepData.dataRaw.nmdiag,
            dataRaw: sepData.dataRaw
          })
        };
        
        sepDataList.push(tableData);
      } catch (error) {
        console.error(`Error reading SEP file ${file}:`, error);
      }
    });
    
    // Sort by timestamp (newest first)
    sepDataList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, data: sepDataList });
  } catch (error) {
    console.error('Error reading SEP data:', error);
    res.status(500).json({ success: false, message: 'Failed to read SEP data' });
  }
});

// Get specific SEP data by filename
app.get('/api/sep-data/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const sepDataPath = path.join(__dirname, '../data/sep', filename);
    
    if (!fs.existsSync(sepDataPath)) {
      return res.status(404).json({ success: false, message: 'SEP data not found' });
    }
    
    const fileContent = fs.readFileSync(sepDataPath, 'utf8');
    const sepData = JSON.parse(fileContent);
    
    res.json({ success: true, data: sepData });
  } catch (error) {
    console.error('Error reading specific SEP data:', error);
    res.status(500).json({ success: false, message: 'Failed to read SEP data' });
  }
});

// Sync prescription data to BPJS
app.post('/api/sync-to-bpjs', async (req, res) => {
  const startTime = Date.now();
  const logId = generateLogId();
  
  try {
    const { editableData } = req.body;
    
    if (!editableData || !editableData.post_data) {
      const errorMsg = 'Invalid data format';
      
      // Log error
      logApiCall({
        id: logId,
        timestamp: new Date().toISOString(),
        operation: 'Sync to BPJS',
        method: 'POST',
        endpoint: '/api/sync-to-bpjs',
        requestHeaders: req.headers,
        requestBody: req.body,
        responseStatus: 400,
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: { success: false, message: errorMsg },
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg
      });
      
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const postData = editableData.post_data;
    
    console.log('Starting BPJS sync process for:', postData.NORESEP);
    
    // Generate timestamp for BPJS API
    const tStamp = Math.floor(Date.now() / 1000) - Math.floor(new Date('1970-01-01T00:00:00Z').getTime() / 1000);
    
    // Read BPJS settings
    const settingsPath = path.join(__dirname, '../data/settings.json');
    if (!fs.existsSync(settingsPath)) {
      return res.status(500).json({ success: false, message: 'BPJS settings not found' });
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    let bpjsSettings = { ...settings.bpjs_settings };
    
    if (!bpjsSettings) {
      const errorMsg = 'BPJS settings not found in configuration';
      
      logApiCall({
        id: logId,
        timestamp: new Date().toISOString(),
        operation: 'Sync to BPJS',
        method: 'POST',
        endpoint: '/api/sync-to-bpjs',
        requestHeaders: req.headers,
        requestBody: req.body,
        responseStatus: 500,
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: { success: false, message: errorMsg },
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg
      });
      
      return res.status(500).json({ success: false, message: errorMsg });
    }
    
    // Helper function to check if data is encrypted (contains ':' which indicates IV:encrypted format)
    const isEncrypted = (data) => {
      return typeof data === 'string' && data.includes(':') && data.length > 32;
    };
    
    // Decrypt sensitive data before using (only if encrypted)
    if (bpjsSettings.consumerSecret) {
      if (isEncrypted(bpjsSettings.consumerSecret)) {
        try {
          bpjsSettings.consumerSecret = decrypt(bpjsSettings.consumerSecret);
        } catch (error) {
          console.error('Failed to decrypt consumerSecret:', error);
          // Keep original value if decryption fails
        }
      }
    }
    if (bpjsSettings.userKey) {
      if (isEncrypted(bpjsSettings.userKey)) {
        try {
          bpjsSettings.userKey = decrypt(bpjsSettings.userKey);
        } catch (error) {
          console.error('Failed to decrypt userKey:', error);
          // Keep original value if decryption fails
        }
      }
    }
    
    const consid = bpjsSettings.consumerID;
    const secretkey = bpjsSettings.consumerSecret;
    const user_key = bpjsSettings.userKey;
    const api_url = bpjsSettings.baseUrl;
    
    if (!consid || !secretkey || !user_key || !api_url) {
      const errorMsg = 'BPJS configuration incomplete';
      
      logApiCall({
        id: logId,
        timestamp: new Date().toISOString(),
        operation: 'Sync to BPJS',
        method: 'POST',
        endpoint: '/api/sync-to-bpjs',
        requestHeaders: req.headers,
        requestBody: req.body,
        responseStatus: 500,
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: { success: false, message: errorMsg },
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg
      });
      
      return res.status(500).json({ success: false, message: errorMsg });
    }
    
    console.log('BPJS configuration loaded successfully');
    console.log('API URL:', api_url);

    // Helper function to parse and format date safely
    const parseDate = (dateStr) => {
      if (!dateStr || dateStr === 'null' || dateStr.startsWith('null')) {
        return null;
      }
      
      try {
        // Clean up malformed date strings
        let cleanDate = dateStr;
        
        // Handle cases like "2025-08-14T16:00:00.000ZT20:36:39"
        if (cleanDate.includes('ZT')) {
          cleanDate = cleanDate.split('ZT')[0] + 'Z';
        }
        
        // Handle cases like "nullT00:00:00"
        if (cleanDate.includes('nullT')) {
          return null;
        }
        
        // Parse the date
        const date = new Date(cleanDate);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date format:', dateStr);
          return null;
        }
        
        return date.toISOString().split('T')[0] + ' 00:00:00';
      } catch (error) {
        console.warn('Error parsing date:', dateStr, error.message);
        return null;
      }
    };

    // Helper function to format TGLSJP properly
    const formatTglSjp = (dateStr) => {
      if (!dateStr) return null;
      
      try {
        // If it's already in the correct format, return as is
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        
        // Parse ISO date and format to YYYY-MM-DD HH:mm:ss
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn('Invalid TGLSJP format:', dateStr);
          return null;
        }
        
        return date.toISOString().slice(0, 19).replace('T', ' ');
      } catch (error) {
        console.warn('Error formatting TGLSJP:', dateStr, error.message);
        return null;
      }
    };

    // Helper function to map poli name to BPJS code
    const mapPoliToBpjsCode = (poliName) => {
      if (!poliName) return null;
      
      const poliMapping = {
        'PENYAKIT DALAM': 'INT',
        'ILMU PENYAKIT DALAM': 'IPD',
        'RAWAT JALAN': 'IPD',
        'RAWAT INAP': 'OPD',
        'ANAK': 'ANA',
        'BEDAH': 'BED',
        'OBSTETRI GINEKOLOGI': 'OBG',
        'MATA': 'MAT',
        'THT': 'THT',
        'KULIT KELAMIN': 'KLT',
        'SARAF': 'SAR',
        'JANTUNG': 'JAN',
        'PARU': 'PAR',
        'GIGI': 'GIG',
        'JIWA': 'JIW',
        'REHABILITASI MEDIK': 'IRM',
        'GAWAT DARURAT': 'IGD',
        'INTENSIVE CARE UNIT': 'ICU',
        'HEMODIALISA': 'HDL'
      };
      
      // Handle exact dropdown values first
      if (poliName === 'IPD (Rawat Jalan)') {
        return 'IPD';
      }
      if (poliName === 'OPD (Rawat Inap)') {
        return 'OPD';
      }
      
      // Clean the poli name - remove extra text like (Rawat Jalan), etc.
      let cleanPoliName = poliName.trim();
      
      // Remove common suffixes
      cleanPoliName = cleanPoliName.replace(/\s*\(.*\)\s*$/g, ''); // Remove (Rawat Jalan), etc.
      cleanPoliName = cleanPoliName.replace(/\s*RAWAT\s+(JALAN|INAP)\s*$/gi, ''); // Remove RAWAT JALAN/INAP
      
      // Convert to uppercase for matching
      const upperPoliName = cleanPoliName.toUpperCase();
      
      // Direct match
      if (poliMapping[upperPoliName]) {
        return poliMapping[upperPoliName];
      }
      
      // Partial match for common variations
      for (const [key, value] of Object.entries(poliMapping)) {
        if (upperPoliName.includes(key) || key.includes(upperPoliName)) {
          return value;
        }
      }
      
      // Special cases for common variations
       if (upperPoliName.includes('DALAM')) {
         return 'INT';
       }
       if (upperPoliName.includes('IPD') || upperPoliName.includes('RAWAT JALAN')) {
         return 'IPD';
       }
       if (upperPoliName.includes('OPD') || upperPoliName.includes('RAWAT INAP')) {
         return 'OPD';
       }
       if (upperPoliName.includes('ANAK')) {
         return 'ANA';
       }
       if (upperPoliName.includes('BEDAH')) {
         return 'BED';
       }
      
      // If no mapping found, log warning and return a default code
      console.warn('No BPJS poli mapping found for:', poliName, '-> using default IPD');
      return 'IPD'; // Default to IPD (Ilmu Penyakit Dalam)
    };

    // Debug POLIRSP mapping
    console.log('Original POLIRSP:', postData.POLIRSP);
    const mappedPolirsp = mapPoliToBpjsCode(postData.POLIRSP);
    console.log('Mapped POLIRSP:', mappedPolirsp);
    
    // Prepare resep data
    const resepData = {
      TGLSJP: formatTglSjp(postData.TGLSJP),
      REFASALSJP: postData.REFASALSJP,
      POLIRSP: mappedPolirsp,
      KDJNSOBAT: postData.KDJNSOBAT,
      NORESEP: postData.NORESEP?.slice(-5), // Last 5 characters
      IDUSERSJP: postData.IDUSERSJP,
      TGLRSP: parseDate(postData.TGLRSP),
      TGLPELRSP: parseDate(postData.TGLPELRSP),
      KdDokter: postData.KdDokter || '0',
      iterasi: postData.iterasi || '0'
    };

    console.log('Sending resep data to BPJS:', resepData);
    
    // Log resep request
    const resepLogId = generateLogId();
    logApiCall({
      id: resepLogId,
      timestamp: new Date().toISOString(),
      operation: 'Send Resep to BPJS',
      method: 'POST',
      endpoint: `${api_url}/sjpresep/v3/insert`,
      requestHeaders: {
        'X-cons-id': consid,
        'X-timestamp': tStamp.toString(),
        'X-signature': '***',
        'user_key': '***',
        'Content-Type': 'application/json; charset=utf-8'
      },
      requestBody: resepData,
      responseStatus: null,
      responseHeaders: null,
      responseBody: null,
      duration: 0,
      success: false
    });

    // Send resep data to BPJS
    const resepResponse = await sendToBpjsApi(
      `${api_url}/sjpresep/v3/insert`,
      resepData,
      consid,
      secretkey,
      user_key,
      tStamp
    );

    // Update resep log with response
    const resepEndTime = Date.now();
    logApiCall({
      id: resepLogId,
      timestamp: new Date().toISOString(),
      operation: 'Send Resep to BPJS',
      method: 'POST',
      endpoint: `${api_url}/sjpresep/v3/insert`,
      requestHeaders: {
        'X-cons-id': consid,
        'X-timestamp': tStamp.toString(),
        'X-signature': '***',
        'user_key': '***',
        'Content-Type': 'application/json; charset=utf-8'
      },
      requestBody: resepData,
      responseStatus: resepResponse.success ? 200 : 400,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: resepResponse,
      duration: resepEndTime - startTime,
      success: resepResponse.success,
      error: resepResponse.success ? null : resepResponse.message
    });

    if (!resepResponse.success) {
      throw new Error(`Gagal mengirim data resep: ${resepResponse.message}`);
    }

    const resepResult = resepResponse.data;
     let noApotik = '';
     let noResep = '';

     // Extract noApotik and noResep from response
     if (resepResult && resepResult.response) {
       try {
         const responseData = resepResult.response;
         if (typeof responseData === 'object') {
           noApotik = responseData.noApotik || responseData.noSjp || '';
           noResep = responseData.noResep || responseData.noResep || '';
         } else if (typeof responseData === 'string') {
           // Try to parse as JSON if it's a string
           const parsedResponse = JSON.parse(responseData);
           noApotik = parsedResponse.noApotik || parsedResponse.noSjp || '';
           noResep = parsedResponse.noResep || parsedResponse.noResep || '';
         }
         console.log('Extracted from resep response:', { noApotik, noResep });
       } catch (decryptError) {
         console.error('Error processing resep response:', decryptError);
         console.log('Raw resep response:', resepResult);
       }
     }

     // If we don't have noApotik from response, we can't send obat data
     if (!noApotik) {
       console.warn('No noApotik received from resep response, skipping obat submission');
     }

    const obatResponses = [];
    const obatErrors = [];

    // Send obat non-racikan data
     if (postData.obat && Array.isArray(postData.obat)) {
       console.log(`Sending ${postData.obat.length} obat non-racikan items...`);
      for (let i = 0; i < postData.obat.length; i++) {
        const obat = postData.obat[i];
        try {
          const obatData = {
             NOSJP: noApotik || obat.NOSJP || '',
             NORESEP: noResep || obat.NORESEP || postData.NORESEP || '',
            KDOBT: obat.KDOBT,
            NMOBAT: obat.NMOBAT,
            SIGNA1OBT: parseInt(obat.SIGNA1OBT) || 0,
            SIGNA2OBT: parseInt(obat.SIGNA2OBT) || 0,
            JMLOBT: parseInt(obat.JMLOBT) || 0,
            JHO: parseInt(obat.JHO) || 0,
            CatKhsObt: obat.CatKhsObt || ''
          };

          // Log obat non-racikan request
          const obatLogId = generateLogId();
          logApiCall({
            id: obatLogId,
            timestamp: new Date().toISOString(),
            operation: `Send Obat Non-Racikan ${i+1} to BPJS`,
            method: 'POST',
            endpoint: `${api_url}/obatnonracikan/v3/insert`,
            requestHeaders: {
              'X-cons-id': consid,
              'X-timestamp': tStamp.toString(),
              'X-signature': '***',
              'user_key': '***',
              'Content-Type': 'application/json; charset=utf-8'
            },
            requestBody: obatData,
            responseStatus: null,
            responseHeaders: null,
            responseBody: null,
            duration: 0,
            success: false
          });

          const obatResponse = await sendToBpjsApi(
            `${api_url}/obatnonracikan/v3/insert`,
            obatData,
            consid,
            secretkey,
            user_key,
            tStamp
          );
          
          // Update obat log with response
          const obatEndTime = Date.now();
          logApiCall({
            id: obatLogId,
            timestamp: new Date().toISOString(),
            operation: `Send Obat Non-Racikan ${i+1} to BPJS`,
            method: 'POST',
            endpoint: `${api_url}/obatnonracikan/v3/insert`,
            requestHeaders: {
              'X-cons-id': consid,
              'X-timestamp': tStamp.toString(),
              'X-signature': '***',
              'user_key': '***',
              'Content-Type': 'application/json; charset=utf-8'
            },
            requestBody: obatData,
            responseStatus: obatResponse.success ? 200 : 400,
            responseHeaders: { 'content-type': 'application/json' },
            responseBody: obatResponse,
            duration: obatEndTime - startTime,
            success: obatResponse.success,
            error: obatResponse.success ? null : obatResponse.message
          });

          obatResponses.push(obatResponse.data);

          if (!obatResponse.success) {
            obatErrors.push({
              index: i,
              message: obatResponse.message,
              data: obatData
            });
          }
        } catch (error) {
          obatErrors.push({
            index: i,
            message: error.message,
            data: obat
          });
        }
      }
    }

    // Send racikan data
     if (postData.racikan && Array.isArray(postData.racikan)) {
       console.log(`Sending ${postData.racikan.length} racikan items...`);
      for (let i = 0; i < postData.racikan.length; i++) {
        const racikan = postData.racikan[i];
        if (racikan.detail && Array.isArray(racikan.detail)) {
          for (let j = 0; j < racikan.detail.length; j++) {
            const detail = racikan.detail[j];
            try {
              const racikanData = {
                 NOSJP: noApotik || racikan.NOSJP || '',
                 NORESEP: noResep || racikan.NORESEP || postData.NORESEP || '',
                JNSROBT: racikan.JNSROBT,
                KDOBT: detail.kd_obat_bpjs || detail.kode_brng || '',
                NMOBAT: detail.nama_obat_bpjs || detail.nama_brng || '',
                SIGNA1OBT: parseInt(racikan.SIGNA1RACIKAN) || 0,
                SIGNA2OBT: parseInt(racikan.SIGNA2RACIKAN) || 0,
                PERMINTAAN: parseInt(detail.jml) || 0,
                JMLOBT: parseInt(racikan.JMLRACIKAN) || 0,
                JHO: parseInt(racikan.JHORACIKAN) || 0,
                CatKhsObt: racikan.CatKhsObt || ''
              };

              // Log racikan request
              const racikanLogId = generateLogId();
              logApiCall({
                id: racikanLogId,
                timestamp: new Date().toISOString(),
                operation: `Send Racikan ${i+1}-${j+1} to BPJS`,
                method: 'POST',
                endpoint: `${api_url}/obatracikan/v3/insert`,
                requestHeaders: {
                  'X-cons-id': consid,
                  'X-timestamp': tStamp.toString(),
                  'X-signature': '***',
                  'user_key': '***',
                  'Content-Type': 'application/json; charset=utf-8'
                },
                requestBody: racikanData,
                responseStatus: null,
                responseHeaders: null,
                responseBody: null,
                duration: 0,
                success: false
              });

              const racikanResponse = await sendToBpjsApi(
                `${api_url}/obatracikan/v3/insert`,
                racikanData,
                consid,
                secretkey,
                user_key,
                tStamp
              );
              
              // Update racikan log with response
              const racikanEndTime = Date.now();
              logApiCall({
                id: racikanLogId,
                timestamp: new Date().toISOString(),
                operation: `Send Racikan ${i+1}-${j+1} to BPJS`,
                method: 'POST',
                endpoint: `${api_url}/obatracikan/v3/insert`,
                requestHeaders: {
                  'X-cons-id': consid,
                  'X-timestamp': tStamp.toString(),
                  'X-signature': '***',
                  'user_key': '***',
                  'Content-Type': 'application/json; charset=utf-8'
                },
                requestBody: racikanData,
                responseStatus: racikanResponse.success ? 200 : 400,
                responseHeaders: { 'content-type': 'application/json' },
                responseBody: racikanResponse,
                duration: racikanEndTime - startTime,
                success: racikanResponse.success,
                error: racikanResponse.success ? null : racikanResponse.message
              });

              obatResponses.push(racikanResponse.data);

              if (!racikanResponse.success) {
                obatErrors.push({
                  index: `racikan_${i}_detail_${j}`,
                  message: racikanResponse.message,
                  data: racikanData
                });
              }
            } catch (error) {
              obatErrors.push({
                index: `racikan_${i}_detail_${j}`,
                message: error.message,
                data: detail
              });
            }
          }
        }
      }
    }
    
    // Log the sync attempt
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'sync_to_bpjs',
      data: {
        no_rawat: postData.no_rawat,
        no_resep: postData.NORESEP,
        obat_count: postData.obat?.length || 0,
        racikan_count: postData.racikan?.length || 0,
        noApotik: noApotik,
        noResep: noResep
      },
      status: obatErrors.length > 0 ? 'partial_success' : 'success',
      errors: obatErrors
    };
    
    // Save log
    try {
      const logsPath = path.join(__dirname, '../data/sync_logs.json');
      let logs = [];
      if (fs.existsSync(logsPath)) {
        const logsContent = fs.readFileSync(logsPath, 'utf8');
        logs = JSON.parse(logsContent);
      }
      logs.push(logEntry);
      fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (logError) {
      console.error('Error saving sync log:', logError);
    }
    
    // Update NORESEP in SEP file if we got noResep from BPJS response
    if (noResep && postData.REFASALSJP) {
      try {
        const sepFilePath = path.join(__dirname, '../data/sep', `${postData.REFASALSJP}.json`);
        if (fs.existsSync(sepFilePath)) {
          const sepData = JSON.parse(fs.readFileSync(sepFilePath, 'utf8'));
          
          // Update NORESEP in post_data
          if (sepData.post_data) {
            sepData.post_data.NORESEP = noResep;
            sepData.post_data.noApotik = noApotik;
            sepData.post_data.syncTimestamp = new Date().toISOString();
            sepData.post_data.syncStatus = 'success';
            
            // Write updated data back to file
            fs.writeFileSync(sepFilePath, JSON.stringify(sepData, null, 2));
            console.log(`Updated NORESEP in SEP file ${postData.REFASALSJP}.json:`, noResep);
          }
        }
      } catch (updateError) {
        console.error('Error updating NORESEP in SEP file:', updateError);
      }
    }
    
    // Log successful sync
    const successResponse = {
      success: true, 
      message: obatErrors.length > 0 
        ? `Data berhasil dikirim ke BPJS dengan ${obatErrors.length} error pada obat`
        : 'Data berhasil dikirim ke Apotek Online BPJS',
      resep_response: resepResult,
      obat_responses: obatResponses,
      obat_errors: obatErrors,
      noApotik: noApotik,
      noResep: noResep
    };
    
    logApiCall({
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Sync to BPJS',
      method: 'POST',
      endpoint: '/api/sync-to-bpjs',
      requestHeaders: req.headers,
      requestBody: req.body,
      responseStatus: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: successResponse,
      duration: Date.now() - startTime,
      success: true,
      message: successResponse.message
    });

    res.json(successResponse);
  } catch (error) {
    console.error('Error syncing to BPJS:', error);
    
    const errorResponse = {
      success: false, 
      message: error.message || 'Gagal melakukan sinkronisasi ke BPJS'
    };
    
    // Log error with logs.json format
    logApiCall({
      id: logId,
      timestamp: new Date().toISOString(),
      operation: 'Sync to BPJS',
      method: 'POST',
      endpoint: '/api/sync-to-bpjs',
      requestHeaders: req.headers,
      requestBody: req.body,
      responseStatus: 500,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: errorResponse,
      duration: Date.now() - startTime,
      success: false,
      message: error.message
    });
    
    res.status(500).json(errorResponse);
  }
});

// Endpoint untuk menyimpan data resep obat ke file JSON
app.post('/api/save-resep-data', (req, res) => {
  try {
    const { noSep, data } = req.body;
    
    if (!noSep || !data) {
      return res.status(400).json({ 
        success: false, 
        message: 'noSep dan data harus disediakan' 
      });
    }
    
    // Pastikan direktori resepobat ada
    const resepDir = path.join(__dirname, '../data/resepobat');
    if (!fs.existsSync(resepDir)) {
      fs.mkdirSync(resepDir, { recursive: true });
    }
    
    // Map POLIRSP before saving
    const processedData = { ...data };
    if (processedData.POLIRSP) {
      console.log('Original POLIRSP before save:', processedData.POLIRSP);
      processedData.POLIRSP = mapPoliToBpjsCode(processedData.POLIRSP);
      console.log('Mapped POLIRSP before save:', processedData.POLIRSP);
    }
    
    // Simpan data ke file JSON dengan nama noSep
    const filePath = path.join(resepDir, `${noSep}.json`);
    const dataToSave = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      noSep: noSep,
      ...processedData
    };
    
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Data resep berhasil disimpan',
      filePath: `data/resepobat/${noSep}.json`
    });
  } catch (error) {
    console.error('Error saving resep data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menyimpan data resep' 
    });
  }
});

// Get resep data from saved file
app.get('/api/resep-data/:noSep', (req, res) => {
  try {
    const { noSep } = req.params;
    
    if (!noSep) {
      return res.status(400).json({
        success: false,
        message: 'No SEP is required'
      });
    }
    
    const resepFilePath = path.join(__dirname, '../data/resepobat', `${noSep}.json`);
    
    // Check if file exists
    if (!fs.existsSync(resepFilePath)) {
      return res.json({
        success: false,
        message: 'File resep tidak ditemukan',
        data: null
      });
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(resepFilePath, 'utf8');
    const resepData = JSON.parse(fileContent);
    
    res.json({
      success: true,
      message: 'Data resep berhasil dimuat',
      data: resepData
    });
    
  } catch (error) {
    console.error('Error loading resep data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data resep'
    });
  }
});

// Save obat non racikan to local file
app.post('/api/save-obat-non-racikan', authenticateToken, (req, res) => {
  try {
    const obatData = req.body;
    
    if (!obatData.KDOBT || !obatData.NMOBAT || !obatData.noSep) {
      return res.status(400).json({ 
        success: false, 
        message: 'KDOBT, NMOBAT, and noSep are required' 
      });
    }
    
    const sepDir = path.join(__dirname, '../data/sep');
    if (!fs.existsSync(sepDir)) {
      fs.mkdirSync(sepDir, { recursive: true });
    }
    
    const sepFilePath = path.join(sepDir, `${obatData.noSep}.json`);
    let sepData = {};
    
    // Load existing SEP data if file exists
    if (fs.existsSync(sepFilePath)) {
      try {
        const fileContent = fs.readFileSync(sepFilePath, 'utf8');
        sepData = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error reading SEP file:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to read SEP file' 
        });
      }
    } else {
      return res.status(404).json({ 
        success: false, 
        message: 'SEP file not found' 
      });
    }
    
    // Initialize obat array if not exists
    if (!sepData.post_data) {
      sepData.post_data = {};
    }
    if (!sepData.post_data.obat) {
      sepData.post_data.obat = [];
    }
    
    // Add new obat data
    const newObat = {
      type: "non_racikan",
      NOSJP: obatData.noSep,
      NORESEP: sepData.post_data?.NORESEP || '',
      CatKhsObt: '',
      KDOBT: obatData.KDOBT,
      NMOBAT: obatData.NMOBAT,
      JMLOBT: obatData.JMLOBAT || '0',
      SIGNA1OBT: obatData.SIGNA1 || '',
      SIGNA2OBT: obatData.SIGNA2 || '',
      JHO: obatData.JMLPERMINTAAN || '0'
    };
    
    sepData.post_data.obat.push(newObat);
    
    // Save to SEP file
    fs.writeFileSync(sepFilePath, JSON.stringify(sepData, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Obat non racikan saved successfully to SEP file',
      data: newObat
    });
  } catch (error) {
    console.error('Save obat non racikan error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save obat non racikan',
      error: error.message 
    });
  }
});

// Save obat racikan to local file
app.post('/api/save-obat-racikan', authenticateToken, (req, res) => {
  try {
    const racikanData = req.body;
    
    if (!racikanData.JNSROBT || !racikanData.JMLRACIKAN || !racikanData.noSep) {
      return res.status(400).json({ 
        success: false, 
        message: 'JNSROBT, JMLRACIKAN, and noSep are required' 
      });
    }
    
    const sepDir = path.join(__dirname, '../data/sep');
    if (!fs.existsSync(sepDir)) {
      fs.mkdirSync(sepDir, { recursive: true });
    }
    
    const sepFilePath = path.join(sepDir, `${racikanData.noSep}.json`);
    let sepData = {};
    
    // Load existing SEP data if file exists
    if (fs.existsSync(sepFilePath)) {
      try {
        const fileContent = fs.readFileSync(sepFilePath, 'utf8');
        sepData = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error reading SEP file:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to read SEP file' 
        });
      }
    } else {
      return res.status(404).json({ 
        success: false, 
        message: 'SEP file not found' 
      });
    }
    
    // Initialize racikan array if not exists
    if (!sepData.post_data) {
      sepData.post_data = {};
    }
    if (!sepData.post_data.racikan) {
      sepData.post_data.racikan = [];
    }
    
    // Add new racikan data
    const newRacikan = {
      type: "racikan",
      NOSJP: racikanData.noSep,
      NORESEP: sepData.post_data?.NORESEP || '',
      no_racik: "1",
      kd_racik: "1",
      SIGNA1RACIKAN: racikanData.SIGNA1RACIKAN || "1",
      SIGNA2RACIKAN: racikanData.SIGNA2RACIKAN || "1",
      JHORACIKAN: racikanData.JHORACIKAN || "1",
      JNSROBT: racikanData.JNSROBT,
      JMLOBAT: racikanData.JMLOBAT || "1",
      JMLRACIKAN: racikanData.JMLRACIKAN,
      NO_RACIK: "1",
      ATURAN_PAKAI: racikanData.KETERANGAN || '',
      detail: (racikanData.detailObat || []).map(item => ({
        kode_brng: item.KDOBT || '',
        nama_brng: item.NMOBAT || '',
        jml: item.JMLOBT || '0',
        kd_obat_bpjs: item.KDOBT || '',
        nama_obat_bpjs: item.NMOBAT || ''
      }))
    };
    
    sepData.post_data.racikan.push(newRacikan);
    
    // Save to SEP file
    fs.writeFileSync(sepFilePath, JSON.stringify(sepData, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Obat racikan saved successfully to SEP file',
      data: newRacikan
    });
  } catch (error) {
    console.error('Save obat racikan error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save obat racikan',
      error: error.message 
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`BPJS Apotek Auth Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;