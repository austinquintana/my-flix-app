const express = require('express'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');

const morgan = require('morgan');
const app = express();
const mongoose = require('mongoose');
const Models = require('./models.js');

const cors = require('cors');
app.use(cors());
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com'];

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

// Authentication (auth.js is handling login endpoint and generating JWT tokens)
let auth = require('./auth.js')(app);
const passport = require('passport');

require('./passport.js');

// Input Validation
const { check, validationResult } = require('express-validator');

//Integrating Mongoose and connecting MongoDB
const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;

// mongoose.connect('mongodb://127.0.0.1:27017/test');

mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//MIDDLEWARE: log all server requests
app.use(morgan('common'));
// Middleware to serve static files from the "public" folder
app.use(express.static('public'));
app.use(bodyParser.json());

//VAR: Sample Users
let users = [
  {
    id: 1,
    username: 'kevinblumenstock',
    firstName: 'Kevin',
    lastName: 'Blumenstock',
    favoriteMovies: []
  },
  {
    id: 2,
    username: 'manjahoffner',
    firstName: 'Manja',
    lastName: 'Hoffner',
    favoriteMovies: ['The Lion King']
  },
  {
    id: 3,
    username: 'deleteme',
    firstName: 'Delete',
    lastName: 'Me',
    favoriteMovies: []
  }
];

//VAR: Sample Movies
let movies = [
  {
    title: 'The Lion King',
    description: 'A young lion prince flees his kingdom after the murder of his father. Years later, he returns to reclaim his throne.',
    director: {
      firstName: 'Roger',
      lastName: 'Allers',
      bio: 'Roger Allers is an American film director, screenwriter, storyboard artist, animator and voice actor. He is best known for co-directing the Disney animated feature The Lion King (1994).',
      dateOfBirth: 1949,
      dateOfDeath: undefined
    },
    genres: [
      {
        name: 'Animation',
        description: 'Animated films are ones in which individual drawings, paintings, or illustrations are photographed frame by frame (stop-frame cinematography).'
      },
      {
        name: 'Adventure',
        description: 'Adventure films are often set in an historical period and may include adapted stories of historical or literary adventure heroes, kings, battles, rebellion, or piracy.'
      },
      {
        name: 'Drama',
        description: 'Drama films are a genre that relies on the emotional and relational development of realistic characters. They often feature intense character development, and sometimes rely on tragedy to evoke an emotional response from the audience.'
      }
    ],
    imageURL: 'https://www.themoviedb.org/t/p/w600_and_h900_bestv2/wx3wpNh4LhRJ3h6yN3vSGPVepuo.jpg',
    featured: true
  },
  {
    title: 'Beauty and the Beast',
    description: 'A young woman whose father has been imprisoned by a terrifying beast offers herself in his place, unaware that her captor is actually a prince, physically altered by a magic spell.',
    director: {
      firstName: 'Gary',
      lastName: 'Trousdale',
      bio: 'Gary A. Trousdale is an American film director, animator, and storyboard artist, known for directing and producing animated films at Disney.',
      dateOfBirth: 1960,
      dateOfDeath: undefined
    },
    genres: [
      {
        name: 'Animation',
        description: 'Animated films are ones in which individual drawings, paintings, or illustrations are photographed frame by frame (stop-frame cinematography).'
      },
      {
        name: 'Fantasy',
        description: 'Fantasy films are a genre that uses magic and other supernatural forms as a primary element of plot, theme, or setting.'
      },
      {
        name: 'Musical',
        description: 'Musical films feature singing and dancing as a central element of the narrative, often accompanied by a range of different genres of music, such as jazz, rock, and classical music.'
      }
    ],
    imageURL: 'https://www.themoviedb.org/t/p/w600_and_h900_bestv2/uOw5JD8IlD546feZ6oxbIjvN66P.jpg',
    featured: false
  },
];


//READ: Welcome-Screen
app.get('/', (req, res) => {
  res.send('Welcome to myFlix!');
});

app.get('/documentation', (req, res) => {
  res.sendFile('documentation.html', { root: 'public' });
});

//GET all movies
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

//READ: Get data about a single movie
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { title } = req.params;
  const movie = movies.find( movie => movie.title === title);

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(404).send('Movie not found');
  }
});

//READ: Return data about a genre (description) by name/title
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { genreName } = req.params;
  const genre = movies
    .filter(movie => movie.genres.some(genre => genre.name === genreName))
    .map(movie => movie.genres.find(genre => genre.name === genreName));

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(404).send('Genre not found');
  }
});

//READ: Return data about a director by name
app.get('/movies/director/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { directorName } = req.params;
  const director = movies.find(movie => movie.director.firstName + " " + movie.director.lastName === directorName)?.director;

  if (director) {
    res.status(200).json(director);
  } else {
    res.status(404).send('Director not found');
  }
});

//CREATE: New User
//Add a user
/* We’ll expect JSON in this format
{
  ID: Integer,
  Username: String,
  Password: String,
  Email: String,
  Birthday: Date
}*/
app.post('/users',
  // Validation logic here for request
  //you can either use a chain of methods like .not().isEmpty()
  //which means "opposite of isEmpty" in plain english "is not empty"
  //or use .isLength({min: 5}) which means
  //minimum value of 5 characters are only allowed
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {

  // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) =>{res.status(201).json(user) })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

// Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
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
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// Add a movie to a user's list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

//DELETE: Favorite movie
app.delete('/users/:id/:movieTitle', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { id, movieTitle } = req.params;

  let user = users.find(user => user.id == id);
  let favoriteMovies = user.favoriteMovies;
  let movieToDelete = favoriteMovies.find(movie => movie.title === movieTitle);

  if (user) {
    favoriteMovies = favoriteMovies.filter(movie => movie.title !== movieTitle);
    res.status(200).send(`${movieTitle} has been removed from user ${user.id}'s favorite movies`);
  } else {
    res.status(400).send('User not found');
  }
});

// Delete a user by username
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
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
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});

