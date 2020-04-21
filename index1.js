var express = require('express');
const PORT =  3000;
var flash = require('connect-flash');
var passport = require("passport");
var request = require('request');
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');

app.engine('html', require('ejs').renderFile);
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
const expressSession = require('express-session');
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/public', express.static(__dirname + '/public'));
app.use(flash());
app.use(session({secret: 'keyboard cat'}))
app.use(bodyParser());

const { Pool, Client } = require('pg')
const bcrypt = require('bcrypt')
const uuidv4 = require('uuid/v4');
const LocalStrategy = require('passport-local').Strategy;
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "api",
    password: "postgres",
    port: 5432,
    ssl: true
   });

app.use(express.static('public'));

app.get('/join', function (req, res, next) {
    res.render('./join.html', {title: "Join", userData: req.user });
    });
    
    
app.post('/join', async function (req, res) {
    
    try{
    const client = await pool.connect()
    await client.query('BEGIN')
    var pwd = await bcrypt.hash(req.body.password, 5);
    await JSON.stringify(client.query('SELECT id FROM "user" WHERE "email"=$1', [req.body.username], function(err, result) {
    if(result.rows[0]){
    // req.flash(‘warning’, “This email address is already registered. <a href=’/login’>Log in!</a>”);
    res.redirect('/join');
    }
    else{
    client.query('INSERT INTO "user" (id, name, email, password) VALUES ($1, $2, $3, $4)', [uuidv4(), req.body.name, req.body.username, pwd], function(err, result) {
    if(err){console.log(err);}
    else {
    
    client.query('COMMIT')
    console.log(result)
    // req.flash(‘success’,’User created.’)
    res.redirect('/login');
    return;
    }
    });
    
    
    }
    
    }));
    client.release();
    } 
    catch(e){throw(e)}
    });

app.get('/account', function (req, res, next) {
        if(req.isAuthenticated()){
        res.render('./account.html', {title: "Account", userData: req.user, userData: req.user});
        }
        else{
        res.redirect('/login');
        }
        });

app.get('/login', function (req, res, next) {
            if (req.isAuthenticated()) {
            res.redirect('/account');
            }
            else{
            res.render('./login.html', {title: "Log in", userData: req.user});
            }
            
            });
            
app.post('/login', passport.authenticate('local', {
successRedirect: '/account',
failureRedirect: '/login',
failureFlash: true
}), function(req, res) {
if (req.body.remember) {
req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
} else {
req.session.cookie.expires = false; // Cookie expires at end of session
}
res.redirect('/login');
});

app.get('/logout', function(req, res){
 
    console.log(req.isAuthenticated());
    req.logout();
    console.log(req.isAuthenticated());
    // req.flash(‘success’, “Logged out. See you soon!”);
    res.redirect('/login');
    });

passport.use('local', new LocalStrategy({passReqToCallback : true}, (req, username, password, done) => {

    loginAttempt();
    async function loginAttempt() {
    
    
    const client = await pool.connect()
    try{
    await client.query('BEGIN')
    var currentAccountsData = await JSON.stringify(client.query('SELECT id, name, email, password FROM "user" WHERE "email"=$1', [username], function(err, result) {
    
    if(err) {
    return done(err)
    } 
    if(result.rows[0] == null){
    // req.flash(‘danger’, “Oops. Incorrect login details.”);
    return done(null, false);
    }
    else{
    bcrypt.compare(password, result.rows[0].password, function(err, check) {
    if (err){
    console.log('Error while checking password');
    return done();
    }
    else if (check){
    return done(null, [{email: result.rows[0].email, name: result.rows[0].name}]);
    }
    else{
    // req.flash(‘danger’, “Oops. Incorrect login details.”);
    return done(null, false);
    }
    });
    }
    }))
    }
    
    catch(e){throw (e);}
    };
    
    }
    ))
    passport.serializeUser(function(user, done) {
    done(null, user);
    });
    passport.deserializeUser(function(user, done) {
    done(null, user);
    });

    app.listen(PORT,()=> {console.log(`App is listening at port ${PORT}...`)});