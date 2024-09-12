const express=require('express');
const User=require('./../models/user');
const Entity=require('./../models/entity');
const userGroup=require('./../models/userGroup');
const Department=require('./../models/department');
const router=express.Router();
const {jwtAuthMiddleWare}= require('./../JWT');

// Create a new Entity
router.post('/create',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const data=req.body;  

        const user=await User.findById(req.user.id);

        if(user.role!='admin'){
            return res.status(404).json({error: 'Access Rejected, only Admins allowed!'});
        }
        const newEntity=new Entity(data);

        const dpt=await Department.findById(newEntity.departmentID);

        if(!dpt){
            return res.status(404).json({message: "Invalid Department ID"});
        }

        if(dpt.name!=newEntity.departmentName){
            return res.status(404).json({message: "Invalid Department Name"});
        }

        const response=await newEntity.save();

        if(!response){
            return res.status(404).json({message: "Internal Server Error: Entity not saved!"});
        }

        dpt.entities.push(response.id);

        if(dpt.manager!=null){
            const manager=await User.findById(dpt.manager);
            manager.entityOwned.push(response.id);
            
            await manager.save();
        }

        await dpt.save();
        

        res.status(200).json({message: "Entity successfully created!"});

    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})
// get entity details
router.get('/info',jwtAuthMiddleWare,async(req,res)=>{
    try{
        const userID=req.user.id;

        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: "Invalid User ID"});
        }

        const response=await Entity.find({status:'Active'});

        if(!response){
            return res.status(400),json({error: "Internal Server Error!"});
        }

        res.status(200).json({Entities: response});
    }catch(error){
        console.log(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

// access an entity
router.get('/access/:entityID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;
        const entityID=req.params.entityID;

        const user=await User.findById(userID);
        const entity=await Entity.findById(entityID);

        if(entity.status=='Inactive'){
            return res.status(404).json({message: "Access Denied: Entity Inactive!"});
        }
        if(user.group!=null){
            if(await userGroup.findOne(
                {_id:user.group},
                {entities:entityID}
            )){
                return res.status(200).json({message: "Entity accessed successfully!"});
            }
        }
        if(user.entityOwned.includes(entityID)){
            return res.status(200).json({message: "Entity accessed successfully!"});
        }
        res.status(400).json({message: "Unauthorized access!"});
    }catch(error){
        console.log(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

// update an entity's department
router.put('/updateDPT/:entityID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({message: "Invalid User"});
        }

        const entityID=req.params.entityID;
        const entity=await Entity.findById(entityID);

        if(!entity){
            return res.status(400).json({message: "Invalid Entity ID"});
        }

        if( user.role!='admin'){
            return res.status(400).json({message: "Only the Admin can modify an entity!"});
        }

        const data=req.body;
        const newDpt=await Department.findById(data.departmentID);

        if(!newDpt){
            return res.status(400).json({message: "Invalid Department ID"});
        }

        // remove from old department and add to new department
        const modifyDepartment=await Department.updateOne(
            {_id:entity.departmentID},
            {$pull:{entities:entityID}}
        )

        if(!modifyDepartment){
            return res.status(404).json({message: "Modification failed"});
        };

        newDpt.entities.push(entityID);

        // remove entity from users
        await User.updateMany(
            {entityOwned:entityID},
            {$pull:{entityOwned:entityID}}
        );

        // remove users from entity
        await Entity.updateMany(
            {_id:entityID},
            {$set:{sharedBy:[]}}
        );

        entity.departmentID=data.departmentID;

        await userGroup.updateMany(
            {entities:entityID},
            {$pull:{entities:entityID}}
        );
        // change entities department name
        entity.departmentName=newDpt.name;
        entity.save();
        newDpt.save();

        res.status(200).json({message: "Successfully modified!"});

    }catch(error){
        console.log(error);     
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

// change entity name
router.put('/ChangeName/:entityID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;
        const user=await User.findById(userID);

        const entityID=req.params.entityID;
        const entity=await Entity.findById(entityID);

        const data=req.body;

        if( user.role!='admin'){
            return res.status(400).json({message: "Only the Admin can modify an entity!"});
        }

        if(!entity){
            return res.status(400).json({message: "Invalid Entity ID"});
        }

        entity.name=data.name;
        await entity.save();

        res.status(200).json({message: "Name successfully modified!"});

    }catch(error){
        console.log(error);     
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

// remove access of an entity from user
router.put('/removeaccess/:entityID',jwtAuthMiddleWare,async(req,res)=>{
    try{
        data=req.body;
        const entityID=req.params.entityID;

        const userID=req.user.id;
        const user=await User.findById(userID);
        console.log(user);

        if(!user){
            return res.status(404).json({error: "Invalid User Login!"});
        }

        if(user.role!='admin'){
            return res.status(404).json({error: 'Access Rejected, only Admins allowed!'});
        }

        const removeUserID=data.userID;
        const removeUser=await User.findById(removeUserID);

        if(!removeUser){
            return res.status(404).json({error: "Invalid User ID!"});
        }

        if(!removeUser.entityOwned.includes(entityID)){
            return res.status(200).json({error: "User do not have the entities access already!"});
        }

        await User.updateOne(
            {_id:removeUserID},
            {$pull:{entityOwned:entityID}}
        )

        res.status(200).json({message: "Entity access removed Successfully!"});
        
    }catch(error){
        console.log(error);     
        return res.status(500).json({error: 'Internal Server Error'});
    }
})
// soft delete an entity
router.delete('/softDelete/:entityID',jwtAuthMiddleWare,async(req,res)=>{
    try{
        const userID=req.user.id;

        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: "Invalid User ID"});
        }

        if(user.role!='admin'){
            return res.status(404).json({message: "Entity can only be removed by admin"});
        }

        const enttyID=req.params.entityID;
        const entity=await Entity.findById(enttyID);

        if(!entity){
            return res.status(404).json({message: "Invalid Entity ID"});
        }

        const removeEntityFromUser=await User.updateMany(
            { entityOwned: enttyID },
            { $pull: { entityOwned: enttyID  } }
        );

        if(!removeEntityFromUser){
            return res.status(404).json({message: "Entity can not be removed from user's record"});
        }

        const removeEntityFromDepartment=await Department.updateMany(
            { entities: enttyID },
            { $pull: { entities: enttyID  } }
        );

        if(!removeEntityFromDepartment){
            return res.status(404).json({message: "Entity can not be removed from Department's record"});
        }

        const removeEntityFromUserGroup=await userGroup.updateMany(
            {entities:enttyID},
            {$pull:{entities:enttyID}}
        )
        
        if(!removeEntityFromUserGroup){
            return res.status(404).json({message: "Entity can not be removed from Department's record"});
        }

        entity.status='Inactive';

        entity.save();

        console.log("Entity Deactivation Successfull!");

        res.status(200).json({message: "Entity Deactivation Successfull!"});

    }catch(error){
        console.log(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})
// Hard delete an entity
router.delete('/hardDelete/:entityID',jwtAuthMiddleWare,async (req,res)=>{
    try{

        const userID=req.user.id;

        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({message: "Invalid User ID"});
        }

        if(user.role!='admin'){
            return res.status(404).json({message: "Entity can only be removed by admin"});
        }

        const enttyID=req.params.entityID;
        const entity=await Entity.findById(enttyID);

        if(!entity){
            return res.status(404).json({message: "Invalid Entity ID"});
        }

        console.log("Check 1");

        const removeEntityfromUser=await User.updateMany(
            { entityOwned: enttyID },
            { $pull: { entityOwned: enttyID  } }
        );

        if(!removeEntityfromUser){
            return res.status(404).json({message: "Entity can not be removed from user's record"});
        }

        const removeEntityfromDepartment=await Department.updateMany(
            { entities: enttyID },
            { $pull: { entities: enttyID  } }
        );

        if(!removeEntityfromDepartment){
            return res.status(404).json({message: "Entity can not be removed from Department's record"});
        }

        const removeEntityFromUserGroup=await userGroup.updateMany(
            {entities:enttyID},
            {$pull:{entities:entityID}}
        )
        
        if(!removeEntityFromUserGroup){
            return res.status(404).json({message: "Entity can not be removed from Department's record"});
        }

        const deletion=await Entity.findByIdAndDelete(enttyID);

        if(!deletion){
            return res.status(404).json({Error: "Internal Server Error!"});
        }

        res.status(200).json({message: "Entity successfully removed!"});


    }catch(error){
        console.log(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

// add an entity to a userGroup
router.post('/add/userGroup/:userGroupID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({error: "Invalid User Login!"});
        }

        if(user.role!='admin'){
            return res.status(404).json({error: "Unauthorized access: Only Admin allowed!"});
        }

        const userGroupID=req.params.userGroupID;
        const usergroup=await userGroup.findById(userGroupID);

        if(!usergroup){
            return res.status(404).json({error: "Invalid User group ID!"});
        }

        const data=req.body;
        const entityID=data.entityID;
        const entity=await Entity.findById(entityID);

        if(!entity){
            return res.status(404).json({error: "Invalid Entity ID!"});
        }

        if(usergroup.entities.includes(entityID)){
            return res.status(404).json({error: "Entity already included in the group"});
        }

        usergroup.entities.push(entityID);
        await usergroup.save();

        res.status(200).json({message: "Entity Added Successfully!"});


    }catch(error){
        console.log(error);
        res.status(500).json({error: "Internal Server Error!"});
    }
})

// remove an entity from user Group
router.post('/remove/userGroup/:userGroupID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(404).json({error: "Invalid User Login!"});
        }

        if(user.role!='admin'){
            return res.status(404).json({error: "Unauthorized access: Only Admin allowed!"});
        }

        const userGroupID=req.params.userGroupID;
        const usergroup=await userGroup.findById(userGroupID);

        if(!usergroup){
            return res.status(404).json({error: "Invalid User group ID!"});
        }

        const entityID=req.body;
        const entity=await Entity.findById(entityID);

        if(!entity){
            return res.status(404).json({error: "Invalid Entity ID!"});
        }

        if(!usergroup.entities.includes(entityID)){
            return res.status(404).json({error: "Entity is not included in the group"});
        }

        // remove from the user's access

        await User.updateOne(
            {group:userGroupID},
            {$pull:{entities:entityID}}
        )

        // remove from user group
        await userGroup.updateOne(
            {id:userGroupID},
            {$pull:{entityOwned:entityID}}
        )

        res.status(200).json({message: "Entity removed Successfully!"});


    }catch(error){
        console.log(error);
        res.status(500).json({error: "Internal Server Error!"});
    }
})


module.exports=router;