const cool = require('cool-ascii-faces')
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { Pool, Client } = require('pg');
const PORT = 5000;
const connectionString = 'postgres://kghpydsncehrre:f5f822411a913a9e8a73caeae8112752a75ad62dbc54e6d15c5fb06e4e667c3a@ec2-50-17-250-38.compute-1.amazonaws.com:5432/d2etfsda68egsh'
// load all env variables from .env file into process.env object.
require('dotenv').config()

// let pool = new Pool({
//     port: 5432,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME,
//     host: process.env.DB_HOST,
//     max: 10
// });

const client = new Client({
    connectionString: connectionString,
    ssl: true,
})


// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: true,
//   });

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


client.connect()
client.query('SELECT cover, artist, title, year, rating, id FROM artist, title WHERE artist.ref_id = title.ref_id',
    (err, res) => {
        if (err) throw err;
        for (let row of res.rows) {
            console.log(JSON.stringify(row));
        }
        client.end();
    })





// app.get('/api/albums', (req, res) => {
//     pool.connect((err, db, done) => {
//         if (err) {
//             res.status(500).json({ error: err });
//         } else {
//             db.query('SELECT cover, artist, title, year, rating, id FROM artist, title WHERE artist.ref_id = title.ref_id',
//                 (err, table) => {
//                     if (err) {
//                         res.status(500).json({ error: err });
//                     } else {
//                         res.status(200).send(table.rows)
//                     }
//                 })
//         }
//         pool.end();
//     })
// });



app.listen(PORT, () => console.log('Listening on port ' + PORT));