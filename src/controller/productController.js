const productModel = require("../models/productModel");
const validator = require("../validator/validator.js");
const aws = require("../aws/aws")
const { isValidObjectId, isValidRequestBody, isValid, isValidImg, isValidName, isValidPrice, isValidSize, isValidDescrption, isValidTitle } = require("../validator/validator")







//<<-----------------------------------------------Create Product-------------------------------------------------------->>

let createProducts = async (req, res) => {
    try {

        let data = req.body;
        let files = req.files;

        if (!isValidRequestBody(data)) return res.status(400).send({ status: false, message: "Please provide data in body" });

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments, isDeleted } = data;

        if (!title) return res.status(400).send({ status: false, message: "Title is Required" });

        if (!isValid(title)) return res.status(400).send({ status: false, message: "Title is in wrong format" });

        if (!isValidTitle(title)) return res.status(400).send({ status: false, message: "Enter a valid title" });

        const checkTitle = await productModel.findOne({ title: title });

        if (checkTitle) return res.status(400).send({ status: false, message: "Title already exist" })


        if (!description) return res.status(400).send({ status: false, message: "Description is Required" });

        if (!isValidDescrption(description)) return res.status(400).send({ status: false, message: "description is in wrong format" });


        if (!price) return res.status(400).send({ status: false, message: "price is Required" });

        if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "Price of product should be valid positive numbers" });

        data.price = (price * 1).toFixed(2)

        if (currencyId || typeof currencyId == 'string') {

            if (!isValid(currencyId)) return res.status(400).send({ status: false, message: " currencyId should not be an empty string" });

            if (currencyId != "INR") return res.status(400).send({ status: false, message: " currencyId should be in 'INR' Format" });
        } else {
            data.currencyId = "INR"
        }

        if (currencyFormat || typeof currencyFormat == 'string') {

            if (!isValid(currencyFormat)) return res.status(400).send({ status: false, message: "Currency format of product should not be empty" });

            if (currencyFormat != "₹") return res.status(400).send({ status: false, message: "Currency format of product should be '₹'" });
        } else {
            data.currencyFormat = "₹"
        }


        if (isFreeShipping != null) {
            if (isFreeShipping.length > 0) {
                if (!(isFreeShipping.toLowerCase() === "true" || isFreeShipping.toLowerCase() === "false")) { return res.status(400).send({ status: false, message: "Please Provide only Boolean Value" }); }
                data["isFreeShipping"] = JSON.parse(isFreeShipping)
            }
            else { return res.status(404).send({ status: false, message: "Please Enter isFreeShipping Value " }) }
        }



        if (files.length == 0) return res.status(400).send({ status: false, message: "ProductImage is required" });

        if (files && files.length > 0) {
            if (!isValidImg(files[0].mimetype)) { return res.status(400).send({ status: false, message: "Image Should be of JPEG/ JPG/ PNG" }); }
        }


        let productImgUrl = await aws.uploadFile(files[0]);
        data.productImage = productImgUrl;


        if (style) {
            if (!isValid(style) || !isValidName(style)) return res.status(400).send({ status: false, message: "Style should be valid an does not contain numbers" });
        }

        if (!availableSizes) return res.status(400).send({ status: false, message: " availableSizes is Required" });


        if (availableSizes) {
            let size = availableSizes.replace(/\s+/g, "").toUpperCase().split(",").map(String)
            data.availableSizes = size;


            for (let i = 0; i < data.availableSizes.length; i++) {
                if (!isValidSize(data.availableSizes[i])) {
                    return res.status(400).send({ status: false, message: "Size should be one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" });
                }
            }
        }
        if (installments || typeof installments == 'string') {
            if (!isValidPrice(installments)) return res.status(400).send({ status: false, message: "Installments should be in number" });
            data.installments = Math.round(installments)
        }

        if (isDeleted != null) {
            if (isDeleted.length == 0)
                return res.status(400).send({ status: false, message: " isDeleted key is not required" });
            else data.isDeleted = false
        }

        let createProduct = await productModel.create(data);
        return res.status(201).send({ status: true, message: "Success", data: createProduct });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



//<<-----------------------------------------------Get Product  -------------------------------------------------------->>

