function error_handler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res)
        }
        catch (e) {
            next(ex)
        }
    }
}

module.exports = error_handler