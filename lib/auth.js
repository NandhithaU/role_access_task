const {executeQuery} = require('../conf/db')
const {SECRET_KEY} = require('../conf/config')
const jwt = require('jsonwebtoken');
const {pool} = require("../conf/db")

module.exports = {
    checkRoleAndAccess: (roles) => {
        return async (req, res, next) => {
          const userRole = req.user.role;
          // console.log("req users data---------", req.user)
          var userAccess = req.user.accessFlag;
          if(req.user.role !== 'superAdmin') {
            const userId = req.user.id;
            userAccess = await checkAccess(userId);
          }
          const isDeleteRequest = req.method === 'DELETE';
          const isGetRequest = req.method === 'GET';

          if (roles.includes(userRole) && userAccess) {
            const accessFlag = userAccess ? userAccess: 0;
            if (userRole === 'admin' && (accessFlag === 2 || accessFlag === 1)) {
              if (isDeleteRequest) {
                // Only allow deleting Basic users if the user has 'post and delete' access
                next();
              } else if(userRole === 'admin' && userAccess.length > 0) {
                // Only allow creating Basic users if the user has 'create' access
                if (req.body.role === 'Basic') {
                  next();
                } else {
                  res.status(403).json({ message: 'Access denied' });
                }
              }
            } else if (userRole === 'superAdmin' && accessFlag === 4) {
              // Super admin can create any user type
              next();
            }  else if (accessFlag === 3) {
              if (!isGetRequest) {
                // Allow only if accessFlag is 3 (read access for their own feeds)
                // Check if the user has access to the requested feed ID
                const requestedFeedId = req.body.feedId; // Adjust this based on your request structure
                if (requestedFeedId && userAccess.some(item => item.feed_id === requestedFeedId)) {
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
        };
    },

    authenticate : async (req, res, next) => {

        const token = req.header('Authorization');

        if (!token) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        try {
          // const decodedToken = jwt.verify(token,SECRET_KEY);
          const decodedToken = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
          const userId = decodedToken.id;

          const selectQuery = 'SELECT id,name,role,accessFlag FROM users WHERE id = ?';
          const selectValues = [userId];

          try {
            const results = await executeQuery(selectQuery, selectValues);

            if (results.length === 0) {
              return res.status(401).json({ message: 'Invalid user' });
            }

            req.user = results[0]; // Attach user information to the request
            next();
          } catch (error) {
            return res.status(500).json({ message: 'Database error' });
          }
        } catch (error) {
          console.error('Token Verification Error:', error);
          return res.status(401).json({ message: 'Invalid token' });
        }
    }
}

async function checkAccess (userId) {
  try {
    const connection = pool.getConnection( async (err, conn) => {
      if(!err) {
        const query = `SELECT accessFlag FROM users WHERE id = ?`;
        conn.query(query,userId,(err, rows)=>{
          connection.release();
          console.log("rows-----",rows)
          if(!err) {
            return rows;
          } else {
            console.error(err);
            throw err;
          }
        });
      } else {
        console.error(err);
        throw err;
      }
    });

  } catch (error) {
    console.error('Error checking access:', error);
    throw error;
  }
}
