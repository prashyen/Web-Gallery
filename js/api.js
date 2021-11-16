var api = (function(){
    var module = {};
    
    /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) _id 
            - (String) title
            - (String) author
            - (Date) date
    
        comment objects must have the following attributes
            - (String) _id
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */ 
    
    module.signup = function(username, password){
        
    }
    
    module.signin = function(username, password){
        
    }
    
    module.signout = function(){
        
    }
    
    // add an image to the gallery
    module.addImage = function(title, file){
        
    }
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        
    }
    
    // add a comment to an image
    module.addComment = function(imageId, content){
        
    }
    
    // delete a comment to an image
    module.deleteComment = function(commentId){
        
    }
    
    return module;
})();