var api = (function(){
    var module = {};
        
    function send(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    function sendFiles(method, url, data, callback){
        let formdata = new FormData();
        Object.keys(data).forEach(function(key){
            let value = data[key];
            formdata.append(key, value);
        });
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        xhr.send(formdata);
    }

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
    
    module.signin = function(username, password){
        send("POST", "/signin/", {username, password}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
        });
    };

    module.signup = function(username, password){
        send("POST", "/signup/", {username, password}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
        });
    };
    
    module.signout = function(){
        send("GET", "/signout/", function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
        });
    };
    
    // add an image to the gallery
    module.addImage = function(title, file){
        sendFiles("POST", "/api/images/", {title: title, picture: file}, function(err, res){
            if (err) return notifyErrorListeners(err);
            callGalleryHandlers(0);
            callImageHandlers(res.galleryId, 0);
       });
    };
    
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(galleryId, imageId, page){
        send("DELETE", "/api/galleries/"+galleryId+"/images/" + imageId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            callImageHandlers(galleryId, page);
            // callCommentHandlers(res.next_id);
       });
    };
    
    // add a comment to an image
    module.addComment = function(galleryId, imageId, content){
        send("POST", "/api/galleries/" + galleryId+"/images/"+imageId+"/comments/", {content: content}, function(err, res){
            if (err) return notifyErrorListeners(err);
            callCommentHandlers(galleryId, imageId, 0);
       });
    };
    
    
    // delete a comment to an image
    module.deleteComment = function(galleryId, imageId, commentId, page){
        send("DELETE", "/api/galleries/"+galleryId+"/images/"+imageId+"/comments/" + commentId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            callCommentHandlers(galleryId, imageId, page);
       });
    };

    //given the imageid and the next/prev comment setIndex, calls event handlers with the new page data if the next comment set exists
    module.nextCommentPage = function(galleryId, imageId, page) {
        callCommentHandlers(galleryId, imageId, page);
    };

    //given the imageid call handlers on that image
    module.changeImage = function (galleryId, imageID, page){
        callImageHandlers(galleryId, page);
        callCommentHandlers(galleryId, imageID, 0);
    };

    module.changeGallery = function (page){
        callGalleryHandlers(page);
        getGallery(function(err, gal){
            getImage(function(err, img){
                callImageHandlers(gal[0]._id, 0);
                callCommentHandlers(gal[0]._id, img[0]._id, 0);
            }, gal[0]._id, 0)
        }, page);
    };

    let getComments = function(callback, galleryId, imageId, page=0){
        send("GET", "/api/galleries/" + galleryId+"/images/"+imageId+"/comments/?page=" + page, null, callback);
    };

    let getImage = function(callback, galleryId, page = 0){
            send("GET", "/api/galleries/" + galleryId+"/images/?page=" + page, null, callback);
    };

    let getGallery = function(callback, page =0){
        send("GET", "/api/galleries/?page=" + page, null, callback);
    };

    let galleryListeners = [];
    // call handler when an image is added or deleted from the gallery
    module.onGalleryUpdate = function(handler){
        galleryListeners.push(handler);
        getGallery(function(err, gal){
            if (err) return notifyErrorListeners(err);
            handler(gal);
        });
    };
    //notify all handlers if any changes to images is performed
    function callGalleryHandlers(page) {
        galleryListeners.forEach(function(handler) {
            getGallery(function(err, gal){
                if (err) return notifyErrorListeners(err);
                    handler(gal);
            }, page);
        });
    }

    
    let imageListeners = [];
    // call handler when an image is added or deleted from the gallery
    module.onImageUpdate = function(handler){
        let username = getUsername();
        imageListeners.push(handler);
        getGallery(function(err, gal){
            console.log(gal);
            if(gal.length > 0){
                getImage(function(err, img){
                    if (err) return notifyErrorListeners(err);
                    handler(img, username);
                }, gal[0]._id, 0);
            }
        });
    };
    //notify all handlers if any changes to images is performed
    function callImageHandlers(galleryId, page) {
        let username = getUsername();
        imageListeners.forEach(function(handler) {
            getImage(function(err, img){
                if (err) return notifyErrorListeners(err);
                    handler(img, username);
            }, galleryId, page);
        });
    }

    let commentListeners = [];
    // call handler when a comment is added or deleted to an image
    module.onCommentUpdate = function(handler){   
        let username = getUsername(); 
        commentListeners.push(handler);
        getGallery(function(err, gal){
            if(gal.length > 0){
                getImage(function(err, img){
                    getComments(function(err, com){
                        if (err) return notifyErrorListeners(err);
                        handler(com.reverse(), username);
                    }, gal[0]._id, img[0]._id, 0);
                }, gal[0]._id, 0);
            }   
        });
    };
       
    //notify all handlers if any changes to images is performed
    function callCommentHandlers(galleryId, imageId, page) {
        let username = getUsername();
        commentListeners.forEach(function(handler) {
            getComments(function(err, com){
                if (err) return notifyErrorListeners(err);
                    handler(com.reverse(), username);
            }, galleryId, imageId, page);
        });
    }
    
    let errorListeners = [];
    
    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }
    
    module.onError = function(listener){
        errorListeners.push(listener);
    };


    let userListeners = [];
    
    let getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }
    
    function notifyUserListeners(username){
        userListeners.forEach(function(listener){
            listener(username);
        });
    };
    
    module.onUserUpdate = function(listener){
        userListeners.push(listener);
        listener(getUsername());
    }

    return module;
})();