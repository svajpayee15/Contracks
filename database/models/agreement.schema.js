const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema({
  ipfsCID: { type: String, required: true, unique: true },
  sender: { type: String, required: true },
 receiver: {
  type: [String],
  required: true,
  validate: {
    validator: function (v) {
      if (this.typeOfAgreement === "voting") {
        return v.length > 1;
      }
      return v.length === 1;
    },
    message: "Invalid receiver count for agreement type",
  },
},

  status: { type: Object },
  typeOfAgreement: {
    type: String,
    enum: ["salary", "performance", "ffp", "voting"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now() },
});

module.exports = mongoose.model("Agreement", agreementSchema);
