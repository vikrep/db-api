const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const multer = require('multer');

const PORT = 5000;
// load all env variables from .env file into process.env object.
require('dotenv').config()

const app = express();

// configure the keys for accessing AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// create S3 instance
const s3 = new AWS.S3();

const upload = multer({
    storage: multer.memoryStorage(),
    // file size limitation in bytes
    limits: { fileSize: 52428800 },
});

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

// API downloading full table
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
// API downloading disk tracklist
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

// API uploading picture and store to file system

app.post('/upload', upload.single('imageFile'), (req, res) => {
    s3.putObject({
        Bucket: process.env.DANIK_S3_BUCKET,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read', // your permisions  
    }, (err) => {
        if (err) return res.status(400).send(err);
        res.send('File uploaded to S3');
    })
})

app.listen(process.env.PORT || PORT, function () {
    console.log("Llistening on port" + PORT);
})