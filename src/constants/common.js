const moment = require('moment-timezone')

module.exports = {
    CURRDEFAULT	: moment().tz("Asia/Ho_Chi_Minh").format(),
    ROOTPATH	: 'src',
    STATICURL	: '',
    SECRETAPI	: 'RESTFULAPIS',
}