var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var userSchema = mongoose.Schema({
  local: {
    name: String,
    email: String,
    password: String,
      key_admin :String,
      key_owner: String,
      key_non_owner:String,
      key_maintenance:String,
    publickey: [
      {
        type: String
      }
    ],
    handle: [
      {
        type: String
      }
    ]
  }
});

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model("User_car", userSchema);
