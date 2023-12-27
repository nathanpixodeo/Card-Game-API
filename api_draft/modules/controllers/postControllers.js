const Post = require('../models/PostModels')

exports.listPost = function(req, res) {
    const col = 'title content poster created updated'
    Post.find({}, col, (err, posts) => {
        if (err) { return res.json({ err }) }
        res.json({ posts: posts })
    })
}

exports.detailPost = function(req, res) {
    Post.findById(req.params.id).populate('poster').exec(function(err, post) {
        if (err) { return res.json({ err }) }
        res.json({
            title: post.title,
            content: post.content,
            poster: post.poster.username,
            created: post.created,
            updated: post.updated
        })
    })
}

exports.createPost = function(req, res) {
    const post = new Post(req.body)
    post.poster = req.session.user._id
    post.save().then(result => {
        res.json({ post: result })
    })
}

exports.editPost = function(req, res) {
    Post.findById(req.params.id, 'title content', (err, post) => {
        if (err) { return res.json({ err }) }
        post.title = req.body.title
        post.content = req.body.content
        post.updated = Date.now()
        post.save().then(result => {
            res.json({ post: result })
        })
    })
}

exports.deletePost = function(req, res) {
    Post.remove({ _id: req.params.id }, (err) => {
        if (err) { return res.json({ err }) }
        res.json({ 'mess': 'Delete success' })
    })
}