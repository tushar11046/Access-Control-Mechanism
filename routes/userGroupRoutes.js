const express=require('express');
require('dotenv').config();
const User=require('./../models/user');
const Department = require('../models/department');
const router=express.Router();
const {jwtAuthMiddleWare}= require('./../JWT');
const userGroup = require('../models/userGroup');

// create a User Group
router.post('/create',jwtAuthMiddleWare,async(req,res)=>{
    try{
        const userID=req.user.id;

        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({error: "Invalid user Login!"});
        }

        if(user.role!='admin'){
            return res.status(400).json({message: "Unauthorized Access: only Admin allowed"});
        }

        const data=req.body;
        const newUserGroup=new userGroup(data);

        if(!await Department.findById(newUserGroup.departmentID)){
            return res.status(400).json({message: "Invalid Department ID!"});
        }

        if(!await User.find(newUserGroup.managerID)){
            return res.status(400).json({message: "Invalid Manager ID!"});
        }

        newUserGroup.members.push(newUserGroup.managerID);
        
        await newUserGroup.save();
        const manager=await User.findById(data.managerID);
        manager.group=newUserGroup.id;

        manager.save();

        return res.status(200).json({message: "User Group successfully created!"});
        
    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})

// delete a User Group
router.delete('/delete/:userGroupID',jwtAuthMiddleWare,async(req,res)=>{
    try{
        userID=req.user.id;
        const userGroupID=req.params.userGroupID;

        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({error: "Invalid user Login!"});
        }

        if(user.role!='admin'){
            return res.status(400).json({message: "Unauthorized Access: only Admin allowed"});
        }

        await userGroup.findByIdAndDelete(userGroupID);

        return res.status(200).json({message: "Group successfully Deleted!"});

    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})

// add a member to user group
router.post('/addUser/:userGroupID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const adminID=req.user.id;
        const admin=await User.findById(adminID);

        if(admin.role!='admin'){
            return res.status(500).json({message: "Unauthorized access: Only admin allowed!"});
        }

        const usergroupID=req.params.userGroupID;
        const usergroup=await userGroup.findById(usergroupID);

        if(!usergroup){
            return res.status(500).json({message: "Invalid User Group ID!"});
        }
        const data=req.body;
        const userID=data.userID;
        const user=await User.findById(userID);

        if(!user){
            return res.status(500).json({message: "Invalid user ID!"});
        }

        if(usergroup.members.includes(userID)){
            return res.status(500).json({message: "User is already a part of the group."});
        }

        console.log(usergroupID);
        user.group=usergroupID;
        user.save();

        usergroup.members.push(userID);

        await usergroup.save();

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
        const admin=await User.findById(adminID);

        if(admin.role!='admin'){
            return res.status(500).json({message: "Unauthorized access: Only admin allowed!"});
        }

        const usergroupID=req.params.userGroupID;
        const usergroup=await userGroup.findById(usergroupID);

        if(!usergroup){
            return res.status(500).json({message: "Invalid User Group ID!"});
        }

        const data=req.body;
        const userID=data.userID;
        const user=await User.findById(userID);

        if(!user){
            return res.status(500).json({message: "Invalid user ID!"});
        }

        if(!usergroup.members.includes(userID)){
            return res.status(500).json({message: "User is already not a part of the group."});
        }

        console.log(usergroup);

        const check=await userGroup.updateOne(
            {_id:usergroupID},
            {$pull:{members:userID}}
        );
        console.log(check);

        if(!check){
            return res.status(500).json({message: "user not removed!"});
        }

        if(String(userID)==(String)(usergroup.managerID)){
            usergroup.managerID=null;
        }

        user.group=null;
        await user.save();

        await usergroup.save();

        res.status(200).json({message: "User successfully removed from the group"});


    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})

module.exports=router;