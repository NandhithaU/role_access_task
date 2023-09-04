const express = require("express");
const router = express.Router();
const {SECRET_KEY} = require('../conf/config');
const jwt = require('jsonwebtoken');
const {executeQuery,pool} = require('../conf/db');
const bcrypt = require('bcrypt');

router.post('/login',async (req,res) => {
    try{
        let selQuery = 'SELECT * FROM users WHERE email = ?';
        let selVal   = [req.body.email]; // FIXME : ENCRYPT THE EMAIL AND STROE IN DB
        const password = req.body.password;

        pool.getConnection((err, conn) => {
            if (err) {
                console.error('Error getting a connection from the pool: ' + err);
                return;
            }
            conn.query(selQuery, selVal,async function(error, results) {
                conn.release();
                if (error) {
                    console.error('Error executing the query: ' + error);
                } else {
                    console.log(results);
                    const user = results[0];

                    const passwordMatch = await bcrypt.compare(password, user.password);

                    if (!passwordMatch) {
                        return res.status(401).json({ message: 'Authentication failed' });
                    }
                    // const expirationTime = Math.floor(Date.now() / 1000) + 1800;

                    const token = jwt.sign({id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1d'});
                    res.json({ token });
                }
            })
        });
    } catch (e) {
        console.error('Error during login:', e);
        res.status(500).json({ message: 'Internal server error' });

    }
})

router.post('/signup', async (req, res) => {
    const {name,role,email,password } = req.body;
    // console.log("signup data-----",req.body)
    try {
      // Hash the password before storing it in the database
      const hashedPassword = await bcrypt.hash(password,10);

      // Insert the new user into the database
      await executeQuery('INSERT INTO users (name, role, email, password,) VALUES (?, ?, ?, ?)', [name, role, email, hashedPassword]);

      res.status(201).json({ message: 'User created' });
    } catch (error) {
      console.error('Error during signup:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });


module.exports = router;