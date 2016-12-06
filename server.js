var express = require('express');
var morgan = require('morgan');
var fs = require('fs');
var path = require('path');
var Pool = require('pg').Pool;
var crypto = require('crypto');
var bodyParser = require('body-parser');
var session = require('express-session');
var http = require('https');

var pgdbconfig = {
    user: 'tuhinsherlock',
    database: 'tuhinsherlock',
    host: 'db.imad.hasura-app.io',
    port: '5432',
    password: 'db-tuhinsherlock-17607'
};

var pool = new Pool(pgdbconfig);

console.log("Connected to DB");

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(session({
    secret: 'someRandomSecretValue',
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30}
}));


var api_key = '9c6f4edf8b2c52678bf8e0885ff611d9';
var tmdbconfig;
var tmdbconfigreq = http.request({
    "method": "GET",
    "hostname": "api.themoviedb.org",
    "port": null,
    "path": "/3/configuration?api_key="+api_key,
    "headers": {} }, function (res) {
  var chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function () {
    var body = Buffer.concat(chunks);
    body = JSON.parse(body);
    tmdbconfig = body;
    //console.log('tmdbconfig ---> '+JSON.stringify(body));
    console.log('Config ready');
  });
});
tmdbconfigreq.write("{}");
tmdbconfigreq.end();

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

function getFullPosterPath(posterpath, type){
    if(type=='poster')
        return tmdbconfig['images']['base_url']+tmdbconfig['images']['poster_sizes'][2]+posterpath;
    else if(type=='logo')
        return tmdbconfig['images']['base_url']+tmdbconfig['images']['logo_sizes'][0]+posterpath;
}

function getSearchRequestOptions(movie_name){
    var options = {
      "method": "GET",
      "hostname": "api.themoviedb.org",
      "port": null,
      "path": "/3/search/movie?query="+movie_name+"&language=en-US&api_key="+api_key,
      "headers": {}
    };
    return options;
}

function getMovieDetailsOptions(movie_id){
    var options = {
      "method": "GET",
      "hostname": "api.themoviedb.org",
      "port": null,
      "path": "/3/movie/"+movie_id+"?api_key="+api_key+"&append_to_response=credits",
      "headers": {}
    };
    return options;
}

function savemoviedetails(body, res){

    var cast = body.credits.cast.slice(0, 7);
    var dbcast = [];
    for(var j=0; j<cast.length; j++)
        dbcast.push(cast[j].name);
    dbcast = dbcast.join(', ');

    var crew = body.credits.crew;
    var dbdirector = [];
    for(var j=0; j<crew.length; j++)
        if(crew[j].job=="Director")
            dbdirector.push(crew[j].name);
    dbdirector = dbdirector.join(', ');

    console.log(dbcast);
    console.log(dbdirector);

    pool.query('INSERT into "movie" (id, name, release, director, "cast", posterpath, overview) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [body.id, body.title, body.release_date, dbdirector, dbcast, body.poster_path, body.overview], function (err, result) {
        if (err) {
            console.log('DB insertion error');
            console.log(err.toString());
            res.status(500).send(err.toString());
        } else {
            console.log('Successfully inserted movie into db');
            var moviedetails = {
                id : body.id,
                name : body.title,
                release : body.release_date,
                director : dbdirector,
                cast : dbcast,
                overview : body.overview,
                posterpath : getFullPosterPath(body.poster_path, 'poster')
            };
            console.log('Returning ---> '+JSON.stringify(moviedetails));
            res.send(JSON.stringify(moviedetails));
        }
    });
}

function tmdbquerybyid(movieid, res){
    var tmdbreq = http.request(getMovieDetailsOptions(movieid), function(tmdbres){
        var chunks = [];
        
        tmdbres.on('data', function(chunk){
            chunks.push(chunk);
        });
    
        tmdbres.on('end', function(){
            var body = Buffer.concat(chunks);
            body = JSON.parse(body);
            console.log(JSON.stringify(body));
            
            if(tmdbres.statusCode==200){
                savemoviedetails(body, res);
            }
            else{
                console.log("ERROR status "+tmdbres.statusCode);
                res.send('Error'+tmdbres.statusCode);
            }
        });
    });
    tmdbreq.write("{}");
    tmdbreq.end();
}

app.get('/get-recent', function(req, res){
    pool.query('SELECT content.id as reviewid, content.userid, content.date, "user".username, content.movieid, movie.name as moviename, '+
               'movie.posterpath FROM content, "user", movie WHERE content.userid = "user".id AND content.movieid = movie.id '+
               'ORDER BY content.date DESC LIMIT 20', function(err, result){
        if(err){
            console.log('Error fetching recent '+err.toString());
            res.status(500).send('Error fetching reviews');
        }
        else{
            var recent_reviews = result.rows;
            for(var i=0; i<recent_reviews.length; i++){
                var posterpath = recent_reviews[i].posterpath;
                delete recent_reviews[i].posterpath;
                recent_reviews[i].logo = getFullPosterPath(posterpath, 'logo');
            }
            console.log('Returning ---> '+JSON.stringify(recent_reviews));
            res.send(JSON.stringify(recent_reviews));
        }
    });

});


