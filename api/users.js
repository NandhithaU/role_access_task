const express = require("express");
const router = express.Router();
const {executeQuery} = require('../conf/db');
const {checkRoleAndAccess,authenticate} = require('../lib/auth');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const winston = require('winston');


/*
access flag = 1 // delete access to admin over feeds
access flag = 2 // post and del the Basic users
access flag = 3 // only read access for their own
access flag = 4 // all type of access (superadmin)
*/

router.post("/users", authenticate, checkRoleAndAccess(['superAdmin', 'Admin']), async (req, res) => {
    try {
        const { name, role, email, password, accessFlag } = req.body;

        // Check if the provided role is valid
        if (!['superAdmin', 'Admin', 'Basic'].includes(role)) {
            return res.status(400).json({ message: 'Invalid user role' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO users (name, role, email, password, accessFlag) VALUES (?, ?, ?, ?, ?)';
        const insertVal   = [ name, role, email, hashedPassword, accessFlag ]

        await executeQuery(insertQuery, insertVal , (err, res) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            return res;
        })

        res.status(201).json({ message: 'User created' });

        const operation = 'User performed post operation';
        logger.info(operation);
        res.send('Operation logged');

      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
});

router.get("/users/:id",authenticate,checkRoleAndAccess(['superAdmin', 'Admin','Basic']) , async (req, res) =>{
    try {
        const userId = req.params.id;

        // Fetch user details from the users table based on the provided ID
        const query = 'SELECT * FROM users WHERE id = ?';
        const values = [userId];
        const userResults = await executeQuery(query, values);

        if (userResults.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Filter out sensitive data like password before sending the response
        const user = userResults[0];
        const { password, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword });

        const operation = 'User performed get operation';
        logger.info(operation);
        res.send('Operation logged');
      } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
});

router.put('/users/:id', authenticate, checkRoleAndAccess(['superAdmin', 'Admin', 'Basic']), async (req, res) =>{
  try {
    const userId = req.params.id;
    const { role, accessFlag } = req.body;
    const updateValues = [];

    // Prepare the update query
    let updateQuery = 'UPDATE users SET';

    // Conditionally add role to the query
    if (role !== undefined) {
      updateQuery += ' role = ?,';
      updateValues.push(role);
    }

    // Conditionally add accessFlag to the query
    if (accessFlag !== undefined) {
      updateQuery += ' accessFlag = ?,';
      updateValues.push(accessFlag);
    }

    // Remove trailing comma if there were updates
    if (updateValues.length > 0) {
      updateQuery = updateQuery.slice(0, -1); // Remove the last character (comma)
      updateQuery += ' WHERE id = ?'; // Add the WHERE clause
      updateValues.push(userId); // Add userId to the values array
    } else {
      // No updates provided, return an error response or handle as needed
      return res.status(400).json({ message: 'No updates provided' });
    }

    // Execute the update query with the dynamic values
    await executeQuery(updateQuery, updateValues);

    res.json({ message: 'User information updated successfully' });

    const operation = 'User performed update operation';
    logger.info(operation);
    res.send('Operation logged');
  } catch (error) {
    console.error('Error updating user information:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', authenticate, checkRoleAndAccess(['superAdmin']), async (req, res) => {
try {
    const userId = req.params.id;

    // Delete user from the database
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    const deleteValues = [userId];
    await executeQuery(deleteQuery, deleteValues);

    res.json({ message: 'User deleted successfully' });

    const operation = 'User performed delete operation';
    logger.info(operation);
    res.send('Operation logged');

} catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
}
});

const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Define the format for log file names
const logFileName = () => {
  const now = new Date();
  return `log-${now.toISOString()}.log`;
};

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, logFileName()) }),
  ],
});

router.get('/logs',authenticate, checkRoleAndAccess(['superAdmin']) , (req, res) => {
  const logDir = '/logs'; // Directory where log files are stored
  const logs = [];

  // Iterate through log files and read logs created within the last 5 minutes
  fs.readdirSync(logDir).forEach((file) => {
    const filePath = path.join(logDir, file);
    const fileStat = fs.statSync(filePath);
    const currentTime = new Date();
    const fiveMinutesAgo = new Date(currentTime - 5 * 60 * 1000);

    if (fileStat.isFile() && fileStat.mtime > fiveMinutesAgo) {
      const logContent = fs.readFileSync(filePath, 'utf8');
      logs.push({ fileName: file, content: logContent });
    }
  });

  res.json(logs);
});

module.exports = router