// Load Constants
const constants = require('../constants/common.js');

// Load Model
const Deck = require('../models/DeckModels');

// Define Config
const debug = console.log.bind(console);

var tokenList = [];
var maxdeck = 20;

CARDS = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', '0S', 'JS', 'QS', 'KS',
    'AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', '0D', 'JD', 'QD', 'KD',
    'AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '0C', 'JC', 'QC', 'KC',
    'AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', '0H', 'JH', 'QH', 'KH'
]
JOKERS = ["X1", "X2"]

SUITS = { 'S': 'SPADES', 'D': 'DIAMONDS', 'H': 'HEARTS', 'C': 'CLUBS', '1': 'BLACK', '2': 'RED' }

VALUES = { 'A': 'ACE', 'J': 'JACK', 'Q': 'QUEEN', 'K': 'KING', '0': '10', 'X': 'JOKER' }

var cards_used = [];
var deck_used = [];


let new_deck = async (req, res, next) => {
    var dcount = 1;
    var ejoker = false;
    var dshuffle = false;
    if (req.query.deck_count) {
        dcount = req.query.deck_count;
    }

    if (req.query.jokers_enabled && req.query.jokers_enabled === 'true') {
        ejoker = req.query.jokers_enabled === 'true';
    }

    if (req.query.shuffle && req.query.shuffle === 'true') {
        dshuffle = req.query.shuffle === 'true';
    }

    if (dcount > maxdeck) {
        res.json({ errors: { msg: "The max number of Decks is " + maxdeck + "." } });
    } else {
        cards_used = CARDS;
        if (ejoker === true) {
            cards_used = [...CARDS, ...JOKERS];
        }
        let tmpresults = [];
        for (var i = 0; i < dcount; i++) {
            if (dshuffle === true) {
                cards_used = shuffle_deck(cards_used);
            }
            try {
                var deck = new Deck();
                deck.user_id = req.jwtDecoded.data._id;
                deck.deck_count = 1;
                deck.stack = JSON.stringify(cards_used);
                deck.piles = '{}';
                deck.shuffled = 0;
                if (dshuffle === true) {
                    deck.shuffled = 1;
                }
                let result = await deck.save();
                tmpresults[i] = { "success": true, "deck_id": result._id, "remaining": JSON.parse(result.stack).length, "shuffled": dshuffle }

            } catch (err) {
                res.status(500).send(err);
            }
        }
        res.json(tmpresults);
    }
}

let get_deck = async (req, res, next) => {
    let deck_id;
    let user_id = req.jwtDecoded.data._id;
    if (req.params && req.params.id && req.params.id != "") {
        deck_id = req.params.id;
    } else {
        res.status(500).send({ errors: { msg: "Deck id is not valid." } });
    }
    try {
        let result = await Deck.findOne({ _id: deck_id, user_id: user_id });
        let stacktmp = JSON.parse(result.stack);
        let cards = [];
        for (let j = 0; j < stacktmp.length; j++) {
            cards[j] = card_in_dics(stacktmp[j]);
        }
        tmpresults = {
            "success": true,
            "deck_id": result._id,
            "remaining": JSON.parse(result.stack).length,
            "shuffled": result.shuffle,
            "cards": cards,
        }
        res.json(tmpresults);
    } catch (err) {
        res.status(500).send(err);
    }
}

let remove_deck = async (req, res, next) => {
    let deck_id;
    let user_id = req.jwtDecoded.data._id;
    if (req.params && req.params.id && req.params.id != "") {
        deck_id = req.params.id;
    } else {
        res.status(500).send({ errors: { msg: "Deck id is not valid." } });
    }
    try {
        await Deck.findOneAndDelete({ _id: deck_id, user_id: user_id }, function(err, docs) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.json({
                    "success": true,
                });
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
}

let deck_draw = async (req, res, next) => {
    let cdraw = 1;
    let deck_id;
    let user_id = req.jwtDecoded.data._id;
    if (req.query.count) {
        cdraw = parseInt(req.query.count);
    }
    if (req.params && req.params.id && req.params.id != "") {
        deck_id = req.params.id;
    } else {
        res.status(500).send({ errors: { msg: "Deck id is not valid." } });
    }
    try {
        let result = await Deck.findOne({ _id: deck_id, user_id: user_id });
        let stacktmp = JSON.parse(result.stack);
        let drawtmp = [];

        if (stacktmp.length >= cdraw) {
            for (let i = 0; i < cdraw; i++) {
                drawtmp[i] = stacktmp[i];
            }

            for (let i = drawtmp.length - 1; i >= 0; i--) stacktmp.splice(drawtmp[i], 1);

            // Loop to get data of car
            let cards = [];

            for (let j = 0; j < drawtmp.length; j++) {
                cards[j] = card_in_dics(drawtmp[j]);
            }

            try {
                await Deck.findOneAndUpdate({ _id: deck_id, user_id: user_id }, { $set: { "stack": JSON.stringify(stacktmp) } });
                res.json({
                    "success": true,
                    "deck_id": deck_id,
                    "cards": JSON.stringify(cards),
                    "remaining": stacktmp.length
                });
            } catch (err) {
                res.status(500).send(err);
            }
        } else {
            res.json({
                "success": false,
                "deck_id": deck_id,
                "message": 'Deck is not enought cards to draw',
                "remaining": stacktmp.length
            });
        }


    } catch (err) {
        res.status(500).send(err);
    }
}

let shuffle_deck = (deck = array()) => {
    var s = deck.sort(func);
    return s;
}

let func = (a, b) => {
    return 0.5 - Math.random();
}

let card_in_dics = (card_code) => {
    let jscard = {
        "code": card_code,
        "image": "https://deckofcardsapi.com/static/img/" + card_code + ".png",
        "images": {
            "svg": "https://deckofcardsapi.com/static/img/" + card_code + ".svg",
            "png": "https://deckofcardsapi.com/static/img/" + card_code + ".png"
        },
        "value": VALUES[(card_code.charAt(0))],
        "suit": SUITS[(card_code.charAt(1))]
    };
    return jscard;
}



let deckHandles = {
    new_deck: new_deck,
    remove_deck: remove_deck,
    get_deck: get_deck,
    deck_draw: deck_draw,
};

module.exports = { deckHandles };