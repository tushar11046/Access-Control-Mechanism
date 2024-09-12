const mongoose=require('mongoose');

const entitySchema=new mongoose.Schema({
    departmentID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Department',
        required:true
    },
    departmentName:{
        type:String,
        required:true
    },
    name:{
        type:String,
        unique:true,
        required:true
    },
    status:{
        type:String,
        enum:['Active','Inactive'],
        default:'Active'
    }
});

const Entity=mongoose.model('Entity',entitySchema);
module.exports=Entity;