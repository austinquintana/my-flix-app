const express = require('express'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');

const morgan = require('morgan');
const app = express();
const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;

mongoose.connect('mongodb://127.0.0.1:27017/test');

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

//READ: Get all movies
app.get('/movies', (req, res) => {
  res.status(200).json(movies);
});

//READ: Get data about a single movie
app.get('/movies/:title', (req, res) => {
  const { title } = req.params;
  const movie = movies.find( movie => movie.title === title);

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(404).send('Movie not found');
  }
});

//READ: Return data about a genre (description) by name/title
app.get('/movies/genre/:genreName', (req, res) => {
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
app.get('/movies/director/:directorName', (req, res) => {
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
app.post('/users', (req, res) => {
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: req.body.Password,
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
app.get('/users', (req, res) => {
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
app.get('/users/:Username', (req, res) => {
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
app.put('/users/:Username', (req, res) => {
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
app.post('/users/:Username/movies/:MovieID', (req, res) => {
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
app.delete('/users/:id/:movieTitle', (req, res) => {
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
app.delete('/users/:Username', (req, res) => {
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
app.listen(8080, () => {
  console.log('Server listening on port 8080.');
});

