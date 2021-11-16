const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('static'));

var multer  = require('multer');
var fs  = require('fs');
var upload = multer({ dest: 'uploads/' });

const crypto = require('crypto');
const session = require('express-session');
const cookie = require('cookie');

var Datastore = require('nedb');
var images = new Datastore({ filename: path.join(__dirname,'db', 'images.db'), autoload: true, timestampData : true});
var comments = new Datastore({ filename: path.join(__dirname,'db', 'comments.db'), autoload: true , timestampData : true});
var users = new Datastore({ filename: path.join(__dirname,'db', 'users.db'), autoload: true});
var gallery = new Datastore({ filename: path.join(__dirname,'db', 'galleries.db'), autoload: true , timestampData : true});

var Images = (function(){
    return function image(image, username, galleryId){
        this.galleryId = galleryId;
        this.username = username;
        this.title = image.body.title;
        this.picture = image.file;
    };
}());

var Comments = (function(){
    return function comment(comment, username, imageOwner, imageId, galleryId){
        this.galleryId = galleryId;
        this.username = username;
        this.imageOwner = imageOwner;
        this.imageId = imageId;
        this.content = comment.content;
    };
}());

app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(function (req, res, next){
    req.username = (req.session.user)? req.session.user._id : null;
    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});

var salt = crypto.randomBytes(16).toString('base64');

let generateHash = function(password){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var saltedHash = hash.digest('base64');
    return saltedHash;
};

var isAuthenticated = function(req, res, next) {
    if (!req.username) return res.status(401).end("access denied");
    next();
};
//user
app.post('/signup/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("username " + username + " already exists");
        let saltedHash = generateHash(password);
        users.update({_id: username},{_id: username, password: saltedHash}, {upsert: true}, function(err, user){
            if (err) return res.status(500).end(err);
            // initialize cookie
            req.session.user = {_id: username, password: saltedHash};
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                  path : '/', 
                  maxAge: 60 * 60 * 24 * 7
            }));
            
            return res.json("user " + username + " signed up");
        });
    });
});

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signin/
app.post('/signin/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("access denied");
        if (user.password !== generateHash(password)) return res.status(401).end("access denied"); 
        // initialize cookie
        req.session.user = user;
        res.setHeader('Set-Cookie', cookie.serialize('username', username, {
              path : '/', 
              maxAge: 60 * 60 * 24 * 7
        }));
        return res.json("user " + username + " signed in");
    });
});

// curl -b cookie.txt -c cookie.txt localhost:3000/signout/
app.get('/signout/', isAuthenticated, function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 3 // 1 week in number of seconds
    }));
    res.redirect('/login.html');
});



// Create
app.post('/api/images/', isAuthenticated, upload.single('picture'), function (req, res, next) {
    if(typeof(req.body.title) !== 'string' || typeof(req.file) !== 'object') return res.status(400).end("Invalid Arguments");
    gallery.update({username: req.username}, {username: req.username}, {upsert:true, returnUpdatedDocs :true}, function (err, numAffected, affectedDocuments, upsert) {   
        if (err) return res.status(500).end(err);
        images.insert(new Images(req, req.username, affectedDocuments._id), function (err, img) {   
            if (err) return res.status(500).end(err);
            return res.json(img);
        });
    })
});

app.post('/api/galleries/:galId/images/:id/comments/', function (req, res, next) {
    if(typeof(req.body.content) !== 'string') return res.status(400).end("Invalid Arguments");
    images.findOne({ _id: req.params.id}, function (err, doc) {
        if (err) return res.status(500).end(err);
        if(doc == null) return res.status(404).end("Image id does not exist");
        comments.insert(new Comments(req.body, req.username, doc.username, req.params.id, req.params.galId), function (err, comment) {
            if (err) return res.status(500).end(err);
            return res.json(comment);
        });
    });
});

// Read

app.get('/api/galleries/', isAuthenticated, function (req, res, next) {
    let page = 0;
    if(req.query.page != null) page = req.query.page;
    gallery.find({}).sort({ createdAt:-1}).skip(page).limit(2).exec( function (err, doc) {
        if (err) return res.status(500).end(err);
        return res.json(doc);
    });
});


app.get('/api/galleries/:id/images/', isAuthenticated, function (req, res, next) {
    let page = 0;
    if(req.query.page != null) page = req.query.page; 
    gallery.findOne({ _id: req.params.id}, function (err, gal) {
        if (err) return res.status(500).end(err);
        if(gal == null) return res.json([]);
        images.find({galleryId: gal._id}).sort({createdAt:-1}).skip(page).limit(2).exec( function (err, doc) {
            if (err) return res.status(500).end(err);
            delete doc[0]['picture'];
            if(doc.length == 2) delete doc[1]['picture'];
            return res.json(doc);
        });
    });
});

app.get('/api/images/:id/picture/', isAuthenticated, function (req, res, next) {
    images.findOne({ _id: req.params.id}, function (err, doc) {
        if (err) return res.status(500).end(err);
        if (doc == null) return res.status(404).end("Image id does not exist");
            var profile = doc.picture;
            res.setHeader('Content-Type', profile.mimetype);
            res.sendFile(path.join(__dirname, profile.path));
    });
});

app.get('/api/galleries/:galId/images/:id/comments/', isAuthenticated, function (req, res, next) {
    let page = 0;
    if(req.query.page != null) page = req.query.page;
    images.findOne({ _id: req.params.id }, function (err, doc) {
        if (err) return res.status(500).end(err);
        if(doc == null) return res.status(404).end("Image id does not exist");
        comments.find({imageId: req.params.id, galleryId: req.params.galId}).sort({createdAt:-1}).skip(page*10).limit(11).exec(function(err, coms) { 
            if (err) return res.status(500).end(err);
            return res.json(coms);
        });
    });
});


// Delete

app.delete('/api/galleries/:galId/images/:id/', function (req, res, next) {
    
    gallery.findOne({ _id: req.params.galId}, function (err, gal) {
        if (err) return res.status(500).end(err);
        if(req.username != gal.username) return res.status(403).end("forbidden");
        if(gal == null) return res.status(404).end("Gallery id does not exist");
        images.findOne({ _id: req.params.id }, function (err, img) {
            if (err) return res.status(500).end(err);
            if(req.username != img.username) return res.status(403).end("forbidden");
            if(img == null) return res.status(404).end("Image id does not exist");
            images.remove(img, {}, function (err, numRemoved) {
                if (err) return res.status(500).end(err);
                if(numRemoved != 0){
                    fs.unlink(path.join(__dirname, img.picture.path), function(err){
                        if (err) return res.status(500).end(err);
                    });
                    comments.remove({ imageId: req.params.id }, {multi: true},  function (err, numRemoved) {
                        if (err) return res.status(500).end(err);
                    });
                    images.find({galleryId: gal._id},  function (err, doc) {
                        if(doc.length == 0) {
                            gallery.remove({username: req.username}, {},  function (err, numRemoved) {
                                if (err) return res.status(500).end(err);
                            });
                        }
                    });
                }
                return res.json(img);});
        });
    });
});

app.delete('/api/galleries/:galId/images/:id/comments/:id/', function (req, res, next) {
    comments.findOne({ _id: req.params.id}, function (err, doc) {
        if (err) return res.status(500).end(err);
        if (doc == null) return res.status(404).end("Comment id does not exist");
        if(req.username != doc.username && req.username !=doc.imageOwner) return res.status(403).end("forbidden");
        comments.remove(doc, {}, function (err, numRemoved) { 
            if (err) return res.status(500).end(err);
            return res.json(doc); 
        });
    });
});

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});