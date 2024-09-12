const mongoose=require('mongoose');

const departmentSchema=new mongoose.Schema({
    name:{
        type:String,
        unique:true,
        required:true
    },
    manager:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    entities:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Entity'
        }  
    ]
});

const Department=mongoose.model('Department',departmentSchema);
module.exports=Department;