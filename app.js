/*
Author      : Nandhitha Ulaganathan
Description : This is the main application file (app.js).It sets up an Express server for user authentication and other routes.
Date        : 29-08-2023
*/

const express    = require('express');
const bodyParser = require('body-parser');
const app        = express();
app.use(bodyParser.urlencoded({extended:false}));
const path = require('path');


// parse application/json
app.use(bodyParser.json());

const routes = require('./routes.js');
const port = 7025;

routes.apiRoutes(app);

app.listen(port, function() {
  console.log(`The server runs at port : ${port}`);
  console.log("__dirname",__dirname)
})