app.get('/get-review-details',function(req, res) {

    var review_id = req.query.id;
    console.log("Review Id: "+review_id);
    pool.query('SELECT "content".userid, "content".movieid, "content".date, "content".review, "movie".name AS moviename,'+
                      '"movie".posterpath, "movie".release, "movie".overview, "movie".director, "movie".cast, "user".username FROM "content","user","movie"'+
                      'WHERE "content".id = $1 AND "content".userid = "user".id AND "content".movieid = "movie".id',
                [review_id], function (err, result) {
        if (err) 
        {
            res.status(500).send(err.toString());
            console.log(err.toString());
        } 
        else if (result.rows.length === 0) 
        {
            res.status(404).send('Review Not Found');
            console.log('Review Not Found');
        }
        else 
        {
            var review_details = result.rows[0];
            review_details.posterpath = getFullPosterPath(review_details.posterpath, 'poster');
            review_details.review = review_details.review.replace(new RegExp('\r?\n', 'g'), '<br>');
            
            console.log('Fetched review ---> '+JSON.stringify(review_details));

            res.send(JSON.stringify(review_details));

        }
    });
});

app.get('/get-user-details',function(req, res) {

    var username = req.query.username;
    console.log("GET USER DETAILS Username: "+username);

    pool.query('SELECT id,name,datejoined,totalreviews FROM "user" WHERE username=$1',[username],function (err, result) {
        if (err) 
        {
            res.status(500).send(err.toString());
            console.log(err.toString());
        } 
        else if(result.rows.length==0){
            console.log('No such user');
            res.status(404).send('No such user');
        }
        else 
        {
            var userdetails = result.rows[0];

            console.log('received user table -> ' + userdetails);
            pool.query('SELECT content.id AS contentid, content.movieid, movie.name AS moviename, content.date,'+ 
                'content.review, movie.posterpath FROM "content", movie WHERE content.userid=$1 AND movie.id=content.movieid '+
                'ORDER BY content.date DESC'
                ,[userdetails.id],function (err, result1) {
                    if(err)
                    {
                        res.status(500).send(err.toString());
                        console.log(err.toString());
                    }
                    else
                    {
                        var reviews = result1.rows;
                        for(var i=0; i<reviews.length; i++){
                            reviews[i].logo = getFullPosterPath(reviews[i].posterpath, 'logo');
                            delete reviews[i].posterpath;
                        }
                        userdetails.userreviews=reviews;

                        console.log('RETURNING ----> '+JSON.stringify(userdetails));
                        res.send(JSON.stringify(userdetails));
                    }
            });

        }
    });
});

 
app.get('/get-search-results', function(req, res){

    var term = req.query.term;
    term = term.replace(/ /g, "%20");
    console.log("search-movie term = "+term);

    var req1 = http.request(getSearchRequestOptions(term), function(res1){
    
        var chunks = [];
        
        res1.on("data", function(chunk){
          chunks.push(chunk);
        });
        
        res1.on("end", function(){
            var body = Buffer.concat(chunks);
               body = JSON.parse(body);
          
            if(res1.statusCode==200){
                var results = body["results"].slice(0, 5);   //return max 5 results
                var results1 = [];
                for(var i=0; i<results.length; i++){
                    var movie_details = {
                        name : results[i].title,
                        id : results[i].id,
                        poster_path : tmdbconfig['images']['base_url']+tmdbconfig['images']['poster_sizes'][0]+results[i].poster_path,
                        logo : tmdbconfig['images']['base_url']+tmdbconfig['images']['logo_sizes'][0]+results[i].poster_path,
                        release : results[i].release_date.split('-')[0],
                        overview : body.overview
                    }
                    results1.push(movie_details);
                }
                console.log("results = "+results1);
                res.send(JSON.stringify(results1));
           }
            else{
                console.log("ERROR status "+res1.statusCode);
                res.send("ERROR status "+res1.statusCode);
            }
        });
    });

    req1.write("{}");
    req1.end();
});

app.post('/submit-review', function(req,res) {
    if (req.session && req.session.auth && req.session.auth.userId) {
        var body = req.body;
        console.log(body);
        var userid = req.session.auth.userId;
        var movieid = parseInt(body.movieid);   
        var reviewcon = body.reviewcon;
        console.log('submit-review ---> '+userid+' '+movieid+' '+reviewcon);

        pool.query('UPDATE "user" SET totalreviews=totalreviews+1 where id=$1', [userid], function(err, result){
            if(err){
                console.log(err.toString());
                res.status(500).send(err.toString());
            }
            else{
                console.log('Updated totalreviews');
            }
        });

        pool.query('INSERT INTO "content" (userid, movieid, date, review) VALUES ($1, $2, $3, $4) RETURNING id',
                    [userid, movieid, new Date(), reviewcon], function (err, result) {
            if (err) {
                console.log(err.toString());
                res.status(500).send(err.toString());
            } else {
                console.log('Successfully inserted review into db');
                res.send(JSON.stringify({redirect: '/review?id='+result.rows[0].id}));
                
            }
        });
    }
    else{
        console.log('submit-review ---> User not logged in');
        res.status(403).send('You must be logged in to submit a review!');
    }
});


