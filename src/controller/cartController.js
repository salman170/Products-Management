const cartModel = require("../models/cartModel")
const userModel = require('../Models/userModel')
const productModel = require("../models/productModel");
const { isValidObjectId, isValidRequestBody} = require("../validator/validator")



//<<-----------------------------------------------Add to Cart  -------------------------------------------------------->>

const addCart = async (req, res) => {
    try {
        let userId = req.params.userId
        let data = req.body;

        if (!userId) return res.status(400).send({ status: false, message: "userId is required in path params" })

        if (!isValidObjectId(userId.trim())) { return res.status(400).send({ status: false, message: `${userId} is Invalid UserId ` }) }

        if (userId != req.userId) return res.status(403).send({ status: false, message: "Unauthorized access!" });

        const userData = await userModel.findById(userId)
        if (!userData) return res.status(404).send({ status: false, message: `No user data found for this ${userId}` })

        if (!isValidRequestBody(data)) return res.status(400).send({ status: false, message: "Please provide data in body" });

        let { productId, quantity, cartId } = data;

        if (!productId) return res.status(400).send({ status: false, message: "productId is Required" });

        if (!isValidObjectId(productId.toString())) { return res.status(400).send({ status: false, message: `${productId} is Invalid productId ` }) }

        isProductExist = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!isProductExist) return res.status(404).send({ status: false, message: `No product available with this ${productId} productId` })

        //quantity validation
        if (quantity <= 0 && typeof quantity != "number") { return res.status(400).send({ status: false, message: " If you want to add quantity, Please put more than Zero", }); }

        if (!quantity) {
            quantity = 1;
            data["quantity"] = quantity;
        }

        // if (typeof quantity != "number") return res.status(400).send({ status: false, message: "Quantity Should only Be Number" });

        //total price and total items 
        let totalPrice = isProductExist.price * data.quantity;
        totalPrice = Math.round(totalPrice*100) /100
        let totalItems = 1;

        checkForCart = await cartModel.findOne({ userId: userId });

        if (cartId && checkForCart) {
            if (!isValidObjectId(cartId.toString())) { return res.status(400).send({ status: false, message: `${cartId} is Invalid productId ` }) }

            if (cartId != checkForCart._id) return res.status(400).send({ status: false, message: `${cartId} is not belongs toh this ${userId}` })

            let flag = false;

            //checking items in the existing cart
            //if product exist in the item array, than increase the quantity
            for (let i = 0; i < checkForCart.items.length; i++) {
                if (checkForCart.items[i].productId == productId) {
                    checkForCart.items[i].quantity += quantity;
                    flag = true;
                    break;
                }
            }

            //if not than add the new product
            if (!flag) {
                let newProductDetails = {
                    productId: productId,
                    quantity: data.quantity,
                };
                checkForCart.items.push(newProductDetails);
            }

            //after adding new product or increase the same product's quantity, than set the price(if new product add than set the total items)
            checkForCart.totalPrice += totalPrice;
            checkForCart.totalPrice = Math.round(checkForCart.totalPrice*100) /100
            checkForCart.totalItems = checkForCart.items.length;

            //updation part
            let addtoCart = await cartModel.findOneAndUpdate(
                { userId: userId },
                { $set: checkForCart },
                { new: true }
            ).populate({
                path: "items.productId",
                select: {
                  _id: 1,
                  title: 1,
                  price: 1,
                  productImage: 1,
                  style: 1,
                },
              })
            return res.status(201).send({ status: true, message: "Success", data: addtoCart, });

        }

        if (checkForCart && !cartId)
            return res.status(400).send({ status: false, message: `cartId is required. (if forget this is your cartId ${checkForCart._id})` })

        if (!checkForCart) {
            let newObj = {};

            //set product details
            let productDetails = {
                productId: productId,
                quantity: data.quantity,
            };

            //pushing product details in new array
            let items = [];
            items.push(productDetails);

            //set other details in the new object
            newObj["userId"] = userId;
            newObj["items"] = items;
            newObj["totalPrice"] = totalPrice;
            newObj["totalItems"] = totalItems;

            //creating new cart
            let createCart = await (await cartModel.create(newObj)).populate({
                path: "items.productId",
                select: {
                  _id: 1,
                  title: 1,
                  price: 1,
                  productImage: 1,
                  style: 1,
                },
              })

            return res.status(201).send({ status: true, message: "Success", data: createCart, });
        }

    } catch (error) {
        console.log(error.message)
        return res.status(500).send({ status:false,message: error.message })
    }
}




//<<-----------------------------------------------Put Cart  -------------------------------------------------------->>

