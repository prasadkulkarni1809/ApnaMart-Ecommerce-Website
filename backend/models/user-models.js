    const mongoose = require('mongoose');



    const userSchema =mongoose.Schema({
    fullname:String,
    email:String,
    password:String,
    cart: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true
      },
      quantity: {
        type: Number,
        default: 1
      }
    }
  ],

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
      }
    ],

    orders:{
        type:Array,
        default:[]
    },
    contact: String,
    picture :String,
    addresses: [
      {
        label: {
          type: String,
          trim: true,
          default: "Home",
        },
        name: {
          type: String,
          trim: true,
          required: true,
        },
        phone: {
          type: String,
          trim: true,
          required: true,
        },
        address: {
          type: String,
          trim: true,
          required: true,
        },
        city: {
          type: String,
          trim: true,
          required: true,
        },
        state: {
          type: String,
          trim: true,
          default: "",
        },
        pincode: {
          type: String,
          trim: true,
          required: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    });

    module.exports = mongoose.model("user",userSchema);
