const mongoose=require('mongoose')

const UserOTPVerficationSchema=new mongoose.Schema({
    userID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    otp:{
        type:String
    },
    createdAt:{
        type:Date
    },
    expiresAt:{
        type:Date
    }
})

UserOTPVerficationSchema.methods.compareOTP=async function(otp){
    try{
        return (String(this.otp) === String(otp));
    }catch(err){
        throw err;
    }
}

const UserOTPVerification=mongoose.model('UserOTPVerification',UserOTPVerficationSchema);
module.exports=UserOTPVerification;