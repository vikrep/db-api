const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { Pool, Client } = require('pg');
// const AWS = require('aws-sdk');
// const multer = require('multer');
const PORT = 5000;
// load all env variables from .env file into process.env object.
require('dotenv').config()
const passport = require("passport");
const request = require('request');
const session = require("express-session");
const bcrypt = require('bcrypt')
const uuidv4 = require('uuid/v4');
const LocalStrategy = require('passport-local').Strategy;

const app = express();

app.use(session({ secret: 'keyboard cat' }))
app.use(require('cookie-parser')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "origin, X-Requested-With, Content_type, Accept");
    next();
});
app.use('/public', express.static(__dirname + '/public'));

app.use(passport.initialize());
app.use(passport.session());


// configure the keys for accessing AWS
// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// create S3 instance
// const s3 = new AWS.S3();

// const upload = multer({
//     storage: multer.memoryStorage(),
//     // file size limitation in bytes
//     limits: { fileSize: 52428800 },
// });

var currentAccountsData = [];
var user = {};

// Pool for LocalHost
let pool = new Pool({
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    max: 10
});

//Pool for Heroku
// let pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: true
// })

// Parse incoming request data



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

// API uploading picture and store to S3 CDN

// app.post('/upload', upload.single('imageFile'), (req, res) => {
//     console.log(req.file)
//     s3.putObject({
//         Bucket: process.env.DANIK_S3_BUCKET,
//         Key: req.file.originalname,
//         Body: req.file.buffer,
//         ContentType: req.file.mimetype,
//         ACL: 'public-read', // your permisions  
//     }, (err) => {
//         if (err) return res.status(400).send(err);
//         res.send('File uploaded to S3');
//     })
// })

// API uploading new data to album table

app.post('/upload/form', (req, res) => {
    var cover = req.body.cover
    var artist = req.body.artist
    var title = req.body.title
    var year = req.body.year
    var rating = req.body.rating
    var id = req.body.id
    var country = req.body.country
    var label = req.body.label
    var format = req.body.format
    var genre = req.body.genre
    var style = req.body.style
    var credits = req.body.credits
    var notes = req.body.notes
    pool.connect((err, client, done) => {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            client.query(`INSERT INTO album (cover, artist, title, year, label, genre, style, country, format, rating, credits, id, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING album_id;`,
                [cover, artist, title, year, label, genre, style, country, format, rating, credits, id, notes],
                (err, table) => {
                    done();
                    if (err) {
                        res.status(500).json({ error: err });
                    } else {
                        res.status(200).send('Form inserted')
                    }
                })
        }
    })
});


app.post('/admin', passport.authenticate('local', {
        successRedirect: '/account',
        failureRedirect: '/login'
    }), function (req, res) {
        if (req.body.remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
        } else {
            req.session.cookie.expires = false; // Cookie expires at end of session
        }
        res.redirect('/');
});

passport.use('local', new LocalStrategy({passReqToCallback : true}, (req, username, password, done) => {

    loginAttempt();
    async function loginAttempt() {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            var currentAccountsData = await JSON.stringify(client.query('SELECT id, firstname, email, password FROM users WHERE email=$1', [username], function (err, result) {
                if (err) {
                    return done(err)
                }
                if (result.rows[0] == null) {
                    return done(null, false);
                }
                else {
                    bcrypt.compare(password, result.rows[0].password, function(err, check) {
                        if (err){
                        return done();
                        }
                        else if (check) {
                            user = { "id": result.rows[0].id, "username": result.rows[0].email, "password": result.rows[0].password }
                            return done(null, user)
                        }
                        else {
                            return done(null, false);
                        }
                    });
                }
            }))
        }

        catch (e) { throw (e); }
    };

}
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});


app.listen(process.env.PORT || PORT, function () {
    console.log("Llistening on port" + PORT);
})