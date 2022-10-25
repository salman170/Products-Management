//<<-----------------------------------------------Importing Modules -------------------------------------------------------->>
const userModel = require('../Models/userModel')
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const aws = require("../aws/aws")
const validator = require("../validator/validator")
const { isValid, isValidRequestBody, isRightFormatemail, isRightFormatmobile, isValidObjectId, isValidPinconde, isValidImg, isValidName, isValidPassword } = require("../validator/validator")




//<<-----------------------------------------------Create user-------------------------------------------------------->>
const createUserDocument = async function (req, res) {
    try {
        let data = req.body;
        if (!isValidRequestBody(data)) { return res.status(400).send({ status: false, message: 'No data provided for user' }) }

        //validations

        let { fname, lname, email, phone, password, address, profileImage } = data

        if (!fname || !isValid(fname)) { return res.status(400).send({ status: false, message: "First Name is required" }) }

        if (!isValidName(fname)) return res.status(400).send({ status: false, message: "Enter valid First Name" });

        if (!lname || !isValid(lname)) { return res.status(400).send({ status: false, message: "Last name is required" }) }

        if (!isValidName(lname)) return res.status(400).send({ status: false, message: "Enter valid Last name" });

        if (!email || !isValid(email)) { return res.status(400).send({ status: false, message: "Email is required" }) }

        if (!isRightFormatemail(email)) { return res.status(400).send({ status: false, message: "Please provide a valid email" }) }

        let files = req.files;
        if (files.length == 0) { return res.status(400).send({ status: false, message: "Please provide a profile image" }) }

        if (files && files.length > 0) {
            if (!isValidImg(files[0].mimetype)) { return res.status(400).send({ status: false, message: "Image Should be of JPEG/ JPG/ PNG" }); }
        }

        if (await userModel.findOne({ email: email })) { return res.status(400).send({ status: false, message: `User already exist with this ${email}` }) }

        if (!phone || !isValid(phone)) { return res.status(400).send({ status: false, message: "Phone number is required" }) }

        if (!isRightFormatmobile(phone)) { return res.status(400).send({ status: false, message: "Please provide a valid Indian phone number" }) }

        if (await userModel.findOne({ phone: phone })) { return res.status(400).send({ status: false, message: `User already exist with this ${phone}.` }) }

        if (!password || !isValid(password)) { return res.status(400).send({ status: false, message: "Password is required" }) }

        if (!isValidPassword(password)) return res.status(400).send({ status: false, message: "password is not in correct format(length should be from 8-15)" })

        if (!address || address == null) { return res.status(400).send({ status: false, message: "Please provide your address" }) }

        if (!isValid(address)) { return res.status(400).send({ status: false, message: "address will be in object only" }) }

        try {
            address = JSON.parse(data.address)
            data.address = address
        }
        catch (err) {
            return res.status(400).send({ status: true, message: " Pincode can't start with zero" })
        }
        const { shipping, billing } = address
        if (!shipping) { return res.status(400).send({ status: true, message: " Shipping address is required" }) }

        if (!shipping.street || !isValid(shipping.street)) { return res.status(400).send({ status: false, message: "shipping Street address is required" }) }

        if (!shipping.city || !isValid(shipping.city)) { return res.status(400).send({ status: true, message: " shipping City is required" }) }

        if (!shipping.pincode || !isValid(shipping.pincode)) { return res.status(400).send({ status: true, message: " shipping Pincode is required" }) }

        if (!isValidPinconde(shipping.pincode)) { return res.status(400).send({ status: false, message: "Please provide pincode in 6 digit number" }) }

        if (!billing) { return res.status(400).send({ status: true, message: " billing address is required" }) }

        if (!billing.street || !isValid(billing.street)) { return res.status(400).send({ status: true, message: " Billing Street  address is required" }) }

        if (!billing.city || !isValid(billing.city)) { return res.status(400).send({ status: true, message: "  Billing City address is required" }) }

        if (!billing.pincode || !isValid(billing.pincode)) { return res.status(400).send({ status: true, message: " Billing pincode is required" }) }

        if (!isValidPinconde(billing.pincode)) { return res.status(400).send({ status: false, message: "Please provide pincode in 6 digit number" }) }

        //encrypting password
        const saltRounds = 10;
        hash = await bcrypt.hash(password, saltRounds);

        const uploadedFileURL = await aws.uploadFile(files[0])

        data.profileImage = uploadedFileURL;

        data.password = hash;

        const newUser = await userModel.create(data);

        return res.status(201).send({ status: true, message: 'success', data: newUser })
    }
    catch (error) {
        console.log(error.message)
        return res.status(500).send({ message: error.message })
    }
}


