const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// Load Helper
const jwtHelper = require("../helpers/jwt.helper");
// Load Constants
const constants = require('../constants/common.js');
// Load Model
const User = require('../models/UserModels');

// Token lifetime
const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || "1h";
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || constants.SECRETAPI;
// RefreshToken lifetime
const refreshTokenLife = process.env.REFRESH_TOKEN_LIFE || "3650d";
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || constants.SECRETAPI;

// Define Config
const debug = console.log.bind(console);

var tokenList = [];

let register = (req, res, next) => {
    User.findOne({ email: req.body.email }, (err, user) => {
        if (user == null) {
            bcrypt.hash(req.body.password, 10, function(err, hash) {
                if (err) { return next(err); }
                const user = new User(req.body);
                user.role = 'customer';
                user.password = hash;
                user.password_confirm = hash;
                user.save((err, result) => {
                    if (err) { return res.json({ err }) }
                    res.json({ user: result });
                });
            });
        } else {
            res.json({ errors: { msg: "Email has been used." } });
        }
    })
}

let login = async (req, res) => {
    try {
        User.findOne({ username: req.body.username }).exec(function(err, user) {

            if (err) {
                return res.json({ err })
            } else if (!user) {
                return res.json({ err: 'Username and Password are incorrect' })
            }

            bcrypt.compare(req.body.password, user.password, async (err, result) => {
                if (result === true) {

                    req.session.user = user

                    let userData = {
                        "_id": user._id,
                        "username": user.username,
                        "email": user.email,
                        "phone": user.phone,
                        "role": user.role
                    }

                    //Execute token generation [lifetime 1 hour.]
                    const accessToken = await jwtHelper.generateToken(userData, accessTokenSecret, accessTokenLife);

                    //Perform code Refresh Token generation, [10 years life time]
                    const refreshToken = await jwtHelper.generateToken(userData, refreshTokenSecret, refreshTokenLife);

                    tokenList[refreshToken] = { accessToken, refreshToken };

                    // Send Token and Refresh Token to client
                    return res.status(200).json({
                        user: user,
                        jwt: accessToken,
                        rjwt: refreshToken,
                        result: "success",
                    });
                } else {
                    return res.status(500).json({ error: 'Username and Password are incorrect' })
                }
            })
        });
    } catch (error) {
        return res.status(500).json(error);
    }

}

let logout = (req, res) => {
    if (req.session) {
        req.session.destroy(function(err) {
            if (err) {
                return res.json({ err });
            } else {
                return res.json({ 'result': "success" });
            }
        });
    }
}

let loginRequired = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        return res.status(401).json({ message: 'Unauthorized user!' });
    }
};

let logoutRequired = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.status(401).json({ err: 'You must be Logout in to Login continue' });
    } else {
        next();
    }
};


let refreshToken = async (req, res) => {
    const refreshTokenFromClient = req.body.refreshToken;
    if (refreshTokenFromClient && (tokenList[refreshTokenFromClient])) {
        try {
            const decoded = await jwtHelper.verifyToken(refreshTokenFromClient, refreshTokenSecret);
            const userData = decoded.data;
            const accessToken = await jwtHelper.generateToken(userData, accessTokenSecret, accessTokenLife);
            return res.status(200).json({ accessToken });
        } catch (error) {
            //debug(error);
            res.status(403).json({
                message: 'Invalid refresh token.',
            });
        }
    } else {
        return res.status(403).send({
            message: 'No token provided.',
        });
    }
};

let userHandles = {
    register: register,
    login: login,
    logout: logout,
    refreshToken: refreshToken,
    loginRequired: loginRequired,
    logoutRequired: logoutRequired,
};

module.exports = { userHandles };