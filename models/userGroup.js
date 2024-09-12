const mongoose=require('mongoose');

const userGroupSchema=new mongoose.Schema({
    name:{
        type:String,
        unique:true,
        required:true
    },
    departmentID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Department',
        required:true
    },
    managerID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    entities:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Entity',
        }  
    ],
    members:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        }  
    ]
});

const userGroup=mongoose.model('userGroup',userGroupSchema);
module.exports=userGroup;