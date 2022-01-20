const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

//To select ID from MongoDB
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

var admin = require("firebase-admin");

var serviceAccount = "./firebase-adminsdk.json";

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

//MongoDB linking
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxjrc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

//Verify with user token
async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith("Bearer ")) {
		const token = req.headers.authorization.split(" ")[1];
		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser?.email;
		} catch {}
	}
	next();
}

async function run() {
	try {
		await client.connect();

		//DB Folder and Subfolder
		const database = client.db("elegancelimo");
		const usersCollection = database.collection("users");
		const bookingsCollection = database.collection("bookings");
		const carsCollection = database.collection("cars");

		//To add new user when login or signup
		app.post("/users", async (req, res) => {
			const newuser = req.body;
			console.log("Request from UI ", newuser);
			const result = await usersCollection.insertOne(newuser);
			console.log("Successfully Added New User ", result);
			res.json(result);
		});
		//To update or replace users data when login or signup
		app.put("/users", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					email: user?.email,
					displayName: user?.displayName,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});
		//Check Admin or Not
		app.get("/users/:email", async (req, res) => {
			const email = req.params.email;
			console.log("from UI", email);
			const filter = { email: email };
			console.log("Request to find ", filter);
			const user = await usersCollection.findOne(filter);
			console.log(user);
			let isAdmin = false;
			if (user?.userRole === "Admin") {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
			console.log("Found one", user);
		});
		//To load single user data by email
		app.get("/singleUsers", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const filter = { email: user?.email };
			console.log("from UI", filter);
			console.log("Request to find ", filter);
			const result = await usersCollection.findOne(filter);
			res.send(result);
			console.log("Found one", result);
		});

		//To update or replace users role
		app.put("/users/pageRole", verifyToken, async (req, res) => {
			const user = req.body;
			console.log("Decoded email", req.decodedEmail);
			const requester = req.decodedEmail;
			if (requester) {
				const requesterAccount = await usersCollection.findOne({
					email: requester,
				});
				if (requesterAccount.userRole === "Admin") {
					const filter = { email: user?.email };
					console.log("Request to replace or add Role", user);
					const options = { upsert: true };
					const updateuser = {
						$set: {
							userRole: user?.userRole,
						},
					};
					const result = await usersCollection.updateOne(
						filter,
						updateuser,
						options,
					);
					res.json(result);
					console.log("Successfully replaced or added user", result);
				} else {
					res
						.status(403)
						.json({ message: "You don't have access to make new Admin" });
				}
			}
		});

		/* ------
        ------post all
        ------ */

		//To post new bookings
		app.post("/bookings", async (req, res) => {
			const bookings = req.body;
			console.log("Request from UI ", bookings);
			const result = await bookingsCollection.insertOne(bookings);
			console.log("Successfully Added new bookings ", result);
			res.json(result);
		});
		//To post new cars
		app.post("/cars", async (req, res) => {
			const cars = req.body;
			console.log("Request from UI ", cars);
			const result = await carsCollection.insertOne(cars);
			console.log("Successfully Added new cars ", result);
			res.json(result);
		});

		/* ------
        ------Show all
        ------ */

		//To Show all users
		app.get("/users", async (req, res) => {
			console.log(req.query);
			const get = usersCollection.find({});
			console.log("Request to find users");
			users = await get.toArray();
			res.send(users);
			console.log("Found all users", users);
		});
		//To Show all bookings
		app.get("/bookings", async (req, res) => {
			console.log(req.query);
			const get = bookingsCollection.find({});
			console.log("Request to find bookings");
			bookings = await get.toArray();
			res.send(bookings);
			console.log("Found all bookings", bookings);
		});
		
		//To Show all cars 
		app.get("/cars", async (req, res) => {
			console.log(req.query);
			const get = carsCollection.find({});
			console.log("Request to find cars");
			cars = await get.toArray();
			res.send(cars);
			console.log("Found all bookings", cars);
		});

		//To load bookings by id
		app.get("/bookings/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to find ", id);
			const findId = { _id: ObjectId(id) };
			const result = await bookingsCollection.findOne(findId);
			res.send(result);
			console.log("Found one", result);
		});
		/* ------
        ------delete all
        ------ */

		//To Delete bookings one by one
		app.delete("/bookings/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await bookingsCollection.deleteOne(deleteId);
			res.send(result);
			console.log("bookings Successfully Deleted", result);
		});
		//To Delete cars one by one
		app.delete("/cars/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await carsCollection.deleteOne(deleteId);
			res.send(result);
			console.log("cars Successfully Deleted", result);
		});
	} finally {
		//await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("elegancelimo Server is running just fine");
});

app.listen(port, () => {
	console.log("elegancelimo Server running on port :", port);
});
