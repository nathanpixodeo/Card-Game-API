const mongoose = require('mongoose')
const Schema = mongoose.Schema
// const Topic = require('./TopicModels')

const postSchema = new Schema({
    title: { type: String, required: true, minlength: 4, maxlength: 150 },
    content: { type: String, required: true, minlength: 4, maxlength: 2000 },
    poster: { type: Schema.Types.ObjectId, ref: 'User' },
    created: { type: Date, default: Date.now },
    updated: { type: Date }
});

module.exports = mongoose.model('Post', postSchema)