const mongoose=require('mongoose');
const bcrypt=require('bcrypt');

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    age:{
        type:Number
    },
    aadhar:{
        type:Number,
        required:true
    },
    mobile:{
        type:Number,
        unique:true,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true           
    },
    departmentID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Department'
    },
    managerID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    role:{
        type:String,
        enum:['user','admin'],
        required:true
    },
    password:{
        type:String,
        unique:true,
        required:true
    },
    entityOwned:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Entity'
        }
    ],
    designation:{
        type:String
    },
    verified:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:['Active','Inactive'],
        default:'Active'
    },
    group:{
        type:String,
        default:null,
        unique:false
    }
});

userSchema.pre('save',async function(next){
    const user = this;

    // Hash the password only if it has been modified or is new
    if(!user.isModified('password')) return next();

    try{
        // hash password generation
        const salt = await bcrypt.genSalt(10);

        const hashedPassword=await bcrypt.hash(user.password,salt);

        // Override the plain password with the hashed one
        user.password=hashedPassword;
        next();
    }catch(err){
        return next(err);
    }
})

userSchema.methods.comparePassword=async function(candidatePassword){
    try{
        //Use bcrypt to compare the provided password with the hashed password
        const isMatch=await bcrypt.compare(candidatePassword,this.password);
        return isMatch;
    }catch(err){
        throw err;
    }
}

const User=mongoose.model('User',userSchema);
module.exports=User;