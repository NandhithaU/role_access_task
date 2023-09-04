// src/index.ts
import express ,{ Request, Response, NextFunction }from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import { executeQuery,pool } from '../conf/db';
import {checkRoleAndAccess,authenticate} from '../lib/auth';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import {RequestHandler} from './type';
import jwt from 'jsonwebtoken';
import mysql, { Pool, PoolConnection} from 'mysql2/promise';

/*
access flag = 1 // delete access to admin over feeds
access flag = 2 // post and del the Basic users
access flag = 3 // only read access for their own
access flag = 4 // all type of access (superadmin)
*/

const app = express();
// Parse JSON request bodies
app.use(bodyParser.json());

const port = 7000;

// Create a user
app.post(
    '/users',
    authenticate,
    checkRoleAndAccess(['superAdmin', 'Admin']),
    async (req: Request, res: Response) => {
      try {
        const { name, role, email, password, accessFlag } = req.body;

        // Check if the provided role is valid
        if (!['superAdmin', 'Admin', 'Basic'].includes(role)) {
          return res.status(400).json({ message: 'Invalid user role' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery =
          'INSERT INTO users (name, role, email, password, accessFlag) VALUES (?, ?, ?, ?, ?)';
        const insertVal = [name, role, email, hashedPassword, accessFlag];

        await executeQuery(insertQuery, insertVal);

        res.status(201).json({ message: 'User created' });

        const operation = 'User performed post operation';
        logger.info(operation);
        res.send('Operation logged');
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
);

  // Get user by ID
app.get(
'/users/:id',
authenticate,
checkRoleAndAccess(['superAdmin', 'Admin', 'Basic']),
async (req: Request, res: Response) => {
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
}
);

  // Update user by ID
app.put(
'/users/:id',
authenticate,
checkRoleAndAccess(['superAdmin', 'Admin', 'Basic']),
async (req: Request, res: Response) => {
    try {
    const userId = req.params.id;
    const { role, accessFlag } = req.body;
    const updateValues: any[] = [];

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
}
);

  // Delete user by ID
app.delete(
'/users/:id',
authenticate,
checkRoleAndAccess(['superAdmin']),
async (req: Request, res: Response) => {
    try {
    const userId = req.params.id;

    // Delete user from the database
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    const deleteValues = [userId];
    await executeQuery(deleteQuery, deleteValues);

    res.json({ message: 'User deleted successfully' });

    const operation = 'User performed delete operation';
    logger.info(operation);
    res.send('Delete Operation logged');
    } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
    }
}
);

// Define the format for log file names
const logFileName = () => {
const now = new Date();
return `log-${now.toISOString()}.log`;
};

  // Create a logger instance
const logger = winston.createLogger({
level: 'info', // Set the logging level (e.g., 'info', 'error', 'debug')
format: winston.format.json(), // Use JSON format for log messages
transports: [
    // Add a file transport to log to a file
    new winston.transports.File({ filename: logFileName() }),
],
});

app.get('/logs', authenticate, checkRoleAndAccess(['superAdmin']), (req: Request, res: Response) => {
  const logDir = '/logs'; // Directory where log files are stored
  const logs: { fileName: string; content: string }[] = [];

  // Iterate through log files and read logs created within the last 5 minutes
  fs.readdirSync(logDir).forEach((file) => {
    const filePath = path.join(logDir, file);
    const fileStat = fs.statSync(filePath);
    const currentTime = new Date();
    const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);

    if (fileStat.isFile() && fileStat.mtime > fiveMinutesAgo) {
      const logContent = fs.readFileSync(filePath, 'utf8');
      logs.push({ fileName: file, content: logContent });
    }
  });

  res.json(logs);
});

app.post('/login', async (req: Request, res: Response) => {
    try {
      const selQuery = 'SELECT * FROM users WHERE email = ?';
      const selVal = [req.body.email];
      const password = req.body.password;

      pool.getConnection((err: mysql.MysqlError | null, conn: PoolConnection | undefined) => {
        if (err) {
          console.error('Error getting a connection from the pool: ' + err);
          return;
        }

        const [rows] = await conn.execute(selQuery, selVal); // Use execute method

        conn.release();

        const user = rows[0];

        if (!user) {
          return res.status(401).json({ message: 'Authentication failed' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ message: 'Authentication failed' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, 'SECRET_KEY', {
          expiresIn: '1d',
        });

        res.json({ token });
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  // Signup Route
  const signupHandler: RequestHandler = async (req, res) => {
    const { name, role, email, password } = req.body;

    try {
      // Hash the password before storing it in the database
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user into the database
      await executeQuery(
        'INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)',
        [name, role, email, hashedPassword]
      );

      res.status(201).json({ message: 'User created' });
    } catch (error) {
      console.error('Error during signup:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  app.post('/signup', signupHandler);

  app.post('/feeds', authenticate, checkRoleAndAccess(['superAdmin', 'Admin']), async (req: Request, res: Response) => {
    try {
      const { name, url, description } = req.body;

      // Validate the incoming data as needed

      // Construct the SQL query to insert data into the "feed" table
      const insertQuery = 'INSERT INTO feed (name, url, description) VALUES (?, ?, ?)';
      const insertValues = [name, url, description];

      // Execute the query using the MySQL connection pool
      await executeQuery(insertQuery, insertValues);

      res.status(201).json({ message: 'Feed created' });
    } catch (error) {
      console.error('Error creating feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/feeds/:url', checkRoleAndAccess(['superAdmin', 'Admin', 'Basic']), async (req: Request, res: Response) => {
    try {
      const feedurl = req.params.url;

      // Construct the SQL query to fetch a feed by ID
      const selectQuery = 'SELECT * FROM feed WHERE url = ?';

      // Execute the query using the MySQL connection pool
      const feedResults = await executeQuery(selectQuery, [feedurl]);

      if (feedResults.length === 0) {
        return res.status(404).json({ message: 'Feed not found' });
      } else {
        res.json(feedResults[0]);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/feeds/:url', checkRoleAndAccess(['superAdmin', 'Admin']), async (req: Request, res: Response) => {
    try {
      const feedurl = req.params.url;
      const { name, url, description } = req.body;

      // Construct the SQL query dynamically based on the provided fields
      let updateQuery = 'UPDATE feed SET ';
      const updateValues = [];
      const updateFields = [];

      if (name) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }

      if (url) {
        updateFields.push('url = ?');
        updateValues.push(url);
      }

      if (description) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateQuery += updateFields.join(', ');
      updateQuery += ' WHERE url = ?';
      updateValues.push(feedurl);

      // Execute the query using the MySQL connection pool
      await executeQuery(updateQuery, updateValues);

      res.json({ message: 'Feed updated' });
    } catch (error) {
      console.error('Error updating feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/feeds/:url', async (req: Request, res: Response) => {
    try {
      const feedurl = req.params.url;

      // Construct the SQL query to delete a feed by ID
      const deleteQuery = 'DELETE FROM feed WHERE url = ?';

      // Execute the query using the MySQL connection pool
      await executeQuery(deleteQuery, [feedurl]);

      res.json({ message: 'Feed deleted successfully' });
    } catch (error) {
      console.error('Error deleting feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
