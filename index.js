const mongoose = require("mongoose");
const Models = require("./models.js");
const Movies = Models.Movie;
const Users = Models.User;
require("dotenv").config();

// HEROKU
mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("strictQuery", false);

const { check, validationResult } = require("express-validator");

const fs = require("fs");
const path = require("path");

const express = require("express");
(app = express()), (morgan = require("morgan")), (bodyParser = require("body-parser")), (uuid = require("uuid"));

const passport = require("passport");
require("./passport");
app.use(express.static("public"));
app.use(morgan("common"));
app.use(morgan("dev"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
let auth = require("./auth")(app);
const cors = require("cors");
app.use(cors());

// GET route for the root endpoint
app.get("/", (req, res) => {
	res.send(
		"Hello and welcome to my My Movie App! <br><br> Click <a href='/documentation.html'>here</a> for documentation."
	);
});

// Get all movies
app.get("/movies", passport.authenticate("jwt", { session: false }), (req, res) => {
	Movies.find()
		.then((movies) => {
			res.status(200).json(movies);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

// Get a movie by title
app.get("/movies/:title", passport.authenticate("jwt", { session: false }), (req, res) => {
	Movies.findOne({
		Title: req.params.title,
	})
		.then((movie) => {
			res.status(200).json(movie);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

/// Get movies by genre
app.get("/movies/genre/:genre", passport.authenticate("jwt", { session: false }), (req, res) => {
	const genre = req.params.genre;
	Movies.find({ "Genre.Name": genre })
		.then((movies) => {
			res.status(200).json(movies);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

// Get movies by director
app.get("/movies/director/:director", passport.authenticate("jwt", { session: false }), (req, res) => {
	const director = req.params.director;
	Movies.find({ "Director.Name": director })
		.then((movies) => {
			res.status(200).json(movies);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

// Get all users
app.get("/users", passport.authenticate("jwt", { session: false }), (req, res) => {
	Users.find()
		.then((users) => {
			res.status(201).json(users);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

// Get a user by username
app.get("/users/:Username", passport.authenticate("jwt", { session: false }), (req, res) => {
	Users.findOne({ Username: req.params.Username })
		.then((user) => {
			res.json(user);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

//Add a user
app.post(
	"/users",
	[
		check("Username", "Username is required").isLength({ min: 5 }),
		check("Username", "Username contains non alphanumeric characters - not allowed.").isAlphanumeric(),
		check("Password", "Password is required").not().isEmpty(),
		check("Email", "Email does not appear to be valid").isEmail(),
	],
	(req, res) => {
		// check the validation object for errors
		let errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}
		let hashedPassword = Users.hashPassword(req.body.Password);
		Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
			.then((user) => {
				if (user) {
					//If the user is found, send a response that it already exists
					return res.status(400).send(req.body.Username + " already exists");
				} else {
					Users.create({
						Username: req.body.Username,
						Password: hashedPassword,
						Email: req.body.Email,
						Birthday: req.body.Birthday,
					})
						.then((user) => {
							res.status(201).json(user);
						})
						.catch((error) => {
							console.error(error);
							res.status(500).send("Error: " + error);
						});
				}
			})
			.catch((error) => {
				console.error(error);
				res.status(500).send("Error: " + error);
			});
	}
);

// Update a user's info
app.put(
	"/users/:Username",
	[
		check("Username", "Username is required").isLength({ min: 5 }),
		check("Username", "Username contains non alphanumeric characters - not allowed.").isAlphanumeric(),
		check("Password", "Password is required").not().isEmpty(),
		check("Email", "Email does not appear to be valid").isEmail(),
	],
	(req, res) => {
		// check the validation object for errors
		let errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		let hashedPassword = Users.hashPassword(req.body.Password);

		Users.findOneAndUpdate(
			{ Username: req.params.Username },
			{
				$set: {
					Username: req.body.Username,
					Password: hashedPassword,
					Email: req.body.Email,
					Birthday: req.body.Birthday,
				},
			},
			{ new: true }, // This line makes sure that the updated document is returned
			(err, updatedUser) => {
				if (err) {
					// also .then .catch function is possible here
					console.error(err);
					res.status(500).send("Error: " + err);
				} else {
					res.json(updatedUser);
				}
			}
		);
	}
);

// Post Movie
app.post(
	"/users/:Username/movies/:MovieID",
	[
		check("Username", "Username is required").isLength({ min: 5 }),
		check("Username", "Username contains non alphanumeric characters - not allowed.").isAlphanumeric(),
		check("Password", "Password is required").not().isEmpty(),
		check("Email", "Email does not appear to be valid").isEmail(),
	],
	(req, res) => {
		// check the validation object for errors
		let errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}
		Users.findOneAndUpdate(
			{ Username: req.params.Username },
			{
				$push: { FavoriteMovies: req.params.MovieID },
			},
			{ new: true }, // This line makes sure that the updated document is returned
			(err, updatedUser) => {
				if (err) {
					console.error(err);
					res.status(500).send("Error: " + err);
				} else {
					res.json(updatedUser);
				}
			}
		);
	}
);

// Delete a user by username
app.delete("/users/:Username", passport.authenticate("jwt", { session: false }), (req, res) => {
	Users.findOneAndRemove({ Username: req.params.Username })
		.then((user) => {
			if (!user) {
				res.status(400).send(req.params.Username + " was not found");
			} else {
				res.status(200).send(req.params.Username + " was deleted.");
			}
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send("Error: " + err);
		});
});

// listen
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
	console.log("Listening on Port " + port);
});
