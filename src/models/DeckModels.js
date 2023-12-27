const mongoose = require('mongoose')
const constants = require('../constants/common.js')

var Schema = mongoose.Schema

var deckSchema = new Schema({
    user_id: { type: String, required: true, trim: false},
    last_used: { type: Date, default: constants.CURRDEFAULT },
    deck_count: { type: Number, required: true },
    stack: { type: String, required: true, trim: false },
    piles: { type: String,required: true},
    shuffled: {type: Number,required: true}
});

module.exports = mongoose.model('decks', deckSchema)