
function admin(req, res, next) {

    if (req.user.role !== "admin") return res.status(403).send({ error: `need admin access ,dont have access to ${req.user.role}` })

    next();
}

module.exports = admin