const mongoose = require('mongoose')
const constants = require('../constants/common.js')

var Schema = mongoose.Schema

var userSchema = new Schema({
    username: { type: String, unique: true, required: true, trim: true, minlength: 2 },
    password: { type: String, required: true, trim: true, minlength: 6 },
    email: { type: String, unique: true, required: true, trim: true },
    phone: { type: String, unique: false, required: true, trim: false },
    role: { type: String, enum: ['admin', 'customer'] },
    date_added: { type: Date, default: constants.CURRDEFAULT }
});

module.exports = mongoose.model('users', userSchema)