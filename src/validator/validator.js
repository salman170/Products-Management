const mongoose = require("mongoose");


const isValid = function (value) {
    if (typeof (value) === undefined || typeof (value) === null) { return false }
    if (typeof (value) === "string" && value.trim().length == 0) { return false }
    if (typeof (value) === "number" && value.toString().trim().length == 0) { return false }
    if (typeof (value) === "object" && Object.keys(value).length == 0) { return false }
    return true
}

const isValidName = function (value) {
    return /^[a-zA-Z ]{2,30}$/.test(value)
}

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0;
};


const isRightFormatemail = function (email) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
}

const isRightFormatmobile = function (phone) {
    return /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(phone);
}

const isValidObjectId = function (objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}


const isValidPinconde = function (pincode) {
    if (/^\+?([1-9]{1})\)?([0-9]{5})$/.test(pincode)) return true
    return false
}


const isValidImg = function (img) {
    const reg = /image\/png|image\/jpeg|image\/jpg/;
    return reg.test(img);
};


const isValidPassword = function (pass) {
    if (/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/.test(pass)) return true
}

const isValidPrice = function (priceValue) {
    if(isNaN(Number(priceValue))) return false
    if(priceValue <= 0) return false
    return /\d/.test(priceValue)
}

let isValidSize = function (sizes) {
    return ['S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'].includes(sizes);
}

const isValidDescrption = (value) => {
    let alphaRegex = /^[a-zA-Z0-9-_.,;:"' ]+$/;
    if (alphaRegex.test(value)) return true;
}

const isValidTitle = (value) => {
    let alphaRegex = /^[a-zA-Z0-9-_ ]+$/;
    if (alphaRegex.test(value)) return true;
}
const validString = (value) => {
    if (typeof (value) === "string" && value.trim().length == 0) { return false }
    return true
}

const isValidStatus = function(status) {
    return ['pending', 'completed', 'cancelled'].indexOf(status) !== -1
  }
module.exports = { isValid, isValidRequestBody, isRightFormatemail, isRightFormatmobile, isValidObjectId, isValidPinconde, isValidImg, isValidName, isValidPassword, isValidPrice, isValidSize, isValidDescrption, isValidTitle, validString, isValidStatus };
