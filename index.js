const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
require('express-async-errors');

const MongoStore = require('connect-mongo')(session);
const path = require('path');
const app = express();

// Import Constant
const constants = require('./src/constants/common.js')

// Import Router
const initAPIs = require("./src/routes/api")

// Define Config
const PORT = process.env.PORT || 8797
const db = mongoose.connection;

dotenv.config()

// Connect DB
mongoose.set('useCreateIndex', true)
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true }).then(() => console.log('DB Connected!'));
db.on('error', (err) => {
    console.log('DB connection error:', err.message);
})

// Static File Static Config
var options = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1d',
    redirect: false,
    setHeaders: function(res, path, stat) {
        res.set('x-timestamp', Date.now())
    }
}

app.use(morgan("dev"))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(session({
    secret: 'Multi',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: db
    })
}));

initAPIs(app);

// Init FIle Static Router
app.use(express.static(path.join(__dirname, 'static'), options));

// Handle Check and Notify Error
app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

app.listen(PORT, () => { console.log("Server started on http://localhost:" + PORT) })

module.exports = app;