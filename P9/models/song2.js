var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var userSchema = mongoose.Schema({
    song: {
        name:String,
        artists:[
            {
                type: String
            }
        ],
        id:String,
        notes: [
            {
                timestamp:String,
                pitches: [
                    {
                        type: String
                    }
                ],
                timbre: [
                    {
                        type: String
                    }
                ]

            }
        ],

        arousal: String,
        depth: String,
        valence: String

    }


});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model("Song2", userSchema);
