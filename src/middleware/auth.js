const jwt = require('jsonwebtoken')

const authentication = async (req, res, next) => {
    try {
        let gettingToken = req.headers.authorization

        if (!gettingToken) return res.status(400).send({ status: false, message: "token must be present" });
        
        const token = gettingToken.substring(7)

        jwt.verify(token, "FunctionUp Group No 26", (err, decodedToken) => {
            if (err) return res.status(401).send({ status: false, message: "token is not valid {"+err.message +"}"})
            req.userId = decodedToken.userId
            next();
        }) 
    }
    catch (err) {
        console.log(err.message)
        res.status(500).send({ status: false, message: err.message })
    }
};









module.exports = { authentication }