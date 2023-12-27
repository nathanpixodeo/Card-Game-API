const User = require('../models/UserModels')
const { check, body, validationResult } = require('express-validator');

let validateRegisterUser = () => {
    return [
        check('email', 'Email is required.').notEmpty(),
        check('email', 'Invalid email.').isEmail(),
        check('username', 'Username is required.').notEmpty(),
        check('password', 'Password is required.').notEmpty(),
        check('password', 'Password must be more than 6 characters').isLength({ min: 6 }),
        check('password_confirm', 'Password confirm is required.').notEmpty(),
        check('password_confirm', 'Password confirm is not match.').custom((value, { req, loc, path }) => {
            if (value !== req.body.password) {
                throw new Error("Password confirm is not match");
            } else {
                return value;
            }
        }),
    ];
}

let validateLoginUser = () => {
    return [
        check('username', 'Username is required.').notEmpty(),
        check('password', 'Password is required.').notEmpty(),
        check('password', 'Password must be more than 6 characters').isLength({ min: 6 }),
    ];
}

let validators = {
    validateRegisterUser: validateRegisterUser,
    validateLoginUser: validateLoginUser,
};

module.exports = {validators};