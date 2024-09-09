const express=require('express');
const mongoose=require('mongoose'); 
require('dotenv').config();
const nodejsmailer=require('nodemailer');
const User=require('./../models/user');
const Entity = require('./../models/entity');
const Department = require('../models/department');
const userGroup=require('../models/userGroup');
const UserOTPVerification=require('./../models/userOTPVerification');
const router=express.Router();
const {jwtAuthMiddleWare, generateToken}= require('./../JWT');

// send an Email from NODEJS Server using nodemailer module


var transporter = nodejsmailer.createTransport({
    service:'gmail',
    auth:{
        user:'tusharjoshi11046@gmail.com',
        pass:'rvjywxaakuuijeej'  
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
// sign up the admin
router.post('/signup/admin',async (req,res)=>{
    try{

        if(await User.findOne({role:'admin'})){
            return res.status(400).json({error: 'Admin already registered, Multiple admins not Authorized!'});
        }

        const data=req.body;
        const admin=new User(data);

        if(admin.role!='admin'){
            return res.status(400).json({error: 'Only Admin Singup Allowed!'});
        }

        admin.managerID=null;
        admin.departmentID=null;

        const response=await admin.save();
        // await sendOTPVerification(response.email,response.id);

        const Payload={
            id:response.id
        }

        console.log(JSON.stringify(Payload));
        const token=generateToken(Payload);
        console.log("ID is: ",response.id);

        res.status(200).json({response: response, token: token});

    }catch(error){
        console.log(error);
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

        if(newUser.role=='admin'){
            newUser.managerID=null;
            newUser.departmentID=null;
        }else if(newUser.managerID==null || newUser.departmentID==null){
            return res.status(404).json({error: "Department and Manager ID required!"});
        }

        const response = await newUser.save();

        // const emailOTP=await sendOTPVerification(response.email,response.id);

        // console.log(emailOTP);

        console.log("Data Saved");

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
        // const data=req.body;

        const user=await User.findById(userID);
        const newOTPVerification=await UserOTPVerification.findOne({userID: userID});
        
        console.log({user: user});

        if(!user || !newOTPVerification){
            res.status(500).json({error: 'Invalid user ID'});
        }

        if(!await newOTPVerification.compareOTP(data.otp)){
            return res.status(401).json({error: "Invalid OTP: OTP Authentication Failed"});
        }

        user.verified=true;

        if(user.role!='admin'){
            const departmentID=user.departmentID;
            const department=await Department.findById(departmentID);
            department.members.push(userID);/// if not correlated, remove

            const response1=await department.save();

            if(!response1){
                res.status(400).json({Error: "Internal Server Error"});
            }
        }

        const immediateManagerID=user.managerID;
        const immediateManager=await User.findById(immediateManagerID);

        if(immediateManager.designation=='CEO'){
            const departmentID=user.departmentID;
            const department=await Department.findById(departmentID);
            console.log(department.entities);
            user.entityOwned=department.entities;
            department.manager=userID;
            
            await department.save();
        }

        const response2=await user.save();

        if(!response2){
            return res.status(400).json("Internal Server Error!");
        }

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

        if(user.status=='Inactive' || user.verified=='false'){
            return res.status(400).json({message: "User marked as Inactive or not Verified!"});
        }

        const Payload={
            id:user.id
        }

        const token=generateToken(Payload);

        res.json({token})
    }catch(err){
        console.log(err);
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
router.post('/changeManager/:managerID',jwtAuthMiddleWare,async (req,res)=>{
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
        console.log(newManager);

        if(!newManager){
            return res.status(400).json({message: "Invalid New Manager ID!"});
        }

        // check if the old manager is the manager or not till now
        const departmentID=oldManager.departmentID;
        const department=await Department.findById(departmentID);

        if(department.manager!=oldManagerID){
            return res.status(400).json({message: "Invalid Manager ID to be changed!"})
        }

        //update subordinates manager
        await User.updateMany(
            {managerID:oldManagerID},
            {$set:{managerID:newManagerID}}
        )

        oldManager.designation='Undefined';

        // transfer old manager's entities to new manager
        console.log(department.entities);
        await User.updateOne(
            {id:newManagerID},
            {$set:{entityOwned:department.entities}}
        )
        
        console.log(newManager.entities);

        // change departments manager
        await Department.updateOne(
            {id:departmentID},
            {$set:{manager:newManagerID}}
        )

        res.status(200).json({message: "Manager Changed Successfully!"});

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
        const deleteUser=await User.find(deleteUserID);

        if(await User.find({managerID:deleteUser})){
            return res.status(400).json({message: "The user to be deleted has employees under his/her management, assign them another manager first!"});
        }

        const response=await Department.updateMany(
            { members: deleteUserID },    
            { $pull: { members: deleteUserID  } }
        );

        if(!response){
            return res.status(200).json({message: "User cannot be removed from the department"});
        }
        
        const response1=await Entity.updateMany(
            {sharedBy:deleteUserID},
            {$pull:{sharedBy:deleteUserID}}
        );

        if(!response1){
            return res.status(200).json({message: "User cannot be removed from entity records"});
        }

        deleteUser.status='Inactive';

        await deleteUser.save();

        res.status(200).json({message: "User solft deletion successfull!"});
        
    }catch(error){
        console.error(err);
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
        const deleteUser=await User.find(deleteUserID);

        if(await User.find({managerID:deleteUserID})){
            return res.status(400).json({message: "The user to be deleted has employees under his/her management, assign them another manager first!"});
        }

        const response=await Department.updateMany(
            { members: deleteUserID },
            { $pull: { members: deleteUserID  } }
        );

        if(!response){
            return res.status(200).json({message: "User cannot be removed from the department"});
        }
        
        const response1=await Entity.updateMany(
            {sharedBy:deleteUserID},
            {$pull:{sharedBy:deleteUserID}}
        );

        if(!response1){
            return res.status(200).json({message: "User cannot be removed from entity records"});
        }

        const deletion=await User.findByIdAndDelete(deleteUserID);

        if(!deletion){
            return res.status(200).json({message: "User cannot be deleted"});
        }

        res.status(200).json({message: "User solft deletion successfull!"});
        
    }catch(error){
        console.error(err);
        res.status(500).json({error:"Internal Server error"});
    }
})

// introduce an intermmediate manager between 2 people

router.get('intermmediate/manger/:subordinateID',jwtAuthMiddleWare,async(req,res)=>{
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

        const intermManagerID=req.body;
        const intermManager=await User.findById(intermManagerID);

        if(!intermManager){
            return res.status(400).json({message: "Invalid Intermmediate manager ID"});
        }

        intermManager.managerID=subordinate.managerID;
        subordinate.managerID=interManager.id;

        await intermManager.save();
        await subordinate.save();

        res.status(200).json({message: "Intermmediate Manager Added"});
    }catch(error){
        console.error(err);
        res.status(500).json({error:"Internal Server error"});
    }
})

// add a member to user group
router.post('/addUserGroup/:userGroupID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const adminID=req.user.id;
        const admin=await User.find(adminID);

        if(admin.role!='admin'){
            return res.status(500).json({message: "Unauthorized access: Only admin allowed!"});
        }

        const usergroupID=req.params.userGroupID;
        const usergroup=await userGroup.findById(usergroupID);

        if(!usergroup){
            return res.status(500).json({message: "Invalid User Group ID!"});
        }
        const userID=req.body;
        const user=await User.findById(userID);

        if(!user){
            return res.status(500).json({message: "Invalid user ID!"});
        }

        if(userGroup.members.includes(userID)){
            return res.status(500).json({message: "User is already a part of the group."});
        }

        await userGroup.updateOne(
            {id:usergroupID},
            {$push:{members:userID}}
        );

        // add the entities of the group to the user
        const newEntities = userGroup.entities.filter(entity => !user.entityOwned.includes(entity));

        if(newEntities.length>0){
            user.entityOwned.push(newEntities);
        }

        res.status(200).json({message: "User successfully added to the group!"});

    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})

// remove a user from a user group
router.delete('/removeUser/:userGroupID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const adminID=req.user.id;
        const admin=await User.find(adminID);

        if(admin.role!='admin'){
            return res.status(500).json({message: "Unauthorized access: Only admin allowed!"});
        }

        const usergroupID=req.params.userGroupID;
        const usergroup=await userGroup.findById(usergroupID);

        if(!usergroup){
            return res.status(500).json({message: "Invalid User Group ID!"});
        }
        const userID=req.body;
        const user=await User.findById(userID);

        if(!user){
            return res.status(500).json({message: "Invalid user ID!"});
        }

        if(!userGroup.members.includes(userID)){
            return res.status(500).json({message: "User is already not a part of the group."});
        }

        await userGroup.updateOne(
            {id:usergroupID},
            {$pull:{members:userID}}
        );

        // remove the entities of the group from the user
        userGroup.entities.filter(entity => !user.entityOwned.includes(entity));

        res.status(200).json({message: "User successfully removed from the group"});


    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})


module.exports=router;