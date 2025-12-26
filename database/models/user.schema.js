const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    walletAddress:{ type:String, required:true, length:42, unique: true},
    name:{type:String, required:true}
})

module.exports = mongoose.model("User", userSchema)