//-----------------------------------------------user login --------------------------------------------------------

const userLogin = async function (req, res) {
    try {

        let data = req.body;
        if (!isValidRequestBody(data)) { return res.status(400).send({ status: false, message: 'No credential provided for login' }) }
        let { email, password } = req.body

        if (!email || !isValid(email)) { return res.status(400).send({ status: false, message: 'EMAIL is required' }) }

        if (!isRightFormatemail(email)) { return res.status(400).send({ status: false, message: 'Please provide a valid email' }) }

        if (!password) { return res.status(400).send({ status: false, message: 'Password is required' }) }

        if (password.trim().length < 8 || password.trim().length > 15) { return res.status(400).send({ status: false, message: 'Password should be of minimum 8 characters & maximum 15 characters' }) }

        const mailMatch = await userModel.findOne({ email: email }).select({ _id: 1, password: 1 })
        if (!mailMatch) return res.status(400).send({ status: false, message: `No data found with this ${email} email.` })

        const userId = mailMatch._id;
        checkPassword = mailMatch.password;

        const passMatch = await bcrypt.compare(password, checkPassword)

        if (!mailMatch || !passMatch) return res.status(400).send({ status: false, message: "Password is incorrect." })

        const token = jwt.sign({
            userId: mailMatch._id.toString(), iat: new Date().getTime() / 1000,
        }, "FunctionUp Group No 26", { expiresIn: "2h" });

        res.setHeader("authorization", "token");
        return res.status(200).send({ status: true, message: "You are successfully logged in", data: { userId: userId, token: token } })

    }
    catch (error) {
        console.log(error)
        return res.status(500).send({ message: error.message })
    }
}



