const express=require('express');
require('dotenv').config();
const nodejsmailer=require('nodemailer');
const User=require('./../models/user');
const Department = require('../models/department');
const UserOTPVerification=require('./../models/userOTPVerification');
const router=express.Router();
const {jwtAuthMiddleWare, generateToken}= require('./../JWT');

// send an Email from NODEJS Server using nodemailer module

var transporter = nodejsmailer.createTransport({
    service:'gmail',
    auth:{
        user:'tusharjoshi11046@gmail.com',
        pass:'pmrr lptd osxg nkri'  
    }
});

//sends the mail
const sendOTPVerification = async (email,id) => {
    const OTP= `${Math.floor(1000+Math.random()*9000)}`
    
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Sending Email to Tushar Joshi",
        text: "Welcome to NodeMailer, It's Working",
        html: `<p>The OTP for user Verification is ${OTP}. Complete the Signup by entering this OTP </p>`,
    };

    const newOTPVerification=new UserOTPVerification({
        userID: id,
        otp:OTP,
        createdAt: Date.now(),
        expiresAt: Date.now()+36000
    })

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);

        await newOTPVerification.save();
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // Re-throw error for further handling
    }
};

// signup an admin
router.post('/admin/signup',async (req,res)=>{
    try{
        const data=req.body;

        const newUser=new User(data);

        if(newUser.role=='admin'){
            newUser.managerID=null;
            newUser.departmentID=null;
        }else{
            return res.status(400).json({error: "Only admin signup allowed in this route"});
        }

        const response=await newUser.save();

        await sendOTPVerification(response.email,response.id);

        const Payload={
            id:response.id
        }

        console.log(JSON.stringify(Payload));
        const token=generateToken(Payload);
        console.log("Token is: ",token);
        console.log("ID is: ",response.id);

        res.status(200).json({response: response, token: token});

    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})
// Sign up a new User
router.post('/signup',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const data=req.body;  
        const user=await User.findById(req.user.id);

        if(user.role!='admin'){
            return res.status(404).json({error: 'Access Rejected, only Admins allowed!'});
        }

        const newUser=new User(data);

        if(newUser.role=='admin' || newUser.designation=='CEO'){
            newUser.managerID=null;
            newUser.departmentID=null;
        }else if(newUser.managerID==null || newUser.departmentID==null){
            return res.status(404).json({error: "Department and Manager ID required!"});
        }

        const response= await newUser.save();

        await sendOTPVerification(response.email,response.id);

        const Payload={
            id:response.id
        }

        console.log(JSON.stringify(Payload));
        const token=generateToken(Payload);
        console.log("Token is: ",token);
        console.log("ID is: ",response.id);

        res.status(200).json({response: response, token: token});

    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// Email OTP Verification
router.post('/verification',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;

        const data = req.body;

        const user=await User.findById(userID);

        if(user.verified==true){
            return res.status(400).json({message: "User already verified!"});
        }
        const newOTPVerification=await UserOTPVerification.findOne({userID: userID});

        if(!user || !newOTPVerification){
            res.status(500).json({error: 'Invalid user ID'});
        }

        if(!user){
            res.status(500).json({error: 'Invalid user ID'});
        }

        if(!await newOTPVerification.compareOTP(data.otp)){
            return res.status(401).json({error: "Invalid OTP: OTP Authentication Failed"});
        }

        user.verified=true;

        if(user.role!='admin' && user.designation!='CEO'){

            const immediateManager=await User.findById(user.managerID);

            if(immediateManager.designation == 'CEO' ){
                
                const departmentID = user.departmentID;
                const department = await Department.findById(departmentID);
                user.entityOwned = department.entities;
                department.manager=userID;
            
                await department.save();
            }
        }

        await user.save();


        res.status(200).json("OTP Authentication Successfull");
    }catch(error){
        console.log(error);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// Login a new User
router.post('/login',async (req,res)=>{
    try{
        const {aadhar,password}=req.body;

        const user=await User.findOne({aadhar:aadhar});
        
        if(!user || !(await user.comparePassword(password))){
            return res.status(401).json({error: 'Invalid username or password'});
        } 
        
        console.log("User Verfied: ",user.verified);

        if(user.status=='Inactive' || user.verified==false){
            return res.status(400).json({message: "User marked as Inactive or not Verified!"});
        }

        const Payload={
            id:user.id
        }

        const token=generateToken(Payload);

        res.json({token})
    }catch(error){
        console.log(error);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// Update Password
router.put('/profile/password',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id; // extract id from the token

        const {currentPassword,newPassword}=req.body; // extract current and new password from request body

        // check if user is present
        const user=await User.findById(userID);

        if(user.status=='Inactive'){
            return res.status(400).json({message: "User marked as inactive!"});
        }

        if(!(await user.comparePassword(currentPassword))){
            return res.status(401).json({error: 'Invalid username or password'});
        }

        user.password=newPassword;
        await user.save();

        console.log('Password updated!');
        res.status(200).json({message: 'Password updated'});
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Internal Server error"});
    }
})

// replace a manager
router.put('/changeManager/:managerID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: "User do not exist!"});
        }

        if(user.role!='admin' ){
            return res.status(400).json({message:"Only Admin Authorized"});
        }


        const oldManagerID=req.params.managerID;
        const oldManager=await User.findById(oldManagerID);

        if(!oldManager){
            return res.status(400).json({message: "Invalid Old Manager ID!"});
        }

        const data=req.body;
        const newManagerID=data.newManagerID;
        const newManager=await User.findById(newManagerID);

        if(!newManager){
            return res.status(400).json({message: "Invalid New Manager ID!"});
        }

        //update subordinates manager
        await User.updateMany(
            {managerID:oldManagerID},
            {$set:{managerID:newManagerID}}
        )
        
        newManager.designation=oldManager.designation;
        oldManager.designation='Undefined';

        // transfer old manager's entities to new manager
        newManager.entityOwned=oldManager.entityOwned;
        oldManager.entity=[];

        // change new manager's manager to old manager's manager
        newManager.managerID=oldManager.managerID;
        
        // check for department manager change
        const dpt=await Department.findOne({manager:oldManagerID});

        if(dpt){
            dpt.manager=newManagerID;
            await dpt.save();
        }

        await newManager.save();
        await oldManager.save();

        res.status(200).json({message: "Manager Changed Successfully!"});

    }catch(error){
        console.error(error);
        res.status(500).json({error:"Internal Server error"});
    }
})

// Hard delete a user
router.delete('/hardDelete/:userID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: "User do not exist!"});
        }

        if(user.role!='admin' ){
            return res.status(400).json({message:"Only Admin Authorized"});
        }

        const deleteUserID=req.params.userID;

        if(await User.findOne({managerID:deleteUserID})){
            return res.status(400).json({message: "The user to be deleted has employees under his/her management, assign them another manager first!"});
        }

        const deletion=await User.findByIdAndDelete(deleteUserID);

        if(!deletion){
            return res.status(200).json({message: "User cannot be deleted"});
        }

        res.status(200).json({message: "User Hard deletion successfull!"});
        
    }catch(error){
        console.error(error);
        res.status(500).json({error:"Internal Server error"});
    }
})

