const express=require('express');
const User=require('./../models/user');
const Entity=require('./../models/entity');
const Department=require('./../models/department');
const router=express.Router();
const {jwtAuthMiddleWare}= require('./../JWT');

// Create a new department
router.post('/create',jwtAuthMiddleWare,async (req,res)=>{
        try{
            const data=req.body;  
    
            const user=await User.findById(req.user.id);
    
            if(user.role!='admin'){
                return res.status(404).json({error: 'Access Rejected, only Admins allowed!'});
            }
            const newDpt=new Department(data);
    
            await newDpt.save();
    
            console.log("New Department Created!");
    
            res.status(200).json({message: "Department successfully created!"});
    
        }catch(err){
            console.log(err);
            res.status(500).json({error: 'Internal Server Error'});
        }
})

// get department information
router.get('/',jwtAuthMiddleWare,async(req,res)=>{
    try{
        const response=await Department.find();
    
        if(!response){
            return res.status(404).json({error: 'Could not fetch department details'});
        }

        res.status(200).json({Department_Details: response});

    }catch(error){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})

// update department information
router.put('/updateName/:departmentID', jwtAuthMiddleWare,async (req,res)=>{
    try{
        const departmentID=req.params.departmentID;
        const department=await Department.findById(departmentID);

        const userID=req.user.id;
        const user=await User.findById(userID);

        if(user.role!='admin'){
            return res.status(400).json({message: "Department any only be updated by Admin"})
        }

        const newdata=req.body;
        const name=newdata.name;
        department.name=name;

        await department.save();


        res.status(200).json({message: "Department Data successfully Updated!"});
    }catch(error){
        res.status(400).json({error:error});
    }
})

// delete a department
router.delete('/delete/:departmentID',jwtAuthMiddleWare,async (req,res)=>{
    try{
        const departmentID=req.params.departmentID;

        if(!await Department.findById(departmentID)){
            return res.status(400).json({message: "No such department Exists!"});
        }

        const userID=req.user.id;
        const user=await User.findById(userID);

        if(user.role!='admin'){
            return res.status(404).json({message: "Only admin is allowed to delete a department"});
        }

        const users=await User.find({departmentID:departmentID});

        if(users.length>0){
            return res.status(404).json({message: "Department cannot be deleted as Employees are still associated to it!"});
        }

        const entity=await Entity.find({departmentID:departmentID});

        if(entity){
            await Entity.deleteMany({departmentID:departmentID});
        }

        await Department.findByIdAndDelete(departmentID);

        res.status(200).json({message: "Department Successfully deleted!"});

    }catch(error){
        console.log(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
})

// get all user details (only own department if not admin)
router.get('/information',jwtAuthMiddleWare,async (req,res)=>{
    try{
        userID=req.user.id;
        const user=await User.findById(userID);

        if(!user){
            return res.status(400).json({message: "User do not exist!"});
        }

        if(user.role=='admin' ){
            const allusers=await User.find().select('name age email departmentID designation');;
            return res.status(200).json({Department_Details: allusers});
        }

        if(user.status=='Inactive'){
            return res.status(400).json({message: "Inactive user login!"});
        }

        const departmentusers=await User.find({departmentID:user.departmentID}).select('name age email departmentID designation');

        res.status(200).json({Departments_Detail: departmentusers});
    }catch(error){
        console.error(err);
        res.status(500).json({error:"Internal Server error"});
    }
})

module.exports=router;