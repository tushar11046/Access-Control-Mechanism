const express=require('express');
const User=require('./../models/user');
const Entity=require('./../models/entity');
const Request=require('./../models/request');
const Department=require('./../models/department');
const router=express.Router();
const {jwtAuthMiddleWare}= require('./../JWT');

// create a request
router.post('/generate',jwtAuthMiddleWare,async(req,res)=>{
    try{
        const userid=req.user.id;

        const user=await User.findById(userid);

        if(!user){
            return res.status(404).json({Message: "No such user found"});
        }

        if(user.role=='admin'){
            return res.status(404).json({Message: "Admin not authorized to generate Request"});
        }

        if(user.status=='Inactive'){
            return res.status(404).json({Message: "Inactive User's not allowed to make requests!"});
        }

        const data=req.body;
        const newRequest=new Request(data);
        const entity=await Entity.findById(newRequest.entityID);

        if(!entity){
            return res.status(404).json({Message: "Entity does not exist"});
        }
        
        if(entity.status=='Inactive'){
            return res.status(404).json({Message: "Invalid Entity ID: The Entity do not exist!"});
        }

        if(String(entity.departmentID)!=String(user.departmentID)){
            return res.status(404).json({Message:'Invaid Request: Entity does not belong to the your Department'});
        }

        // check for duplicate request
        const sameRequest=await Request.find({requester:userid},{entityID:newRequest.entityID});

        if(sameRequest && sameRequest.status=='Pending'){
            return res.status(404).json({Message: 'Request already made, status: Pending'});
        }

        newRequest.approver=user.managerID;
        newRequest.requester=userid;
        
        const response=await newRequest.save();

        if(!response){
            return res.status(404).json({message: "Request could not be Generated,"+" Error: "+response});
        }

        return res.status(404).json({message: "Request successfully Generated!, Request ID: "+response.id});

    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// Accept the request
router.post('/accept/:requestID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: 'Invalid User'});
        }

        if(user.role=='admin'){
            return res.status(404).json({message: 'Admin cannot accept or reject any request'});
        }

        const requestID=req.params.requestID;
        const request=await Request.findById(requestID);

        if(String(userID)!=(String)(request.approver)){
            return res.status(404).json({message: 'Only the immediate Manager can approve the request'});
        }

        const entityID=request.entityID;
        const entity=await Entity.findById(entityID);

        if(!entity){
            return res.status(404).json({message: "Invalid entity ID"});
        }

        if(entity.status=='Inactive'){
            return res.status(404).json({message: "Entity does not Exist or Inactive"});
        }

        const requester=await User.findById(request.requester);

        if(requester.status=='Inactive'){
            return res.status(404).json({message: "Requester is marked as Inactive cannot approve the request"});
        }

        request.status='Accepted';

        requester.entityOwned.push(entityID);
        
        await requester.save();
        await request.save();


        return res.status(200).json({message:"Request successfully accepted!"});
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// Reject the request

router.post('/reject/:requestID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        if(user.role=='admin'){
            return res.status(404).json({message: 'Admin cannot accept or reject any request'});
        }

        requestID=req.params.requestID;

        const request=await Request.findById(requestID);

        if(userID!=request.approver){
            return res.status(404).json({message: 'Only manager can approve or reject the request'});
        }

        const requesterID=request.requester;
        const requester=await User.findById(requesterID)

        if(!requester || requester.status=='Inactive'){
            return res.status(404).json({message: 'Requester is Inactive or Removed!'});
        }

        request.status='Rejected';

        const requestResponse=await request.save();

        if(!requestResponse){
            return res.status(400).json({message: 'Request could not be Rejected!'});
        }

        return res.status(200).json({message:"Request successfully rejected!"});
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// Delete a Request
router.delete('/delete/:requestID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        
        const requestID=req.params.requestID;
        const request=await Request.findById(requestID);
        
        if(!request){
            return res.status(404).json({message: 'No such request Found!'});
        }

        if(user.role!='admin' || String(request.requester)!=String(userID)){
            return res.status(404).json({message: 'Only admin or Request generator can delete a request'});
        }

        if(request.status!='Pending'){
            return res.status(404).json({message: 'Only pending requests can be deleted!'});
        }

        const requestResponse=await Request.findByIdAndDelete(requestID);

        if(!requestResponse){
            return res.status(400).json({message: 'Request could not be Deleted!'});
        }

        return res.status(200).json({message:"Request successfully Deleted!"});
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

module.exports=router;