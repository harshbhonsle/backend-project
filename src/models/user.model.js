import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase: true,
            trim:true,
            index:true

        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trime:true,
        },
        fullname:{
            type:String,
            required:true,
            index:true,
            trim:true,
        },
        avatar:{
            type:String, // cloudinary url so string
            required:true,
        },
        coverImage:{
            type:String
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true,"Password required"]
        },
        refreshToken:{
            type:String,

        }
    },
    {timestamps:true}
)
// custom hook 
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10)
    next();
})

//custom method
userSchema.methods.isPasswordCorrect = async function(password){
    return  await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign({
        _id:this._id,
        email:this.email,
        fullname:this.fullname,
        username:this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id:this._id,

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
    )
}
export const User = mongoose.model("User",userSchema)