const updateCart = async (req, res) => {
    try {
        let userId = req.params.userId
        let data = req.body;

        if (!userId) return res.status.send({ status: false, message: "userId is required in path params" })

        if (!isValidObjectId(userId.trim())) { return res.status(400).send({ status: false, message: `${userId} is Invalid UserId ` }) }

        if (userId != req.userId) return res.status(403).send({ status: false, message: "Unauthorized access!" });

        const userData = await userModel.findById(userId)
        if (!userData) return res.status(404).send({ status: false, message: `No user data found for this ${userId}` })

        if (!isValidRequestBody(data)) return res.status(400).send({ status: false, message: "Please provide data in body" });

        let { productId, removeProduct, cartId } = data;

        if (!productId) return res.status(400).send({ status: false, message: "productId is Required" });

        if (!isValidObjectId(productId.toString())) { return res.status(400).send({ status: false, message: `${productId} is Invalid productId ` }) }

        isProductExist = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!isProductExist) return res.status(404).send({ status: false, message: `No product available with this ${productId} productId` })

        if (!cartId) return res.status(400).send({ status: false, message: `cartId is required. ` })

        checkForCart = await cartModel.findOne({ userId: userId });

        if (!checkForCart) return res.status(400).send({ status: false, message: `No cart exists for this user ${userId}` })

        if (cartId && checkForCart) {
            if (!isValidObjectId(cartId.toString())) { return res.status(400).send({ status: false, message: `${cartId} is Invalid productId ` }) }

            if (cartId != checkForCart._id) return res.status(400).send({ status: false, message: `${cartId} is not belongs toh this ${userId}` })
        }

        let flag = false;
        let place = 0

        //checking items in the existing cart
        //if product exist in the item array, than increase the quantity
        for (let i = 0; i < checkForCart.items.length; i++) {
            if (checkForCart.items[i].productId == productId) {
                flag = true;
                place = i
                break;
            }
        }

        if (!flag) return res.status(404).send({ status: false, message: `No product available with this ${productId} for this cartId ${cartId}` })

        if (!(removeProduct) && removeProduct != 0) return res.status(400).send({ status: false, message: `removeProduct is required. ` })

        if (typeof removeProduct != "number" || removeProduct < 0) return res.status(400).send({ status: false, message: "Provide the removeProduct Key Should be in number only" });

        if (!(removeProduct == 1 || removeProduct == 0)) return res.status(400).send({ status: false, message: "RemoveProduct Key Should be Zero Or One" });

        if (removeProduct == 1) {
            if (checkForCart.items[place].quantity > 0) {
                checkForCart.items[place].quantity -= 1
                checkForCart.totalPrice -= isProductExist.price;
                checkForCart.totalPrice = Math.round(checkForCart.totalPrice*100) /100

                if (checkForCart.items[place].quantity == 0) {
                    checkForCart.items.splice(place, 1);
                    checkForCart.totalItems = checkForCart.items.length;
                }

            }
        } else if (removeProduct == 0) {
            checkForCart.totalPrice -= checkForCart.items[place].quantity * isProductExist.price;
            checkForCart.totalPrice = Math.round(checkForCart.totalPrice*100) /100
            checkForCart.items.splice(place, 1);
            checkForCart.totalItems = checkForCart.items.length;
        }

        let addtoCart = await cartModel.findOneAndUpdate(
            { userId: userId },
            { $set: checkForCart },
            { new: true }
        ).populate({
            path: "items.productId",
            select: {
              _id: 1,
              title: 1,
              price: 1,
              productImage: 1,
              style: 1,
            },
          });
        return res.status(200).send({ status: true, message: "Success", data: addtoCart, });



    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}





//<<-----------------------------------------------Get Cart  -------------------------------------------------------->>

const getCart = async (req, res) => {
    try {
        let userId = req.params.userId
        if (!userId) return res.status.send({ status: false, message: "userId is required in path params" })

        if (!isValidObjectId(userId.trim())) { return res.status(400).send({ status: false, message: `${userId} is Invalid UserId ` }) }

        if (userId != req.userId) return res.status(403).send({ status: false, message: "Unauthorized access!" });

        const userData = await userModel.findById(userId)
        if (!userData) return res.status(404).send({ status: false, message: `No user data found for this ${userId}` })

        //cart validation
        let isCart = await cartModel.findOne({ userId: userId }).populate({
            path: "items.productId",
            select: {
              _id: 1,
              title: 1,
              price: 1,
              productImage: 1,
              style: 1,
            },
          });
        if (!isCart) {
            return res.status(404).send({ status: false, message: "Cart not found" });
        }

        return res.status(200).send({ status: true, message: "Success", data: isCart })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//<<-----------------------------------------------Delete Cart  -------------------------------------------------------->>

const deleteCart = async (req, res) => {
    try {
        let userId = req.params.userId
        if (!userId) return res.status.send({ status: false, message: "userId is required in path params" })

        if (!isValidObjectId(userId.trim())) { return res.status(400).send({ status: false, message: `${userId} is Invalid UserId ` }) }

        if (userId != req.userId) return res.status(403).send({ status: false, message: "Unauthorized access!" });

        const userData = await userModel.findById(userId)
        if (!userData) return res.status(404).send({ status: false, message: `No user data found for this ${userId}` })

        //cart validation
        let isCart = await cartModel.findOne({ userId: userId });
        if (!isCart) {
            return res.status(404).send({ status: false, message: "This Cart is Already Deleted" });
        } else {

            //cart deleting means array of items is empty, totalItems is 0, totalPrice is 0
            isCart.totalItems = 0;
            isCart.totalPrice = 0;
            isCart.items = [];

            let delCart = await cartModel.findOneAndUpdate(
                { userId: userId },
                { $set: isCart },
                { new: true }
            );
            return res.status(204).send({ status: true, message: "Cart Deleted Succesfully", data: delCart, });
        }
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { deleteCart, addCart, getCart, updateCart }