const mongoose=require('mongoose');
require('dotenv').config();

// Define mongodb connection url
// const mongoURL= process.env.DB;
const mongoURL= process.env.DBURL_LOCAL;

// setup connection
mongoose.connect(mongoURL,{
    useNewUrlParser: true,
    useUnifiedTopology: true
})

// Mongoos maintains a default connection object representing the MongoDB connection
const db= mongoose.connection;

// Define event listeners for databse connection

db.on('connected',()=>{
    console.log("Connected to MongoDb server");
})

db.on('Disconnected',()=>{
    console.log("Disconnected from MongoDb server");
})

db.on('Error',()=>{
    console.log("Error");
})

// Export db object to use mongodb connection in node js application

module.exports=db;
