const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bookedEvents: [
    {
      type: mongoose.Schema.Types.ObjectId, // Reference to Event model
      ref: "Event",
    },
  ],
});

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
