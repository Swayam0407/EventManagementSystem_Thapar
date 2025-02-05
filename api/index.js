const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const UserModel = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Ticket = require("./models/Ticket");

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "bsbsfbrnsftentwnnwnwn";

cloudinary.config({
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json());
app.use(cookieParser());
app.use(
   cors({
      credentials: true,
      origin: "http://localhost:5173",
   })
);

mongoose.connect(process.env.MONGO_URL, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   tls: true,
   tlsAllowInvalidCertificates: false,

 })
 .then(() => console.log('MongoDB connected'))
 .catch((err) => console.error('MongoDB connection error:', err));
 

 const storage = new CloudinaryStorage({
   cloudinary: cloudinary,
   params: {
      folder: 'events', // Cloudinary folder to store images
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
   },
});

const upload = multer({ storage });

app.get("/test", (req, res) => {
   res.json("test ok");
});
app.post("/register", async (req, res) => {
   const { name, email, password } = req.body;

   try {
      const userDoc = await UserModel.create({
         name,
         email,
         password: bcrypt.hashSync(password, bcryptSalt),
      });
      res.json(userDoc);
   } catch (e) {
      res.status(422).json(e);
   }
});

// Backend route - /login

app.post("/login", async (req, res) => {
   const { email, password } = req.body;

   const userDoc = await UserModel.findOne({ email });

   if (!userDoc) {
      return res.status(404).json({ error: "User not found" });
   }

   const passOk = bcrypt.compareSync(password, userDoc.password);
   if (!passOk) {
      return res.status(401).json({ error: "Invalid password" });
   }

   jwt.sign(
      {
         email: userDoc.email,
         id: userDoc._id,
      },
      jwtSecret,
      {},
      (err, token) => {
         if (err) {
            return res.status(500).json({ error: "Failed to generate token" });
         }
         res.cookie("token", token).json(userDoc);
      }
   );
});

app.get("/profile", (req, res) => {
   const { token } = req.cookies;
   if (token) {
      jwt.verify(token, jwtSecret, {}, async (err, userData) => {
         if (err) throw err;
         const { name, email, _id } = await UserModel.findById(userData.id);
         res.json({ name, email, _id });
      });
   } else {
      res.json(null);
   }
});

app.post("/logout", (req, res) => {
   res.cookie("token", "").json(true);
});

const eventSchema = new mongoose.Schema({
   owner: String,
   title: String,
   description: String,
   organizedBy: String,
   eventDate: Date,
   eventTime: String,
   location: String,
   Participants: Number,
   Count: Number,
   Income: Number,
   ticketPrice: Number,
   Quantity: Number,
   image: String,
   likes: Number,
   likedBy: { type: [String], default: [] },
   Comment: [String],
   bookedBy: [
      {
        type: mongoose.Schema.Types.ObjectId, // Reference to User model
        ref: "User",
      },
    ],
});

const Event = mongoose.model("Event", eventSchema);

app.post("/createEvent", upload.single("image"), async (req, res) => {
   try {
      console.log("Uploaded file:", req.file); // Debugging: Log the file object

      // Check if the file was uploaded successfully
      if (req.file) {
         console.log("Cloudinary URL:", req.file.path); // Debugging: Log the Cloudinary URL
      } else {
         console.error("No file uploaded");
         return res.status(400).json({ error: "No image uploaded" });
      }

      // Get event data from the request body
      const eventData = req.body;

      // Store the Cloudinary image URL
      eventData.image = req.file.path;

      // Create a new event and save it to MongoDB
      const newEvent = new Event(eventData);
      await newEvent.save();
      
      res.status(201).json(newEvent); // Return the new event with the image URL
   } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to save the event to MongoDB" });
   }
});


app.get("/createEvent", async (req, res) => {
   try {
      const events = await Event.find();
      res.status(200).json(events);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch events from MongoDB" });
   }
});

app.get("/event/:id", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      res.json(event);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch event from MongoDB" });
   }
});
// Assuming your backend API looks something like this
app.post('/event/:eventId/like', async (req, res) => {
   const { eventId } = req.params;
   const { userId } = req.body; // Assuming the userId is passed in the request body

   try {
      // Retrieve the event from the database using the eventId
      const event = await Event.findById(eventId);

      if (!event) {
         return res.status(404).json({ message: 'Event not found' });
      }

      // Check if the user has already liked the event
      if (!event.likedBy.includes(userId)) {
         event.likes += 1;
         event.likedBy.push(userId); // Add the userId to the likedBy array
      } else {
         event.likes -= 1;
         const index = event.likedBy.indexOf(userId);
if (index > -1) { // Check if userId exists in the array
   event.likedBy.splice(index, 1); // Remove 1 element at the found index
}
 // Remove the userId from the likedBy array
      }

      // Save the updated event
      await event.save();

      // Send the updated event back in the response
      res.json(event);
   } catch (error) {
      console.error('Error updating likes:', error);
      res.status(500).json({ message: 'Server error' });
   }
});



app.get("/events", (req, res) => {
   Event.find()
      .then((events) => {
         res.json(events);
      })
      .catch((error) => {
         console.error("Error fetching events:", error);
         res.status(500).json({ message: "Server error" });
      });
});

app.get("/event/:id/ordersummary", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      res.json(event);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch event from MongoDB" });
   }
});

app.get("/event/:id/ordersummary/paymentsummary", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      res.json(event);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch event from MongoDB" });
   }
});

app.post("/tickets", async (req, res) => {
   try {
      const ticketDetails = req.body;
      const newTicket = new Ticket(ticketDetails);
      await newTicket.save();
      return res.status(201).json({ ticket: newTicket });
   } catch (error) {
      console.error("Error creating ticket:", error);
      return res.status(500).json({ error: "Failed to create ticket" });
   }
});



app.get("/tickets/:id", async (req, res) => {
   try {
      const tickets = await Ticket.find();
      res.json(tickets);
   } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
   }
});

app.get("/tickets/user/:userId", (req, res) => {
   const userId = req.params.userId;

   Ticket.find({ userid: userId })
      .then((tickets) => {
         res.json(tickets);
      })
      .catch((error) => {
         console.error("Error fetching user tickets:", error);
         res.status(500).json({ error: "Failed to fetch user tickets" });
      });
});

app.delete("/tickets/:id", async (req, res) => {
   try {
      const ticketId = req.params.id;
      await Ticket.findByIdAndDelete(ticketId);
      res.status(204).send();
   } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ error: "Failed to delete ticket" });
   }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`);
});
module.exports = Event;