// introduce an intermmediate manager between 2 people
router.post('/intermmediateManager/:subordinateID',jwtAuthMiddleWare,async(req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({error: "Invalid User Login!"});
        }

        if(user.role!='admin'){
            return res.status(400).json({message: "Unauthorized Access!"});
        }

        subordinateID=req.params.subordinateID;
        const subordinate=await User.findById(subordinateID);

        if(!subordinate){
            return res.status(400).json({message: "Invalid Subordiante ID!"});
        }
        const data=req.body;
        const intermManagerID=data.intermManagerID;
        const intermManager=await User.findById(intermManagerID);

        if(!intermManager){
            return res.status(400).json({message: "Invalid Intermmediate manager ID"});
        }

        intermManager.managerID=subordinate.managerID;
        subordinate.managerID=intermManager.id;

        await intermManager.save();
        await subordinate.save();

        res.status(200).json({message: "Intermmediate Manager Added"});
    }catch(error){
        console.error(error);
        res.status(500).json({error:"Internal Server error"});
    }
})

// Soft delete a user
router.delete('/softDelete/:userID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: "User do not exist!"});
        }

        if(user.role!='admin' ){
            return res.status(400).json({message:"Only Admin Authorized"});
        }

        const deleteUserID=req.params.userID;
        const deleteUser=await User.findById(deleteUserID);

        if(deleteUser.status=='Inactive'){
            return res.status(400).json({message: 'User already Inactive'});
        }

        // check for subordinates
        if(await User.findOne({managerID:deleteUserID})){
            return res.status(400).json({message: "The user to be deleted has employees under his/her management, assign them another manager first!"});
        }

        deleteUser.status='Inactive';

        await deleteUser.save();

        res.status(200).json({message: "User solft deletion successfull!"});
        
    }catch(error){
        console.error(error);
        res.status(500).json({error:"Internal Server error"});
    }
})


module.exports=router;