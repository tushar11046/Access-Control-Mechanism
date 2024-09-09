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
        userID=req.user.id;

        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({error: "Invalid user Login!"});
        }

        if(!user.role!='admin'){
            return res.status(400).json({message: "Unauthorized Access: only Admin allowed"});
        }

        const data=req.body;
        const newUserGroup=new userGroup(data);

        if(!await Department.find(newUserGroup.departmentID)){
            return res.status(400).json({message: "Invalid Department ID!"});
        }

        if(!await userGroup.find(newUserGroup.managerID)){
            return res.status(400).json({message: "Invalid Manager ID!"});
        }
        
    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})

// delete a User Group
router.delete('/delete/:userGroupID',jwtAuthMiddleWare,async(req,res)=>{
    try{
        userID=req.user.id;

        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({error: "Invalid user Login!"});
        }

        if(!user.role!='admin'){
            return res.status(400).json({message: "Unauthorized Access: only Admin allowed"});
        }

        const data=req.body;
        const newUserGroup=new userGroup(data);

        if(!await Department.find(newUserGroup.departmentID)){
            return res.status(400).json({message: "Invalid Department ID!"});
        }
    }catch(error){
        console.log(error);
        return res.status(500).json({error: "Internal Server Error!"});
    }
})

module.exports=router;