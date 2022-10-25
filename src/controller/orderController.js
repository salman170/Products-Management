//<<-----------------------------------------------Importing Modules -------------------------------------------------------->>
const userModel = require('../Models/userModel')

const validator = require("../validator/validator")
const {  isValidObjectId } = require("../validator/validator")

const orderModel = require('../Models/orderModel')
const cartModel = require('../models/cartModel')

///////////////*****/ POST-Create API (ORDER) ********/////////////////////////////////
const createUserOrder = async function (req, res) {
    try {
        const userId = req.params.userId
        const {cartId, cancellable} = req.body

        // userId and jwt match
        if (!userId) return res.status(400).send({ status: false, message: "userId is required in path params" })
        if (!isValidObjectId(userId.trim())) { return res.status(400).send({ status: false, message: `${userId} is Invalid UserId ` }) }
        if (userId != req.userId) return res.status(403).send({ status: false, message: "Unauthorized access!" });

        if (!cartId) return res.status(400).send({ status: false, message: "cartId is required in body" })
        if (!isValidObjectId(cartId.trim())) { return res.status(400).send({ status: false, message: `${cartId} is Invalid cartId ` }) }
        if (cancellable){
            if (typeof cancellable!= 'boolean')
            res.status(400).send({ status: false, message: "Cancellable value should be a Boolean type" })
        }
        // user exists or not
        const userData = await userModel.findById(userId)
        if (!userData) return res.status(404).send({ status: false, message: `No user data found for this ${userId}` })

        // cart exists or not - cart - user relation
        const cartData = await cartModel.findOne({ _id: cartId, userId: userId }).populate("items.productId")
        if (!cartData) return res.status(404).send({ status: false, message: `No cart data found for this ${cartId}` })

        const { items, totalPrice, totalItems } = cartData;

        // calculate totalQuantity
        let totalQuantity = 0;
        for (const item of items) {
            totalQuantity += item.quantity
            
        }

        // create order
        const order = await (await orderModel.create({
            userId: userId,
            items: items,
            totalPrice: totalPrice,
            totalItems: totalItems,
            totalQuantity: totalQuantity,
            cancellable:cancellable
        })).populate({
            path: "items.productId",
            select: {
              _id: 1,
              title: 1,
              price: 1,
              productImage: 1,
              style: 1,
            },
          })
        
        // remove cart
        await cartData.remove();

        return res.status(201).send({ status: true, message: "Success", data: order })
    }
    catch (err) {
        console.log(err.message)
        res.status(500).send({ status: false, message: err.merssage })
    }
}




const updateOrder = async (req, res) => {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;
        const userIdFromToken = req.userId
 
        //validating request body.
        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({status: false, message: "Invalid request body. Please provide the the input to proceed."});
        }
        //extract params
        const { orderId, status } = requestBody;
        
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." });
        }
        const searchUser = await userModel.findOne({ _id: userId });
        if (!searchUser) {
            return res.status(400).send({status: false, message: `user doesn't exists`});
        }

        //Authentication & authorization
        if (userId != userIdFromToken) {
           return res.status(403).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
            
        }
        
        if (!orderId) {
            return res.status(400).send({status: false, message: `Mandatory paramaters not provided. Please enter orderId.`});
        }
  
        //verifying does the order belongs to user or not.
        const isOrderBelongsToUser = await orderModel.findById(orderId);
        if (!isOrderBelongsToUser) {
            return res.status(400).send({status: false, message: `Order doesn't exists`});
        }
  
        if(isOrderBelongsToUser.userId != userId) return res.status(400).send({status: false, message: `${orderId} Order doesn't belongs to ${userId}`})
       
        if (!status) {
            return res.status(400).send({status: false, message: "Mandatory paramaters not provided. Please enter current status of the order."});
        }
        if (!validator.isValidStatus(status)) {
            return res.status(400).send({status: false, message: "Invalid status in request body. Choose either 'pending','completed', or 'cancelled'."});
        }
  
        //if cancellable is true then status can be updated to any of te choices.
        
        if (isOrderBelongsToUser["cancellable"] == true) {
            if ((validator.isValidStatus(status))) {
                if (isOrderBelongsToUser['status'] == 'pending') {
                    const updateStatus = await orderModel.findOneAndUpdate({ _id: orderId }, {
                        $set: { status: status }
                    }, { new: true })
                    return res.status(200).send({ status: true, message: `Success`, data: updateStatus })
                }
  
                
                //if order is in completed status then nothing can be changed/updated.
                if (isOrderBelongsToUser['status'] == 'completed') {
                    return res.status(400).send({ status: false, message: `Unable to update or change the status, because it's already in completed status.` })
                }
  
                //if order is already in cancelled status then nothing can be changed/updated.
                if (isOrderBelongsToUser['status'] == 'cancelled') {
                    return res.status(400).send({ status: false, message: `Unable to update or change the status, because it's already in cancelled status.` })
                }
            }
        }
        //for cancellable : false
        if (isOrderBelongsToUser['status'] == "completed") {
            if (status) {
                return res.status(400).send({ status: false, message: `Cannot update or change the status, because it's already in completed status.` })
            }
        }

  
        if (isOrderBelongsToUser['status'] == "cancelled") {
            if (status) {
                return res.status(400).send({ status: false, message: `Cannot update or change the status, because it's already in cancelled status.` })
            }
        }
        
  
        if (isOrderBelongsToUser['status'] == "pending") {
            if (status) {
                if (status == "cancelled") {
                    return res.status(400).send({ status: false, message: `Cannot cancel the order due to Non-cancellable policy.` })
                }
                if (status == "pending") {
                    return res.status(400).send({ status: false, message: `Cannot update status from pending to pending.` })
                }
  
                const updatedOrderDetails = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })
  
                return res.status(200).send({ status: true, message: `Success`, data: updatedOrderDetails })
               
            }
        }
  
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
  }

module.exports = { createUserOrder , updateOrder}