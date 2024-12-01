

function error(err, req, res, next) {

    console.log(err)
    res.status(500).send({ error: "something went wrong" })
}

module.exports = error