const express = require('express');
const PORT = process.env.PORT || 3000 ;
const flash = require('connect-flash');
const passport = require("passport");
const request = require('request');
const session = require('express-session');
const bodyParser = require('body-parser');
const path  = require('path');
const app = express();

const { Pool, Client } = require('pg');
const bcrypt = require('bcrypt');
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

app.engine('html', require('ejs').renderFile);
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/public', express.static(__dirname + '/public'));
app.use(flash());
app.use(session({secret: 'keyboard cat'}))
app.use(bodyParser());
app.use(express.static('public')); 

// passport.use('local', new LocalStrategy({passReqToCallback : true}, (req,username, password, done) => {
//     loginAttempt();
    
//     async function loginAttempt() {
//         console.log("i am in");
//         const client = await pool.connect()
//         try{
//             await client.query('BEGIN')
//             var currentAccountsData = await JSON.stringify(client.query('SELECT * FROM "user" WHERE "email"=$1', [username], function(err, result) {    
//                 if(err) {
//                     return done(err)
//                 } 
//                 if(result.rows[0] == null){
//                     req.flash('danger', "Oops. Incorrect login details.");
//                     return done(null, false);
//                 }
//                 else{
//                     bcrypt.compare(password, result.rows[0].password, function(err, check) {
//                         if (err){
//                             console.log('Error while checking password');
//                             return done();
//                         }
//                         else if (check){
//                             return done(null, [{email: result.rows[0].email, name: result.rows[0].name}]);
//                         }
//                         else{
//                         req.flash('danger', "Oops. Incorrect login details.");
//                         return done(null, false);
//                         }
//                     });
//                 }
//             }))
//         }
//         catch(e){throw (e);}
//     };        
// }))
           
// passport.serializeUser(function(user, done) {
//     done(null, user);
//     console.log("wokring ser");
// });

// passport.deserializeUser(function(user, done) {
//     done(null, user);
//     console.log("wokring deser");
// });

// JOIN
// A route for a user to register. This is made up of two sections: a Get and a Post.

// WORKING
app.get('/join', function (req, res, next) {
    // console.log(req.method);
    res.render('./join.html', {title: "Join", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
    // res.render('./join.html', {title: title});
});

// WORKING
app.post('/join', async function (req, res) {
    // console.log("inside here");
    try{
        const client = await pool.connect()
        await client.query('BEGIN')
        var pwd = await bcrypt.hash(req.body.password, 5);
        // console.log("1");
        await JSON.stringify(client.query('SELECT id FROM "user" WHERE email=$1', [req.body.email], function(err, result) {            
            if(result && result.rows[0]){
                // console.log('2');
                req.flash('warning', "This email address is already registered. <a href='/login'>Log in!</a>");
                res.send("This email address is already registered.");
                // res.redirect('/join');
                
                console.log("redirect to /join");
            }
            else
            {   
                // console.log("3");
                client.query('INSERT INTO "user"(id, name, email, password) VALUES ($1, $2, $3, $4)', [uuidv4(), req.body.name, req.body.email, pwd], function(err, result) {
                    if(err){console.log(err);}
                    else 
                    {
                        client.query('COMMIT')
                        console.log(result)
                        req.flash('success','User created.')
                        res.redirect('/login');
                        // console.log("redirect to /login");
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
        
        res.render('./account.html', {title: "account", userData: req.user, userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
    }
    else{
        res.redirect('/login');
    }
});

// LOGIN
// Get login will ask Express to render the login page.
// Post login will submit the user’s login form, by running it through the passport-local strategy.

// app.get('/login', function (req, res, next) {
//     if (req.isAuthenticated()) {
//         res.redirect('/account');
//     }
//     else{
//         res.render('./login.html', {title: "Log in", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
//     }
// });
    
// app.post('/login', passport.authenticate('local', {
//     successRedirect: '/account',
//     failureRedirect: '/login',
//     failureFlash: true
//     }), function(req, res) {
//         if (req.body.remember) {
//             req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
//         } else {
//             req.session.cookie.expires = false; // Cookie expires at end of session
//         }
//         console.log("i am here");
//         res.send("redirected to login");
//         // res.redirect('/login');
// });
app.get('/login', function (req, res, next) {
    if (req.isAuthenticated()) {
    res.redirect('/account');
    }
    else{
    res.render('./login.html',{title:'login'});
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
    var currentAccountsData = await JSON.stringify(client.query('SELECT id, name, email, password FROM “user” WHERE “email”=$1', [username], function(err, result) {
    
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