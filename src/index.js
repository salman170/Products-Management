const express = require('express');
const route = require('./routes/route.js');
const app = express();
const mongoose = require('mongoose')
const multer = require('multer')
app.use(express.json());
app.use(multer().any())
// multer will be used to get access to the file in nodejs

mongoose.connect("mongodb+srv://rukmanisdb:vjycEqeXgt3fpaS7@cluster0.fw901z3.mongodb.net/group26Database", {
    useNewUrlParser: true
})
.then(() => console.log("MongoDb is connected"))
.catch(err => console.log(err))


app.use('/', route);

app.use("/*", function (req, res) {
    return res.status(400).send({ status: false, message: "invalid request params (path not found)" })
});

app.listen((process.env.PORT || 3000), function () {
    console.log('Express app running on port ' + (process.env.PORT || 3000))
});

