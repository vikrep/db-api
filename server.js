const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { Pool } = require('pg');
const PORT = 5000;
// load all env variables from .env file into process.env object.
require('dotenv').config()

// Pool for LocalHost
// let pool = new Pool({
//     port: 5432,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME,
//     host: process.env.DB_HOST,
//     max: 10
// });

//Pool for Heroku
let pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
})

// Setup the express app

const app = express();

// Parse incoming request data

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));



app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "origin, X-Requested-With, Content_type, Accept");
    next();
});

app.get('/api/albums', (req, res) => {
    pool.connect((err, db, done) => {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            db.query('SELECT cover, artist, title, year, rating, id FROM artist, title WHERE artist.ref_id = title.ref_id;',
                (err, table) => {
                    if (err) {
                        res.status(500).json({ error: err });
                    } else {
                        res.status(200).send(table.rows)
                    }
                })
        }
        pool.end()
    })
});


app.listen(process.env.PORT || PORT, function () {
    console.log("Llistening on port" + PORT);
});