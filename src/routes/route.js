const express = require("express")
const router = express.Router();
const {createUserDocument, userLogin, getUser, updateUser } = require("../controller/userController")
const { createProducts, getProductByFilter, getProductById, updateProduct, deleteProductById } = require("../controller/productController")
const {deleteCart, addCart, getCart, updateCart} = require("../controller/cartController")
const {createUserOrder, updateOrder} = require("../controller/orderController")
const {authentication} = require("../middleware/auth")

//<--------------------User Api's---------------------------->
router.post("/register", createUserDocument)
router.post("/login", userLogin)
router.get("/user/:userId/profile", authentication, getUser)
router.put("/user/:userId/profile", authentication, updateUser);


//<--------------------Product Api's---------------------------->

router.post("/products", createProducts)
router.get("/products", getProductByFilter)
router.get("/products/:productId", getProductById)
router.put("/products/:productId", updateProduct)
router.delete("/products/:productId", deleteProductById)


//<--------------------Cart Api's---------------------------->
router.post("/users/:userId/cart", authentication, addCart)
router.get("/users/:userId/cart", authentication, getCart)
router.put("/users/:userId/cart", authentication, updateCart)
router.delete("/users/:userId/cart", authentication, deleteCart)


//<--------------------Order Api's---------------------------->
router.post("/users/:userId/orders", authentication, createUserOrder)
router.put("/users/:userId/orders",authentication, updateOrder)





module.exports = router