const getProductByFilter = async (req, res) => {
    try {
        let data = { isDeleted: false }
        if (Object.keys(req.query).length === 0) {
            let productData = await productModel.find(data).sort({ price: 1 })

            if (productData.length == 0) return res.status(404).send({ status: false, message: `No Product data found` })

            return res.status(200).send({ status: true, message: 'Success', data: productData })
        }
        let { size, name, priceGreaterThan, priceLessThan, priceSort } = req.query


        //filtering through size key(availableSizes)
        if (size != null) {
            if (size.length > 0) {
                if (!isValid(size)) return res.status(400).send({ status: false, message: "Please Enter Size Value " });
                size = size.replace(/\s+/g, "").toUpperCase().split(",").map(String);
                for (let i = 0; i < size.length; i++) {
                    if (!isValidSize(size[i])) {
                        return res.status(400).send({ status: false, message: "Size should be one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" });
                    }
                }
                data["availableSizes"] = { $in: size };

            } else return res.status(400).send({ status: false, message: "Provide The size as u have selected" })
        }

        //filtering through name key(title)
        if (name != null) {
            if (name.trim().length > 0) {
                if (!isValid(name)) return res.status(400).send({ status: false, message: "Please Enter name Value " });
                data["title"] = name;
            } else {
                return res.status(400).send({ status: false, message: "Provide The name for selection", });
            }
        }

        //filtering through price key(price)

        if (priceGreaterThan != null) {
            if (priceGreaterThan.length > 0) {
                if (!/^[0-9]*$/.test(priceGreaterThan)) return res.status(400).send({ status: false, message: "priceGreaterThan should be in numbers" });
                data["price"] = { $gt: priceGreaterThan };
            } else return res.status(400).send({ status: false, message: "Provide The priceGreaterThan as u have selected", });

        }

        if (priceLessThan != null) {
            if (priceLessThan.length > 0) {
                if (!/^[0-9]*$/.test(priceLessThan)) return res.status(400).send({ status: false, message: "priceLessThan should be in numbers", });
                if (priceLessThan <= 0) { return res.status(400).send({ status: false, message: "priceLessThan can't be zero" }); }
                data["price"] = { $lt: priceLessThan };
            } else return res.status(400).send({ status: false, message: "Provide The priceLessThan as u have selected", });
        }

        if (priceGreaterThan && priceLessThan) {
            data["price"] = { $gt: priceGreaterThan, $lt: priceLessThan };
        }

        let x = 1
        if (priceSort != null) {
            if (priceSort == "1" || priceSort == "-1") x = priceSort
            else return res.status(400).send({ status: false, message: "price should be in numbers and value will be 1 or -1" });
        }
        //finding data from DB
        const getData = await productModel.find(data).sort({ price: x });
        if (getData.length == 0) return res.status(404).send({ status: false, message: "No Data Found With These Filters" });

        return res.status(200).send({ status: true, data: getData });
    } catch (err) {
        console.log(err.message)
        res.status(500).send({ status: false, message: err.message })
    }

}





//<<-----------------------------------------------Get Product  -------------------------------------------------------->>

