const express = require('express');
const app = express();
const passport = require("passport");
const request = require('request');
const { Pool, Client } = require('pg');
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const LocalStrategy = require('passport-local').Strategy;
const pool = new Pool({
 user: process.env.PGUSER,
 host: process.env.PGHOST,
 database: process.env.PGDATABASE,
 password: process.env.PGPASSWORD,
 port: process.env.PGPORT,
 ssl: true
});

// JOIN
// A route for a user to register. This is made up of two sections: a Get and a Post.

app.get('/join', function (req, res, next) {
    // res.render('join', {title: "Join", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
    res.send('join page');
});

app.post('/join', async function (req, res) {
    try{
        const client = await pool.connect()
        await client.query('BEGIN')
        var pwd = await bcrypt.hash(req.body.password, 5);
        await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [req.body.username], function(err, result) {
            if(result.rows[0]){
                req.flash('warning', "This email address is already registered. <a href='/login'>Log in!</a>");
                res.redirect('/join');
            }
            else
            {
                client.query('INSERT INTO users (id, "Name", email, password) VALUES ($1, $2, $3, $4)', [uuidv4(), req.body.Name, req.body.username, pwd], function(err, result) {
                    if(err){console.log(err);}
                    else 
                    {
                        client.query('COMMIT')
                        console.log(result)
                        req.flash('success','User created.')
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

// ACCOUNT
// Renders a page if the user is logged in. If not, the user is redirected to the login page.
app.get('/account', function (req, res, next) {
    if(req.isAuthenticated()){
        res.render('account', {title: "Account", userData: req.user, userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
    }
    else{
        res.redirect('/login');
    }
});

// LOGIN
// Get login will ask Express to render the login page.
// Post login will submit the user’s login form, by running it through the passport-local strategy.

app.get('/login', function (req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/account');
    }
    else{
        res.render('login', {title: "Log in", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
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

// LOGOUT
app.get('/logout', function(req, res){ 
    console.log(req.isAuthenticated());
    req.logout();
    console.log(req.isAuthenticated());
    req.flash('success', "Logged out. See you soon!");
    res.redirect('/login');
});

// PASSPORT-LOCAL STRATEGY
passport.use('local', new LocalStrategy({passReqToCallback : true}, (req, username, password, done) => {
    loginAttempt();
    
    async function loginAttempt() {
        const client = await pool.connect()
        try{
            await client.query('BEGIN')
            var currentAccountsData = await JSON.stringify(client.query('SELECT id, "Name", "email", "password" FROM "users" WHERE "email"=$1', [username], function(err, result) {    
                if(err) {
                    return done(err)
                } 
                if(result.rows[0] == null){
                    req.flash('danger', "Oops. Incorrect login details.");
                    return done(null, false);
                }
                else{
                    bcrypt.compare(password, result.rows[0].password, function(err, check) {
                        if (err){
                            console.log('Error while checking password');
                            return done();
                        }
                        else if (check){
                            return done(null, [{email: result.rows[0].email, Name: result.rows[0].Name}]);
                        }
                        else{
                        req.flash('danger', "Oops. Incorrect login details.");
                        return done(null, false);
                        }
                    });
                }
            }))
        }
        catch(e){throw (e);}
    };        
}))
           
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});
