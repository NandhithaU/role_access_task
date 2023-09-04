import { executeQuery, pool } from '../conf/db';
import { SECRET_KEY } from '../conf/config';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import * as util from 'util';
import mysql, { PoolConnection, RowDataPacket } from 'mysql2/promise'; // Import the necessary types

interface User {
  id: number;
  name: string;
  role: string;
  accessFlag: number;
}
declare global {
    namespace Express {
      interface Request {
        user?: User;
      }
    }
  }

  export const checkRoleAndAccess = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userRole = (req.user as User).role;
      let userAccess = (req.user as User).accessFlag;

      if (userRole !== 'superAdmin') {
        const userId = (req.user as User).id;
        userAccess = await checkAccess(userId);
      }

      const isDeleteRequest = req.method === 'DELETE';
      const isGetRequest = req.method === 'GET';

      if (roles.includes(userRole) && userAccess !== undefined) {
        const accessFlag = userAccess || 0;
        if (userRole === 'admin' && (accessFlag === 2 || accessFlag === 1)) {
          if (isDeleteRequest) {
            // Only allow deleting Basic users if the user has 'post and delete' access
            next();
          } else if (userRole === 'admin' && userAccess !== undefined && userAccess > 0) {
          // Only allow creating Basic users if the user has 'create' access
          if ((req.body as { role: string }).role === 'Basic') {
            next();
          } else {
            res.status(403).json({ message: 'Access denied' });
          }
        }
      } else if (userRole === 'superAdmin' && accessFlag === 4) {
        // Super admin can create any user type
        next();
      } else if (accessFlag === 3) {
        if (!isGetRequest) {
          // Allow only if accessFlag is 3 (read access for their own feeds)
          // Check if the user has access to the requested feed ID
          const requestedFeedId = (req.body as { feedId: number }).feedId; // Adjust this based on your request structure
          if (Array.isArray(userAccess) && requestedFeedId) {
            if (userAccess.some((item) => item.feed_id === requestedFeedId)) {
              // The user has access to the requested feed
              next();
            } else {
              res.status(403).json({ message: 'Access denied' });
            }
          } else {
            res.status(403).json({ message: 'Access denied' });
          }
        } else {
          res.status(403).json({ message: 'Access denied' });
        }
      } else {
        res.status(403).json({ message: 'Access denied' });
      }
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  };
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decodedToken = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    const userId = (decodedToken as { id: number }).id;

    const selectQuery = 'SELECT id,name,role,accessFlag FROM users WHERE id = ?';
    const selectValues = [userId];

    try {
      const results = await executeQuery(selectQuery, selectValues);

      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid user' });
      }

      req.user = results[0] as User;// Attach user information to the request
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Database error' });
    }
  } catch (error) {
    console.error('Token Verification Error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};


const getConnectionAsync = util.promisify(pool.getConnection).bind(pool);

async function checkAccess(userId: number): Promise<number> {
  try {
    const connection = await getConnectionAsync() as PoolConnection;
    const query = `SELECT accessFlag FROM users WHERE id = ?`;
    const [rows] = await connection.execute<RowDataPacket[]>(query, [userId]);

    if (connection.release) {
      connection.release();
    }

    if (rows.length > 0) {
      const accessFlag = rows[0].accessFlag as number;
      return accessFlag;
    } else {
      throw new Error('No accessFlag found');
    }
  } catch (error) {
    console.error('Error checking access:', error);
    throw error;
  }
}