const getProductById = async (req, res) => {
    try {
        let productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Product id is not in correct format" })

        const result = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!result) return res.status(404).send({ status: false, message: `No product available with this ${productId} product Id` })

        return res.status(200).send({ status: true, message: "Success", data: result })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



//<<-----------------------------------------------update Product  -------------------------------------------------------->>

const updateProduct = async (req, res) => {
    try {
        const updatedData = req.body
        const productId = req.params.productId
        let files = req.files;


        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Invalid ProductId" })

        const checkProduct = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!checkProduct) return res.status(404).send({ status: false, message: "product not found" })

        if (!isValidRequestBody(updatedData)) return res.status(400).send({ status: false, message: "please provide product details to update" })
        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments, productImage } = updatedData

        const updatedProductDetails = {}

        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: `Title is required` })
        }
        if (title) {
            if (!isValidTitle(title)) return res.status(400).send({ status: false, message: "Enter a valid title" });
            const checkTitle = await productModel.findOne({ title: title });

            if (checkTitle) { return res.status(400).send({ status: false, message: ` Title is already used` }) }

            updatedProductDetails['title'] = title
        }

        if (!isValidDescrption(description)) {
            return res.status(400).send({ status: false, message: `Description is required` })
        }

        if (description) {
            updatedProductDetails['description'] = description
        }
       
        price = Number(price)
        if (typeof price!="number"&&price != null) {
            return res.status(400).send({ status: false, message: `Please enter value of price` })
        }
    
        if (price) {
            if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "Price of product should be valid positive numbers" });

           price = (price * 1).toFixed(2)  //fixing to 2 decimal number
            updatedProductDetails['price'] = price
        }

        if (!isValid(currencyId)) {
            return res.status(400).send({ status: false, message: `currencyId is required` })
        }

        if (currencyId) {
            if (currencyId != "INR") {
                return res.status(400).send({ status: false, message: 'currencyId should be a INR' })
            }

            updatedProductDetails['currencyId'] = currencyId;
        }

        if (!isValid(currencyFormat)) {
            return res.status(400).send({ status: false, message: `please enter value of currency format {₹}` })
        }

        if (currencyFormat) {
            if (currencyFormat != "₹") {
                return res.status(400).send({ status: false, message: "Please provide currencyFormat in format ₹ only" })
            }
            updatedProductDetails['currencyFormat'] = "₹"
        }

        if (isFreeShipping != null) {
            if (isFreeShipping.length > 0) {
                if (!(isFreeShipping.toLowerCase() === "true" || isFreeShipping.toLowerCase() === "false")) { return res.status(400).send({ status: false, message: "Please Provide only Boolean Value for isFreeShipping" }); }
                updatedProductDetails['isFreeShipping'] = JSON.parse(isFreeShipping)
            }
            else { return res.status(404).send({ status: false, message: "Please Enter isFreeShipping Value " }) }
        }

        if (productImage != null) {
            return res.status(400).send({ status: false, message: "Please enter the vlaue of productImag && Image Should be of JPEG/ JPG/ PNG" });
        }

        if (files && files.length > 0) {
            if (!isValidImg(files[0].mimetype)) return res.status(400).send({ status: false, message: "Image Should be of JPEG/ JPG/ PNG" });
            
            let updatedproductImage = await aws.uploadFile(files[0]);
            updatedProductDetails.productImage = updatedproductImage
        }


        if (!isValid(style)) {
            return res.status(400).send({ status: false, message: `Enter the value of style` })
        }

        if (style) {

            updatedProductDetails['style'] = style
        }


        if (availableSizes != null) {
            if (availableSizes.length > 0) {
                if (!isValid(availableSizes)) return res.status(400).send({ status: false, message: "Please Enter Size Value " });
                size = availableSizes.replace(/\s+/g, "").toUpperCase().split(",").map(String);
                for (let i = 0; i < size.length; i++) {
                    if (!isValidSize(size[i])) {
                        return res.status(400).send({ status: false, message: "Size should be one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" });
                    }
                }
                updatedProductDetails['availableSizes'] = size

            } else return res.status(400).send({ status: false, message: "Provide The size as u have selected" })
        }



        if (!isValid(installments)) {
            return res.status(400).send({ status: false, message: `Please enter the value for installment` })
        }
        if (installments) {

            if (!isValidPrice(installments)) {
                return res.status(400).send({ status: false, message: `installments should be a valid positive number` })
            }

            updatedProductDetails['installments'] = installments
        }

        const updatedProduct = await productModel.findOneAndUpdate(
            { _id: productId },
            updatedProductDetails,
            { new: true })

        return res.status(200).send({ status: true, message: 'Product details updated successfully.', data: updatedProduct });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}









//<<-----------------------------------------------Delete Product  -------------------------------------------------------->>
const deleteProductById = async (req, res) => {

    try {
        let productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Product id is not in correct format" })
        let deleteProduct = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true })
        if (!deleteProduct) return res.status(404).send({ status: false, message: 'product not found :)' })
        return res.status(200).send({ status: true, message: "Product deleted successfull" })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


module.exports = { createProducts, getProductByFilter, getProductById, updateProduct, deleteProductById };