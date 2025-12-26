require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PinataSDK } = require("pinata")

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT, 
    pinataGateway: "rose-given-sailfish-633.mypinata.cloud"
})

module.exports = pinata