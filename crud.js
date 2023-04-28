// CRUD-ACTIONS

// 2.0 READ: return all movies from the db
const getMoviesAll = (function() {
    let movies = db.movies.find();
    if (!movies) {
      print("No movies found");
    };
    return movies;
  });
  
  // 2.1 READ: all the movies from the “movies” collection that match a certain movie title
  const getMovieByTitle = (function(movieTitle) {
    let movie = db.movies.find({Title: movieTitle});
    if (!movie) {
      print("Movie not found");
    };
    return movie;
  });
  
  // 2.2.1 READ: all the movies from the “movies” collection that match a certain genre name
  const getMoviesByGenre = (function (genreName) {
    let genre = db.genres.findOne({Name: genreName});
    let movies = db.movies.aggregate([
      // Join with genres collection
      {
        $lookup: {
          from: "genres",
          localField: "Genre",
          foreignField: "_id",
          as: "genre"
        }
      },
      // Unwind the genre array
      {
        $unwind: "$genre"
      },
      // Match on the genre name
      {
        $match: {
          "genre.Name": genreName
        }
      }
    ]);
    
    if (!genre) {
      print("Genre not found");
    } else if (!movies) {
      print("No movies found in that genre");
    };
    return movies;
  });
  
  // 2.2.2 READ: all the movies from the “movies” collection that match a certain director name
  const getMoviesByDirector = (function (directorName) {
    let director = db.directors.findOne({Name: directorName});
    let movies = db.movies.aggregate([
      // Join with directors collection
      {
        $lookup: {
          from: "directors",
          localField: "Director",
          foreignField: "_id",
          as: "director"
        }
      },
      // Unwind the director array
      {
        $unwind: "$director"
      },
      // Match on the director name
      {
        $match: {
          "director.Name": directorName
        }
      }
    ]);
    
    if (!director) {
      print("Director not found");
    } else if (!movies) {
      print("No movies found with that director");
    };
    return movies;
  });
  
  // 2.3 READ: all the movies from the “movies” collection that match a certain genre name AND a certain director
  const getMovieByGenreAndDirector = (function (genreName, directorName) {
    let genre = db.genres.findOne({Name: genreName}),
    director = db.directors.findOne({Name: directorName}),
    movies = db.movies.aggregate([
      {
        $lookup: {
          from: "genres",
          localField: "Genre",
          foreignField: "_id",
          as: "genre"
        }
      },
      {
        $lookup: {
          from: "directors",
          localField: "Director",
          foreignField: "_id",
          as: "director"
        }
      },
      {
        $unwind: "$genre"
      },
      {
        $unwind: "$director"
      },
      {
        $match: {
          "genre.Name": genreName,
          "director.Name": directorName
        }
      }
    ]);
  
    if (!genre) {
      print("Genre not found");
    } else if (!director) {
      print("Director not found");
    } else if (!movies) {
      print("No movies found")
    } 
    return movies;
  });
  
  // 2.4 UPDATE: the description of a particular movie
  const updateMovieDescription = (function (movieTitle, newDescription) {
    let movie = db.movies.findOne({Title: movieTitle});
    if (!movie) {
      print("Movie not found");
    } else if (!newDescription) {
      print("Description cannot be empty");
    } else {
      db.movies.updateOne({ Title: movieTitle }, { $set: { Description: newDescription } });
    };
    return movie;
  });
  
  // 2.5 Return data about a director (bio, birth year, death year) by name
  const getDirector = (function (directorName) {
    let director = db.directors.findOne({Name: directorName});
    if (!director) {
      print("Director not found");
    };
    return director;
  });
  
  // 2.6 UPDATE: the bio of a certain director
  const updateDirectorBio = (function (directorName, newBio) {
    let director = db.directors.findOne({Name: directorName});
    if (!director) {
      print("Director not found");
    } else if (!newBio) {
      print("Bio cannot be empty");
    } else {
        director.updateOne({ _id: director._id }, { $set: { Bio: newBio } }, (err, director) => {
          if (err) {
            print("Error updating director bio:", err);
          } else {
            console.log("Director bio updated successfully:", director);
          }
        }); 
    }
  });

  // 2.7 UPDATE: add a movie to user's list of favorite movies
const addFavoriteMovie = (function (username, movieTitle) {
    let user = findUser(username),
    movie = findMovieByTitle(movieTitle);
    if (!user) {
      print("User not found.");
    } else if (!movie) {
      print("Movie not found.");
    } else {
      let movieIndex = user.favoriteMovies.indexOf(movie._id);
      if (movieIndex === -1) {
        // Add the movie's ID to the user's favorite movies list and save the changes
        db.users.updateOne({ Username: username }, { $addToSet: { favoriteMovies: movie._id } });
        // Print a success message
        print("Movie added to favorites.");
      } else {
        print("Error: Movie has already been added to favorites.");
      }
    };
  });
  
  // 2.8 UPDATE: remove a movie to user's list of favorite movies
  const removeFavoriteMovie = (function (username, movieTitle) {
    let user = findUser(username),
    movie = findMovieByTitle(movieTitle);
    if (!user) {
      print("User not found.");
    } else if (!movie) {
      print("Movie not found.");
    } else {
      let movieIndex = user.favoriteMovies.indexOf(movie._id);
      if (movieIndex !== -1) {
        db.users.updateOne({ Username: username }, { $pull: { favoriteMovies: movie._id } });
        // Print a success message
        print("Movie removed from favorites.");
      } else {
        print("Error: Movie has already been removed from favorites.");
      }
    };
  });
  
  // 2.9 CREATE: a new user
  const createUser = (function(username, email, password, birthday) {
    //IF-CHECKS TO PREVENT EMPTY INPUTS
    if (!username) {
      print("Username required");
    } else if(!email) {
      print("Email required");
    } else if(!password) {
        print("Password required");
    } else {
      let newUser = db.users.insertOne({
        Username: username,
        Password: password,
        Email: email,
        Birthday: new Date(birthday),
        favoriteMovies: []
      });
      print("New user created successfully", newUser);
    };
  });
  
  // 2.10 READ: find a user by username
  const getUser = (function(username) {
    let user = db.users.findOne({ Username: username });
    // If the user does not exist, print an error message
    if (!user) {
      print("User not found.");
    };
    return user;
  });
  
  // 2.11 Allow users to update their user info (username)
  const updateUsername = (function (username, newUsername) {
    let user = db.users.findOne({Username: username});
    if (!user) {
      print("User not found");
    } else if (!newUsername) {
      print("Username cannot be empty");
    } else {
        user.updateOne({ _id: user._id }, { $set: { Username: newUsername } }, (err, user) => {
          if (err) {
            print("Error updating username:", err);
          } else {
            print("Username updated successfully:", user);
          }
        }); 
    }
  });
  
  // 2.12 DELETE: a user by username
  const deleteUser = (function(username) {
    let user = db.users.findOne({Username: username});
    if (!user) {
      print("User not found");
    } else {
      db.users.deleteOne({ Username: username });
    }
  });