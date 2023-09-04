const apiRoutes = function(app){
    //api routes
    app.use("/api",require("./api/login.js"));
    app.use("/api",require("./api/users.js"));
    app.use("/api",require("./api/feeds.js"));
}

module.exports = {
    apiRoutes
}