//<<-----------------------------------------------Get user  -------------------------------------------------------->>
const getUser = async function (req, res) {
    try {
        let userId = req.params.userId

        if (!userId) return res.status.send({ status: false, message: "userId is required in path params" })

        if (!isValidObjectId(userId.trim())) { return res.status(400).send({ status: false, message: `${userId} is Invalid UserId ` }) }

        if (userId != req.userId) return res.status(403).send({ status: false, message: "Unauthorized access!" });

        const userData = await userModel.findById(userId)
        if (!userData) return res.status(404).send({ status: false, message: `No user data found for this ${userId}` })

        return res.status(200).send({ status: true, message: "User profile details", data: userData })
    }
    catch (err) {
        cosole.log(err.message)
        res.status(500).send({ status: false, message: err.merssage })
    }
}
///////////////****************/ PUT-Update API (USER) *******************/////////////////////////////////
const updateUser = async function (req, res) {

    try {
        let userDetails = req.body
        let files = req.files;
        let userId = req.params.userId
        let userIdFromToken = req.userId

        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid UserId" })
        }

        const findUserData = await userModel.findById(userId)

        if (!findUserData) {
            return res.status(404).send({ status: false, message: "user not found" })
        }

        if (findUserData._id.toString() != userIdFromToken) {
            return res.status(403).send({ status: false, message: "You Are Not Authorized!!" })
        }

        let { fname, lname, email, phone, password, address, profileImage } = userDetails


        if (!(validator.isValidRequestBody(userDetails) || files)) {
            return res.status(400).send({ status: false, message: "Please provide user's details to update." })
        }

        if (!validator.validString(fname)) {
            return res.status(400).send({ status: false, message: 'first name is Required' })
        }

        if (!validator.validString(lname)) {
            return res.status(400).send({ status: false, message: 'last name is Required' })
        }

        if (!validator.validString(email)) {
            return res.status(400).send({ status: false, message: 'email is Required' })
        }
        if (email) {

            if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userDetails.email))
                return res.status(400).send({ status: false, message: "Invalid Email id." })

            const checkEmailFromDb = await userModel.findOne({ email: userDetails.email })

            if (checkEmailFromDb)
                return res.status(404).send({ status: false, message: `emailId is Exists. Please try another email Id.` })
        }

        if (profileImage != null) {
            return res.status(400).send({ status: false, message: "ProfileImage Should be of JPEG/ JPG/ PNG. Please enter valid value" });
        }


        if (files && files.length > 0) {
            if (!isValidImg(files[0].mimetype)) return res.status(400).send({ status: false, message: "Image Should be of JPEG/ JPG/ PNG" });
            var userImage = await aws.uploadFile(files[0]);
        }


        if (!validator.validString(phone)) {
            return res.status(400).send({ status: false, message: 'phone number is Required' })
        }

        if (phone) {
            if (!(/^(\+\d{1,3}[- ]?)?\d{10}$/).test(userDetails.phone))
                return res.status(400).send({ status: false, message: "Phone number must be a valid Indian number." })

            const checkPhoneFromDb = await userModel.findOne({ phone: userDetails.phone })

            if (checkPhoneFromDb) {
                return res.status(400).send({ status: false, message: `${userDetails.phone} is already in use, Please try a new phone number.` })
            }
        }


        if (!validator.validString(password)) {
            return res.status(400).send({ status: false, message: 'password is Required' })
        }

        if (password) {

            if (!(password.length >= 8 && password.length <= 15)) {
                return res.status(400).send({ status: false, message: "Password should be Valid min 8 and max 15 " })
            }
            var hashedPassword = await bcrypt.hash(password, 10)

        }

        if (!validator.validString(address)) {
            return res.status(400).send({ status: false, message: 'Address is Required' })
        }

        if (address) {
            address = JSON.parse(userDetails.address)

            if (address.shipping) {
                if (address.shipping.street) {
                    if (!validator.isValid(address.shipping.street)) {
                        return res.status(400).send({ status: false, message: 'Please provide street' })
                    }

                }
                if (address.shipping.city) {
                    if (!validator.isValid(address.shipping.city)) {
                        return res.status(400).send({ status: false, message: 'Please provide city' })
                    }

                }
                if (address.shipping.pincode) {
                    if (!validator.isValid(address.shipping.pincode)) {
                        return res.status(400).send({ status: false, message: 'Please provide pincode' })
                    }
                    if (!Number.isInteger(Number(address.shipping.pincode))) {
                        return res.status(400).send({ status: false, message: 'please provide a valid pincode' })
                    }

                    if (!isValidPinconde(address.shipping.pincode)) { return res.status(400).send({ status: false, message: "Please provide pincode in 6 digit number" }) }
                }
            }
            if (address.billing) {
                if (address.billing.street) {
                    if (!validator.isValid(address.billing.street)) return res.status(400).send({ status: false, message: 'Please provide street' })

                }
                if (address.billing.city) {
                    if (!validator.isValid(address.billing.city)) return res.status(400).send({ status: false, message: 'Please provide city' })

                }
                if (address.billing.pincode) {
                    if (!validator.isValid(address.billing.pincode)) return res.status(400).send({ status: false, message: 'please provide pincode' })
                    
                    if (!Number.isInteger(Number(address.billing.pincode))) return res.status(400).send({ status: false, message: 'Please provide valid pincode' })

                    if (!isValidPinconde(address.billing.pincode)) { return res.status(400).send({ status: false, message: "Please provide pincode in 6 digit number" }) }
                }
            }
        }

        let updatedData = {
            fname: fname,
            lname: lname,
            email: email,
            phone: phone,
            password: hashedPassword,
            profileImage: userImage,
            address: {
                shipping: {
                    street: address?.shipping?.street || findUserData.address.shipping.street,
                    city: address?.shipping?.city || findUserData.address.shipping.city,
                    pincode: address?.shipping?.pincode || findUserData.address.shipping.pincode,

                },
                billing: {
                    street: address?.billing?.street || findUserData.address.billing.street,
                    city: address?.billing?.city || findUserData.address.billing.city,
                    pincode: address?.billing?.pincode || findUserData.address.billing.pincode,

                }
            }
        }


        let updateProfileDetails = await userModel.findOneAndUpdate(
            { _id: userId },
            updatedData,
            { new: true })

        return res.status(200).send({ status: true, message: "User Update Successful!!", data: updateProfileDetails })

    } catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}



module.exports = { createUserDocument, getUser, userLogin, updateUser }