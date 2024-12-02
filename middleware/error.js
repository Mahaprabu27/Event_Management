const { INTERNAL_SERVER_ERROR } = require("../startup/status_Codes")


function error(err, req, res, next) {

    console.log(err)
    res.status(INTERNAL_SERVER_ERROR).send({ error: "something went wrong" })
}

module.exports = error