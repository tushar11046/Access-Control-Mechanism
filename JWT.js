const jwt=require('jsonwebtoken');

const jwtAuthMiddleWare=(req,res,next) => {

    // First check request header has authorization or not

    const authorization=req.headers.authorization
    if( !authorization ) return res.status(401).json({error: 'Token not found'});

    // Extract jwt token from request header
    const token = req.headers.authorization.split(' ')[1];

    if(!token){
        return res.status(401).json({error:"Unauthorized Access"});
    }

    try{
        // Verify the JWT token
        const decoded=jwt.verify(token,process.env.JWT_SECRET); // Payload

        // Attach user information to the request object
        req.user=decoded;
        next();
    }catch(err){
        console.log(err);
        res.status(401).json({error: 'Invalid token'});
    }
}

// Function to generate token

const generateToken=(userData)=>{
    // Generate a new JWT token using user data
    return jwt.sign(userData, process.env.JWT_SECRET, {expiresIn:3000});
}

module.exports={jwtAuthMiddleWare,generateToken};