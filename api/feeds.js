const express = require("express");
const router = express.Router();
const {executeQuery} = require('../conf/db');
const {checkRoleAndAccess,authenticate} = require('../lib/auth');

router.post('/feeds',authenticate, checkRoleAndAccess(['superAdmin', 'Admin']), async (req, res) => {
    try {
      const { name, url, description } = req.body;

      // Validate the incoming data as needed

      // Construct the SQL query to insert data into the "feed" table
      const insertQuery = 'INSERT INTO feed (name, url, description) VALUES (?, ?, ?)';
      const insertValues = [name, url, description];

      // Execute the query using the MySQL connection pool
      await executeQuery(insertQuery, insertValues , (err, res) => {
        if (err) {
            console.error('Error inserting data into "feed" table:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        return res;
        })

        res.status(201).json({ message: 'Feed created' });


    } catch (error) {
      console.error('Error creating feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/feeds/:url',checkRoleAndAccess(['superAdmin', 'Admin','Basic']), async (req, res) => {
    try {
      const feedurl = req.params.url;

      // Construct the SQL query to fetch a feed by ID
      const selectQuery = 'SELECT * FROM feed WHERE url = ?';

      // Execute the query using the MySQL connection pool

      const feedResults = await executeQuery(selectQuery, feedurl);

      if (feedResults.length === 0) {
        return res.status(404).json({ message: 'Feed not found' });
      } else {
        res.json(results[0]);
      }

    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/feeds/:url',checkRoleAndAccess(['superAdmin', 'Admin']), async (req, res) => {
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

router.delete('/feeds/:url', async (req, res) => {
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

module.exports = router