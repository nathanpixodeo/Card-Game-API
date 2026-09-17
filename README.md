# Card Game API

[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2014-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-lightgrey.svg)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/mongodb-mongoose%205-success.svg)](https://mongoosejs.com)
[![Status: learning project](https://img.shields.io/badge/status-learning%20project-orange.svg)](#known-issues)

A REST API that deals playing cards. Create a deck, shuffle it, draw from it — each deck
belongs to an authenticated user and lives in MongoDB, so a hand survives a page reload
and a client restart.

It is a self-hosted take on [deckofcardsapi.com](https://deckofcardsapi.com), with the
piece that service leaves out: accounts. Register, log in, get a JWT, and every deck you
create is scoped to your user id. Nobody else can read or draw from it.

> [!WARNING]
> **This is a learning project, not production software.** It ships hardcoded fallback
> secrets, has no tests, no rate limiting, and runs on dependencies that have since gone
> end-of-life. Read [Known issues](#known-issues) before you point anything real at it.

## Contents

- [What it does](#what-it-does)
- [Stack](#stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [API reference](#api-reference)
- [Card codes](#card-codes)
- [Data models](#data-models)
- [Project layout](#project-layout)
- [Known issues](#known-issues)
- [Roadmap](#roadmap)
- [Buy me a beer](#buy-me-a-beer)
- [License](#license)

## What it does

- **Accounts.** Register with email, username and password. Passwords are hashed with
  bcrypt at cost 10. Every account is created with role `customer`; the `admin` role
  exists in the schema but nothing grants it.
- **Two auth mechanisms, side by side.** Login returns a JWT pair and also opens an
  `express-session` cookie backed by MongoDB. Deck routes read the JWT; logout clears the
  session.
- **Persistent decks.** A deck is a MongoDB document holding the remaining stack as JSON.
  Up to 20 decks per request.
- **Standard 52-card deck**, optionally with two jokers.
- **Draw from the top.** Drawn cards leave the stack and the document is updated, so the
  next draw continues where the last one stopped.
- **Card metadata** in the deckofcardsapi.com shape: `code`, `value`, `suit`, and image
  URLs in PNG and SVG.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js |
| HTTP | Express 4, `express-async-errors` |
| Database | MongoDB via Mongoose 5 |
| Auth | `jsonwebtoken` (HS256) + `bcrypt` |
| Sessions | `express-session` + `connect-mongo` 3 |
| Validation | `express-validator` 6 |
| Logging | `morgan` in `dev` format |
| Config | `dotenv` |

## Quick start

You need Node.js and a running MongoDB instance.

```bash
git clone https://github.com/nathanpixodeo/Card-Game-API.git
cd Card-Game-API
npm install
cp .env.example .env
```

Edit `.env` — at minimum point `DB_URL` at your database and set real token secrets (see
[Configuration](#configuration)). Then:

```bash
node index.js
```

The server listens on port `8797`. There is no `start` script, and `npm run devstart` is
broken — see [Known issues](#known-issues). For auto-reload, `nodemon` is already a
dependency:

```bash
npx nodemon index.js
```

Confirm it is alive by registering a user:

```bash
curl -X POST http://localhost:8797/api/register \
  -H 'Content-Type: application/json' \
  -d '{
        "username": "nathan",
        "email": "nathan@example.com",
        "password": "hunter22",
        "password_confirm": "hunter22"
      }'
```

## Configuration

All configuration comes from `.env`.

| Variable | Default | Notes |
| --- | --- | --- |
| `DB_URL` | none | MongoDB connection string. Required — without it Mongoose throws at startup. |
| `PORT` | `8797` | **Currently ignored.** `dotenv.config()` runs after `PORT` is read, so the value in `.env` never arrives. Change the fallback in `index.js` instead. |
| `ACCESS_TOKEN_SECRET` | `RESTFULAPIS` | HS256 signing key for access tokens. **Set this.** The fallback is a public constant in this repository. |
| `ACCESS_TOKEN_LIFE` | `1h` | Any [`ms`](https://github.com/vercel/ms) duration string. |
| `REFRESH_TOKEN_SECRET` | `RESTFULAPIS` | Signing key for refresh tokens. **Set this**, and make it different from the access secret. |
| `REFRESH_TOKEN_LIFE` | `3650d` | Ten years. Worth shortening. |

The session secret is not configurable — it is hardcoded as `'Multi'` in `index.js`.

`.env.example` lists all of the above with the same warnings, so copying it is enough to
get a correctly shaped `.env`.

## Authentication

Two layers, and they do not talk to each other.

**Sessions** guard the login and logout routes themselves. `POST /api/authentication`
refuses if you already have a session; `DELETE /api/authentication` refuses if you do not.

**JWTs** guard every `/api/deck/*` route. Send the access token from
`POST /api/authentication` in any one of three places:

```
x-access-token: <jwt>          header  — preferred
?token=<jwt>                   query   — avoid, see Known issues
{ "token": "<jwt>" }           body
```

Failures:

| Condition | Status | Body |
| --- | --- | --- |
| No token in any of the three places | `403` | `{ "message": "No token provided." }` |
| Token present but invalid or expired | `401` | `{ "message": "Unauthorized." }` |

Logging out destroys the session but does **not** revoke the JWT. An issued access token
stays valid until it expires.

## API reference

Base URL: `http://localhost:8797`

### `POST /api/register`

Creates an account. No authentication required.

```json
{
  "username": "nathan",
  "email": "nathan@example.com",
  "password": "hunter22",
  "password_confirm": "hunter22",
  "phone": "0900000000"
}
```

`username`, `email`, `password` and `password_confirm` are required. `password` must be
at least 6 characters and `password_confirm` must match it. `phone` is optional.

- **Validation failure** → `400` with an `express-validator` error array.
- **Email already registered** → `200` with `{ "errors": { "msg": "Email has been used." } }`.
- **Success** → `200` with `{ "user": { ... } }`.

### `POST /api/authentication`

Logs in. Fails with `401` if a session is already open.

```json
{ "username": "nathan", "password": "hunter22" }
```

Success returns both tokens plus the user document:

```json
{
  "user": { "_id": "...", "username": "nathan", "...": "..." },
  "jwt": "<access token>",
  "rjwt": "<refresh token>",
  "result": "success"
}
```

Wrong password returns `500` with `{ "error": "Username and Password are incorrect" }`;
an unknown username returns `200` with the same message under `err`.

### `DELETE /api/authentication`

Logs out by destroying the session. Requires an active session, not a JWT.

```json
{ "result": "success" }
```

### `GET /api/deck/new`

Creates one or more decks. **Requires a JWT.**

| Query parameter | Default | Description |
| --- | --- | --- |
| `deck_count` | `1` | How many decks to create, maximum 20. |
| `jokers_enabled` | `false` | `true` adds `X1` and `X2`, making it 54 cards. |
| `shuffle` | `false` | `true` shuffles before saving. |

```bash
curl 'http://localhost:8797/api/deck/new?deck_count=2&shuffle=true' \
  -H "x-access-token: $TOKEN"
```

Returns an **array**, one entry per deck:

```json
[
  { "success": true, "deck_id": "65...a1", "remaining": 52, "shuffled": true },
  { "success": true, "deck_id": "65...a2", "remaining": 52, "shuffled": true }
]
```

Asking for more than 20 returns `{ "errors": { "msg": "The max number of Decks is 20." } }`.

### `GET /api/deck/:id`

Returns a deck and every card still in it. **Requires a JWT.** Only the owner can read a
deck; another user's id yields a `500`.

```json
{
  "success": true,
  "deck_id": "65...a1",
  "remaining": 52,
  "shuffled": null,
  "cards": [ { "code": "AS", "...": "..." } ]
}
```

### `GET /api/deck/:id/draw`

Draws from the top of the stack and removes the cards from it. **Requires a JWT.**

| Query parameter | Default | Description |
| --- | --- | --- |
| `count` | `1` | How many cards to draw. |

```bash
curl 'http://localhost:8797/api/deck/65...a1/draw?count=5' \
  -H "x-access-token: $TOKEN"
```

```json
{
  "success": true,
  "deck_id": "65...a1",
  "cards": "[{\"code\":\"AS\", ... }]",
  "remaining": 47
}
```

`cards` arrives as a **JSON string**, not an array — the handler stringifies it a second
time. Parse it twice.

Asking for more cards than remain draws nothing:

```json
{
  "success": false,
  "deck_id": "65...a1",
  "message": "Deck is not enought cards to draw",
  "remaining": 3
}
```

### `DELETE /api/deck/:id`

Deletes a deck you own. **Requires a JWT.**

```json
{ "success": true }
```

## Card codes

A code is two characters: value then suit.

| Value | Code | | Suit | Code |
| --- | --- | --- | --- | --- |
| Ace | `A` | | Spades | `S` |
| 2–9 | `2`–`9` | | Diamonds | `D` |
| 10 | `0` | | Hearts | `H` |
| Jack | `J` | | Clubs | `C` |
| Queen | `Q` | | | |
| King | `K` | | | |

So the ace of spades is `AS` and the ten of hearts is `0H` — note the zero, not `10H`.
Jokers are the exception: `X1` is the black joker and `X2` the red one.

Every card is returned as:

```json
{
  "code": "AS",
  "image": "https://deckofcardsapi.com/static/img/AS.png",
  "images": {
    "svg": "https://deckofcardsapi.com/static/img/AS.svg",
    "png": "https://deckofcardsapi.com/static/img/AS.png"
  },
  "value": "ACE",
  "suit": "SPADES"
}
```

Those URLs point at deckofcardsapi.com even though this repository ships its own card
images under `static/img/playingcard/`. See [Known issues](#known-issues).

## Data models

**User** — `src/models/UserModels.js`

| Field | Type | Constraints |
| --- | --- | --- |
| `username` | String | required, unique, min length 2 |
| `password` | String | required, min length 6, bcrypt hash |
| `email` | String | required, unique |
| `phone` | String | optional |
| `role` | String | `admin` or `customer`, defaults to `customer` |
| `date_added` | Date | defaults to now |

**Deck** — `src/models/DeckModels.js`

| Field | Type | Description |
| --- | --- | --- |
| `user_id` | String | Owner's user id. |
| `deck_count` | Number | Always written as `1`. |
| `stack` | String | JSON array of the card codes still in the deck. |
| `piles` | String | JSON object. Reserved — no route uses piles yet. |
| `shuffled` | Number | `1` if shuffled at creation, `0` otherwise. |
| `last_used` | Date | Defaults to now. |

## Project layout

```
index.js                     Express bootstrap, session store, error handlers
src/
  routes/api.js              All eight routes, and where the JWT gate is applied
  controllers/
    AuthController.js        register, login, logout, refreshToken
    DeckController.js        new, get, draw, remove — plus the card tables
  middleware/
    AuthMiddleware.js        isAuth — verifies the JWT
  models/                    Mongoose schemas
  validators/validator.js    express-validator chains
  helpers/jwt.helper.js      sign and verify wrappers
  constants/common.js        shared constants
static/img/playingcard/      145 card images, currently unused
api_draft/                   Scratch code from an unrelated blog API. Not wired up.
```

## Known issues

Found by reading the source. Listed so you know what you are running, roughly worst
first. None of these are fixed yet.

**Security**

- **The JWT secret has a hardcoded fallback.** `src/constants/common.js` defines
  `SECRETAPI: 'RESTFULAPIS'`, and both the access and refresh token secrets fall back to
  it. In a public repository that means anyone can forge a token — including one with
  `"role": "admin"` — against any deployment that forgot to set the environment
  variables. Set `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
- **The session secret is hardcoded** as `'Multi'` in `index.js` and cannot be overridden.
- **Login returns the full user document**, bcrypt hash included, alongside the tokens.
- **Tokens are accepted from the query string.** `?token=` lands in `morgan` output,
  proxy logs, browser history and `Referer` headers. Use the `x-access-token` header.
- **Refresh tokens live for ten years by default** and are held in a module-level
  in-memory object, so they cannot be revoked and are lost on restart. The
  `refreshToken` handler is also not attached to any route, so there is no way to redeem
  one.
- **No rate limiting** on register or login. Password guessing is unthrottled.
- **Dependencies are end-of-life**: Mongoose 5, Express 4, `jsonwebtoken` 8,
  `connect-mongo` 3. `session@0.1.0` is a dependency but is never imported.

**Correctness**

- `dotenv.config()` runs on line 23 of `index.js`, after `PORT` is read on line 20, so
  `PORT` from `.env` is silently ignored.
- `GET /api/deck/:id` reads `result.shuffle`, but the schema field is `shuffled`. The
  response always reports `null`.
- `deck_count` stays a string from the query, so the `dcount > maxdeck` guard is a
  string-to-number comparison. `deck_count=5` passes, `deck_count=100` happens to be
  caught, but the check is not doing what it looks like.
- Each created deck stores `deck_count = 1` regardless of the requested count. Asking for
  three decks creates three separate one-deck documents rather than one deck of 156
  cards, which is not how deckofcardsapi.com behaves.
- `shuffle_deck` sorts with `() => 0.5 - Math.random()`. That is not a uniform shuffle —
  some orderings are far more likely than others. Fisher-Yates is the fix.
- The same function sorts in place, and it is handed `CARDS` directly, so shuffling one
  deck permanently reorders the module-level card table for the life of the process.
- `deck_draw` removes drawn cards with `stacktmp.splice(drawtmp[i], 1)`, where
  `drawtmp[i]` is a card code like `"AS"`, not an index. It coerces to `NaN`, which
  `splice` treats as `0`, so the right number of cards is removed from the top by
  accident. It works, for the wrong reason, and will break the moment someone draws from
  anywhere but the top.
- `GET /api/deck/:id/draw` returns `cards` as a stringified JSON array while
  `GET /api/deck/:id` returns a real array. The two responses disagree.
- `CARDS`, `JOKERS`, `SUITS` and `VALUES` are assigned without `const`, `let` or `var`,
  making them implicit globals. This would throw under `"use strict"` or in a module.
- `card_in_dics` hotlinks images from deckofcardsapi.com while 145 card images sit unused
  in `static/img/playingcard/`.
- `npm run devstart` is `nodemon run index.js`, which asks nodemon to run a file named
  `run`. Use `npx nodemon index.js`. There is no `start` script and no test suite.
- `api_draft/` contains an unrelated blog API — posts and users — that nothing imports.

## Roadmap

Rough order, security first:

- [ ] Fail fast at startup when `ACCESS_TOKEN_SECRET` or `REFRESH_TOKEN_SECRET` is unset,
      and drop the hardcoded fallback
- [ ] Move the session secret into the environment
- [ ] Strip the password hash from the login response
- [ ] Stop reading tokens from the query string
- [ ] Wire up `POST /api/refresh-token` and shorten the refresh lifetime
- [ ] Rate-limit register and login
- [ ] Fix the `shuffled` field name, the `deck_count` comparison and the draw response shape
- [ ] Replace the sort-based shuffle with Fisher-Yates, and stop mutating `CARDS`
- [ ] Serve card images from `static/` instead of hotlinking
- [ ] Add pile support — `piles` is in the schema but no route touches it
- [ ] Upgrade Mongoose, Express and `connect-mongo`; drop the unused `session` package
- [ ] Add tests and a CI workflow
- [ ] Delete `api_draft/`

## Buy me a beer

If this saved you an afternoon, or you just like the idea of a card API that remembers
your hand, you are welcome to put a beer on the tab.

[![PayPal](https://img.shields.io/badge/PayPal-Buy%20me%20a%20beer-00457C.svg?logo=paypal&logoColor=white)](https://www.paypal.me/shivakira95)

**[paypal.me/shivakira95](https://www.paypal.me/shivakira95)**

Entirely optional, and it buys you nothing — no priority, no support, no promises. A star
on the repository or a good bug report is worth just as much.

## License

[ISC](LICENSE) © Nguyen Anh Nhat
