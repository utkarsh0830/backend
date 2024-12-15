class ApiError extends Error{
    constructor(
        statusCode,
        message= "Something Went Wrong",
        errors = [],
        stack = ""
    ){
        super(message) //super call for override
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructer)
        }
    }
}

export {ApiError}