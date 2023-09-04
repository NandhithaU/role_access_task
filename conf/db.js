const mysql = require('mysql');

const pool = mysql.createPool({
  host :'localhost',
  user:"root",
  password:"",
  database:"userinfo",
  connectionLimit:10
})

exports.pool = pool;

exports.executeQuery = function(query, values) {
    const pool = mysql.createPool({
        host :'localhost',
        user:"root",
        password:"",
        database:"userinfo",
        connectionLimit:10
    })

  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting a connection from the pool: ' + err);
        reject(err);
        return;
      }

      connection.query(query, values, function(error, results) {
        connection.release(); // Release the connection back to the pool
        // console.log('Query:', query, values);
        console.log(error);
        if (error) {

          console.error('Error executing the query: ' + error);
           reject(error);
        } else {
           resolve(results);
        }
        console.log(resolve);
      });
    });
  });
};

