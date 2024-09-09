const mongoose=require('mongoose');

const requestSchema=new mongoose.Schema({
    time:{
        type:Date,
        default:Date.now()
    },
    requester:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    approver:[
        {type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }],
    status:{
        type:String,
        enum:['Accepted','Rejected','Pending'],
        default:'Pending'
    },
    entityID:{  
        type:mongoose.Schema.Types.ObjectId,
        ref:'Entity'
    }
});

const Request=mongoose.model('Request',requestSchema);
module.exports=Request;