const express = require('express'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');


const morgan = require('morgan');
const app = express();
const mongoose = require('mongoose');
const Models = require('./models.js');
mongoose.connect(process.env.CONNECTION_URI || 'mongodb://127.0.0.1:27017/cfDB')
.then(() => { console.log('Connected to MongoDB'); }) .catch((err) => { console.error(err); });

const cors = require('cors');
app.use(cors());
let allowedOrigins = [
  "http://localhost:8080", 
  "https://moviesdbaq.netlify.app", 
  "http://localhost:1234", 
  "https://austinmovieapp.herokuapp.com/",
];


app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));

app.use(bodyParser.json());
// Authentication (auth.js is handling login endpoint and generating JWT tokens)
let auth = require('./auth.js')(app);
const passport = require('passport');
require('./passport.js');


// Input Validation
const { check, validationResult } = require('express-validator');


//Integrating Mongoose and connecting MongoDB
const Movies = Models.Movie;
const Users = Models.User;
const Genre = Models.Genre;
const Director = Models.Director;


//MIDDLEWARE: log all server requests
app.use(morgan('common'));
// Middleware to serve static files from the "public" folder
app.use(express.static('public'));
// app.use(bodyParser.json());

//READ: Welcome-Screen
app.get('/', (req, res) => {
  res.send('Welcome to myFlix!');
});


app.get('/documentation', (req, res) => {
  res.sendFile('documentation.html', { root: 'public' });
});


//GET all movies
app.get('/movies', (req, res) => {
  Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});


// //READ: Get data about a single movie
// app.get('/movies/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
//   const { id } = req.params;
//   const movie = movies.find( movie => movie._id === id);


//   if (movie) {
//     res.status(200).json(movie);
//   } else {
//     res.status(404).send('Movie not found');
//   }
// });

app.get('/movies/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movie.findById(req.params.id)
    .then((movie) => {
      if (!movie) {
        res.status(404).send('Movie not found');
      } else {
        res.status(200).json(movie);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// //READ: Return data about a genre (description) by name/title
// app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
//   const { genreName } = req.params;
//   const genre = movies
//     .filter(movie => movie.genres.some(genre => genre.name === genreName))
//     .map(movie => movie.genres.find(genre => genre.name === genreName));


//   if (genre) {
//     res.status(200).json(genre);
//   } else {
//     res.status(404).send('Genre not found');
//   }
// });

// Get data about movies by a genre
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find({ 'Genre.Name': req.params.genreName })
    .then((movies) => {
      if (!movies) {
        res.status(404).send('Movies of this genre not found');
      } else {
        res.status(200).json(movies);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// //READ: Return data about a director by name
// app.get('/movies/director/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
//   const { directorName } = req.params;
//   const director = movies.find(movie => movie.director.firstName + " " + movie.director.lastName === directorName)?.director;


//   if (director) {
//     res.status(200).json(director);
//   } else {
//     res.status(404).send('Director not found');
//   }
// });

// Get data about movies by a director
app.get('/movies/director/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find({ 'Director.Name': req.params.directorName })
    .then((movies) => {
      if (!movies) {
        res.status(404).send('Movies by this director not found');
      } else {
        res.status(200).json(movies);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//allows new users to register
app.post('/users',
    //validation logic goes here
    [
        check('Username', 'Username is required').isLength({min: 5}), // minumum length of username is 5 char
        check('Username', 'Username contains non alphanumeric characters - not allowed').isAlphanumeric(),
        check('Password', 'Password is required').not().isEmpty(), // password input must not be empty
        check ('ControlPassword', 'Passwords do not match').custom((value, { req }) => value === req.body.Password),
        check('Email', 'Email does not appear to be valid').isEmail()
    ], (req, res) => {


        //check validation object for errors
        let errors = validationResult(req);
        if (!errors.isEmpty()){ //if errors is not empty (if there are arreors--->)
            return res.status(422).json({errors: errors.array()}) //if errors in validation occur then send back to client in an array
        }
    console.log(Users)
        // if error occurs rest of the code will not be executed
    let hashedPassword = Users.hashPassword(req.body.Password);
   
    //check if username already exists
    Users.findOne( { 'Username' : req.body.Username } )
   
    .then((user) => {
        if (user) {
            return res.status(400).send(req.body.Username + ' already exists');
        } else {
            //if user doesn´t already exist, use mongoose .create() fxn to create new user.
            // each key refers to a specific key outline in models.js
            // each value is set to the content of request body
            Users
                .create( {
                    Username : req.body.Username,
                    Password : hashedPassword, // now when registering hashed password will be saved in the DB, not the actual pw w
                    Email : req.body.Email,
                    Birthday : req.body.Birthday
                })
                .then((user) => { res.status(201).json(user)})
            .catch((error) => {
                console.error(error);
                res.status(500).send('Error: ' + error)
            })
                // Mongoose uses this information to populate a users document
        }
    })
    .catch((error)=> {
        console.error(error);
        res.status(500).send('Error: ' + error);
    })
});


// Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// Get a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// Update a user's info, by username
/* We’ll expect JSON in this format
{
  Username: String,
  (required)
  Password: String,
  (required)
  Email: String,
  (required)
  Birthday: Date
}*/
//update user info
app.put('/users/:Username',
[
    check('Username', 'Username is required').isLength({min: 5}), // minumum length of username is 5 char
    check('Username', 'Username contains non alphanumeric characters - not allowed').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(), // password input must not be empty
    check('Email', 'Email does not appear to be valid').isEmail()
],
 passport.authenticate('jwt', {session: false}), (req, res) => {
    let errors = validationResult(req);
        if (!errors.isEmpty()){ //if errors is not empty (if there are arreors--->)
            return res.status(422).json({errors: errors.array()}) //if errors in validation occur then send back to client in an array
        }
    console.log(Users)
        // if error occurs rest of the code will not be executed
    let hashedPassword = Users.hashPassword(req.body.Password);


    Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
      {
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        // Birthday: req.body.Birthday
      }
    },
    { new: true }) // This line makes sure that the updated document is returned
    .then(( updatedUser) => {
        res.json(updatedUser);
    })
    .catch( (err)=> {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } );
});


// Add a movie to a user's list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  console.log(req.params);
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { favoriteMovies: req.params.MovieID }
   },
   { new: true }) // This line makes sure that the updated document is returned
   .then(( updatedUser) => {
      if (!updatedUser) { res.status(404).send('error user not found'); } 
      else{res.json(updatedUser);}
    }) 
    .catch((err)=> {
      res.status(500).send('Error: ' + err);
    });
});


//DELETE: Favorite movie
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
    $pull: { favoriteMovies: req.params.MovieID }
  },
  { new: true }) // This line makes sure that the updated document is returned
  .then(( updatedUser) => {
     if (!updatedUser) { res.status(404).send('error user not found'); } 
     else{res.json(updatedUser);}
   }) 
   .catch((err)=> {
     res.status(500).send('Error: ' + err);
   });
});


// Delete a user by username
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(404).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


//MIDDLEWARE: handle uncaught errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


//START SERVER
const port = process.env.PORT || 8080;
app.listen(port,  () => {
  console.log("Listening on port " + port);
});
