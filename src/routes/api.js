const express = require("express");
const router = express.Router();
const AuthMiddleWare = require("../middleware/AuthMiddleware");

const { validationResult } = require('express-validator');
var { userHandles } = require('../controllers/AuthController');
var { deckHandles } = require('../controllers/DeckController');
var { validators } = require('../validators/validator');

/**
 * Init all APIs on your application
 * @param {*} app from express
 */

let initAPIs = (app) => {

    router.post('/api/register', validators.validateRegisterUser(), (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array()[0];
            return res.status(400).json({ errors: firstError });
        }
        next();
    }, userHandles.register);
    router.post('/api/authentication', validators.validateLoginUser(), userHandles.logoutRequired, userHandles.login);
    router.delete('/api/authentication', userHandles.loginRequired, userHandles.logout);

    // Api router need to authenticate
    router.use(AuthMiddleWare.isAuth);    

    router.get('/api/deck/new', deckHandles.new_deck);
    router.get('/api/deck/:id', deckHandles.get_deck);
    router.delete('/api/deck/:id', deckHandles.remove_deck);
    router.get('/api/deck/:id/draw', deckHandles.deck_draw);


    return app.use("/", router);
}
module.exports = initAPIs;