app.get('/get-movie-details', function(req, res){

    var movieid = req.query.movieid;
    console.log("get-movie-details movieid="+movieid);

    pool.query('SELECT * from "movie" where id = $1', [movieid], function(err, result){
        if (err) {
            res.status(500).send(err.toString());
        }
        else if(result.rows.length === 0) {
            tmdbquerybyid(movieid, res);
        }
        else{
            var moviedetails = result.rows[0];
            moviedetails.posterpath = getFullPosterPath(moviedetails.posterpath, 'poster');
            res.send(JSON.stringify(moviedetails));
        }
    });

});


function hash (input, salt) {
    // How do we create a hash?
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$');
}

app.get('/hash/:input', function(req, res) {
   var hashedString = hash(req.params.input, 'hello-darkness-my-old-friend');
   res.send(hashedString);
});

app.post('/create-user', function (req, res) {
   // username, password
   // {"username": "tanmai", "password": "password"}
   // JSON
   var username = req.body.username;
   var password = req.body.password;
   var name = req.body.name;
   var email = req.body.email;
   var salt = crypto.randomBytes(128).toString('hex');
   var dbString = hash(password, salt);
   pool.query('INSERT INTO "user" (username, password, name, email, datejoined) VALUES ($1, $2, $3, $4, $5)',
              [username, dbString, name, email, new Date()], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send('User successfully created: ' + username);
      }
   });
});

app.post('/login', function (req, res) {
   var username = req.body.username;
   var password = req.body.password;
   
   pool.query('SELECT * FROM "user" WHERE username = $1', [username], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          if (result.rows.length === 0) {
              res.status(403).send('username/password is invalid');
          } else {
              // Match the password
              var dbString = result.rows[0].password;
              var salt = dbString.split('$')[2];
              var hashedPassword = hash(password, salt); // Creating a hash based on the password submitted and the original salt
              if (hashedPassword === dbString) {
                
                // Set the session
                req.session.auth = {userId: result.rows[0].id};
                // set cookie with a session id
                // internally, on the server side, it maps the session id to an object
                // { auth: {userId }}
                
                res.send('credentials correct!');
                
              } else {
                res.status(403).send('username/password is invalid');
              }
          }
      }
   });
});

app.get('/check-login', function (req, res) {
   if (req.session && req.session.auth && req.session.auth.userId) {
       // Load the user object
       pool.query('SELECT username FROM "user" WHERE id = $1', [req.session.auth.userId], function (err, result) {
           if (err) {
              res.status(500).send(err.toString());
           } else {
              res.send(result.rows[0].username);    
           }
       });
   } else {
       res.status(400).send('You are not logged in');
   }
});

app.get('/logout', function (req, res) {
   delete req.session.auth;
   res.send('<html><body>Logged out!<br/><br/><a href="/">Back to home</a></body></html>');
});

app.get('/ui/main.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'main.js'));
});

app.get('/ui/style.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'style.css'));
});

app.get('/ui/write-review.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'write-review.css'));
});

app.get('/ui/review.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'review.css'));
});

app.get('/write-review', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'write-review.html'));
});

app.get('/ui/write-review.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'write-review.js'));
});

app.get('/ui/dark.jpg', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'dark.jpg'));
});

app.get('/register', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'register.html'));
});

app.get('/ui/register.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'register.js'));
});

app.get('/ui/registerstyle.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'registerstyle.css'));
});


app.get('/review', function(req, res){
    res.sendFile(path.join(__dirname, 'ui', 'review.html'));
});

app.get('/users/:username', function(req, res){
    res.sendFile(path.join(__dirname, 'ui', 'user.html'));
});

app.get('/ui/review.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'review.js'));
});

app.get('/ui/user.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'user.js'));
});

app.get('/browse', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'browse.html'));
});

app.get('/ui/browse.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'browse.js'));
});

app.get('/ui/browse.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'browse.css'));
});

app.get('/ui/user.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'user.css'));
});

app.get('/recent', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'recent.html'));
});

app.get('/ui/recent.js', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'recent.js'));
});

app.get('/ui/recent.css', function(req, res){
  res.sendFile(path.join(__dirname, 'ui', 'recent.css'));
});


app.get('/ui/bootstrap.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'bootstrap.css'));
});

var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log("IMAD course app listening on port "+port);
});
