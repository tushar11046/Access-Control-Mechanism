const express=require('express');
const app=express();
const db=require('./db');
require('dotenv').config();

const userRoutes=require('./routes/userRoutes');
const entityRoutes=require('./routes/entityRoutes');
const userGroupRoutes=require('./routes/userGroupRoutes');
const requestRoutes=require('./routes/requestRoutes');
const departmentRoutes=require('./routes/departmentRoutes');


const bodyParser=require('body-parser');
app.use(bodyParser.json());   // req.body
const Port=process.env.PORT || 3000;

const {jwtAuthMiddleWare}=require('./JWT');



app.use('/user',userRoutes);
app.use('/entity',entityRoutes);
app.use('/request',requestRoutes);
app.use('/department',departmentRoutes);
app.use('/userGroup',userGroupRoutes);

app.listen(Port,()=>{
    console.log("Listening on port 3000");
})