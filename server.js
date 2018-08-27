const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { Pool } = require('pg');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const filePath = __dirname + "/public/200304-2.jpg";
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
app.use('/public', express.static(__dirname + '/public'));
app.use(fileUpload());

app.get('/api/albums', (req, res) => {
    pool.connect((err, client, done) => {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            client.query("SELECT cover, artist, title, year, rating, id  FROM album ORDER BY artist;",
                (err, table) => {
                    done();
                    if (err) {
                        res.status(500).json({ error: err });
                    } else {
                        res.status(200).send(table.rows)
                    }
                })
        }
    })
});

app.get('/api/disk/:id', (req, res) => {
    pool.connect((err, client, done) => {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            client.query(`SELECT cover, artist, title, year, label, genre, style, country, format, rating, id, track, time FROM album, tracklist WHERE disk_id = '${req.params.id}' and id = '${req.params.id}';`,
                (err, table) => {
                    done();
                    if (err) {
                        res.status(500).json({ error: err });
                    } else {
                        res.status(200).send(table.rows)
                    }
                })
        }
    })
});

app.post('/upload', (req, res) => {
    let imageFile = req.files.file;

    imageFile.mv(`${__dirname}/public/${imageFile.name}`, function (err) {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).json({ file: `public/${imageFile.name}` });
    });
});

app.get('/upload', (req, res) => {
    fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        res.send(data)
    });
});

app.listen(process.env.PORT || PORT, function () {
    console.log("Llistening on port" + PORT);
});