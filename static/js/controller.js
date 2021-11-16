(function() {
    "use strict";
    window.onload = function() {
        let galleryPage = 0;
        let imagePage = 0;
        let commentPage = 0;

        (function fetchAgain(){
            setTimeout(function(e){
                notifyMessageListeners();
                fetchAgain();
            }, 2000);
        }());
        
        let turnOffForm = function() {
            if (document.querySelector('.image') == null) {
                let imageForm = document.querySelector('#post_image_form');
                imageForm.style.display = "none";
            }
        };
        // api.onUserUpdate(function(username){
        //     document.querySelector("#signin_button").style.visibility = (username)? 'hidden' : 'visible';
        //     document.querySelector("#signout_button").style.visibility = (username)? 'visible' : 'hidden';
        //     document.querySelector('#create_message_form').style.visibility = (username)? 'visible' : 'hidden';
        // });

        api.onError(function(err){
            console.error("[error]", err);
            var error = document.querySelector('#error');
            error.innerHTML = err;
            error.style.display = "block";
            document.querySelector('.page_content').style.display = "none";
        });

        let updateComments = function(comments, username) {
            if (comments != null) {
                let comElmt = null;
                if((comElmt = document.querySelector('.comments')) != null) comElmt.innerHTML = '';
                let len = comments.length;
                if(len > 10) comments.shift();
                comments.forEach(function(comment) {
                    let elmt = document.createElement('div');
                    elmt.className = "comment";
                    elmt.innerHTML = `
                            <div class="message_user">
                                <img class="message_picture" src="../media/user.png" alt="${comment.author}">
                                <div class="message_username">${comment.username}</div>
                            </div>
                            <div class="message">
                                <div class="date_text">${new Date(comment.createdAt)}</div>
                                <div class="message_content">${comment.content}</div>
                            </div>
                            <div class="delete-icon icon"></div>
                        `;

                    elmt.querySelector('.delete-icon').addEventListener('click', function(e) {
                        if (len > 1) {
                            api.deleteComment(comment.galleryId, comment.imageId, comment._id, commentPage);
                        }else if(commentPage == 0){
                            api.deleteComment(comment.galleryId, comment.imageId, comment._id, commentPage);
                        }else{
                            commentPage--;
                            api.deleteComment(comment.galleryId, comment.imageId, comment._id, commentPage);
                        }
                        api.deleteComment(comment.galleryId, comment.imageId, comment._id, commentPage);
                    });
                    if(comment.username != username && comment.imageOwner != username){
                        elmt.querySelector('.delete-icon').remove();
                    }
                    document.querySelector('.comments').prepend(elmt);

                });
                let commentSection = document.querySelector('.comments-section');
                if (commentSection != null) {
                    if (commentSection.querySelector('.button_grid') != null) {
                        commentSection.querySelector('.button_grid').remove();
                    }
                        let btnGrid = document.createElement('div');
                        btnGrid.className = "button_grid";
                        btnGrid.innerHTML = `
                                    <button id="nxtPg" class="btn_icons prev_btn"></button>
                                    <button id="prevPg" class="btn_icons next_btn"></button>
                                    `;
                        commentSection.append(btnGrid);
                        btnGrid.querySelector('#nxtPg').addEventListener('click', function(e) {
                            if(commentPage>0 ){
                                commentPage--;
                                api.nextCommentPage(comments[0].galleryId, comments[0].imageId, commentPage);
                            }
                        });
                        btnGrid.querySelector('#prevPg').addEventListener('click', function(e) {
                            if(len > 10){
                                commentPage++;
                                api.nextCommentPage(comments[0].galleryId, comments[0].imageId, commentPage);
                            }
                        });
                }
            }
            if (document.querySelector('.comments-section .button_grid') != null && document.querySelector('.comment') == null) {
                document.querySelector('.comments-section .button_grid').remove();
            }
        };

        api.onGalleryUpdate(function(gallery){
            let btngrid = document.querySelector('.gallery_btn');
            let gallTitle = document.querySelector('.gallery_title');
            if(gallTitle != null) gallTitle.remove();
            if(btngrid != null) btngrid.remove();
            

            if (gallery.length> 0) {
                let len = gallery.length;
                if(len > 2) gallery.shift();
                gallery = gallery[0];
                let elmtTitle = document.createElement('div');
                elmtTitle.className = "gallery_title";
                elmtTitle.innerHTML = `${gallery.username}'s Gallery` ;
                let elmt = document.createElement('div');
                elmt.className = "gallery_btn";
                elmt.innerHTML = `
                    <div class="button_grid">
                        <button class="btn_icons prev_btn"></button>
                        <button class="btn_icons next_btn"></button>
                    </div>
                    `;
                if (len == 1) {
                    elmt.querySelector('.next_btn').remove();
                } else {
                    elmt.querySelector('.next_btn').addEventListener('click', function(e) {
                        galleryPage++;
                        api.changeGallery(galleryPage);
                    });
                }
                if (galleryPage == 0) {
                    elmt.querySelector('.prev_btn').remove();
                } else {
                    elmt.querySelector('.prev_btn').addEventListener('click', function(e) {
                        galleryPage--;
                        api.changeGallery(galleryPage);
                    });
                }
                document.querySelector('.gallery').prepend(elmt);
                document.querySelector('.gallery').prepend(elmtTitle);
            }
            else{
                document.querySelector('.image').remove();
                document.querySelector('.gallery_title').remove();
            }
            
        });

        api.onImageUpdate(function(img, username) {
            document.querySelector('#images').innerHTML = '';
            console.log(username);
            // if(username != null) document.querySelector('#signup').style.display = 'none';
            if (img.length > 0) {
                
                let len = img.length;
                if(len > 2) img.shift();
                img = img[0];
                let elmt = document.createElement('div');
                elmt.className = "image";
                elmt.id = img._id;
                elmt.innerHTML = `
                    <p class="title_text">${img.title}</p>
                    <p class="author_text">${img.username}</p>
                    <div class="button_grid">
                        <button class="btn_icons prev_btn"></button>
                        <button class="btn_icons delete_btn"></button>
                        <button class="btn_icons next_btn"></button>
                    </div>
                    <img class="display_img" src="/api/images/${img._id}/picture/" alt="${img.title}">
                    <div class="comments-section">
                        <p class="comment_header">Comments</p>
                            <form class="comment_form" id="create_comment_form">
                                <div class="form_title">Post a Comment</div>
                                <textarea rows="5" required class="text_form_field" id="comment_content"placeholder="Message goes here..."></textarea>
                                <button class="submit_form_btn">Post your message</button>
                            </form>
                            <div class="comments"></div>
                    </div>
                    `;
                elmt.querySelector('.delete_btn').addEventListener('click', function(e) {
                    if (len == 1 && imagePage > 0) {
                        imagePage--;
                        api.deleteImage(img.galleryId, img._id, imagePage);
                    }else if(len > 1 && imagePage == 0){
                        imagePage++;
                        api.deleteImage(img.galleryId, img._id, imagePage);
                    }else if(len > 1 && imagePage > 0){
                        imagePage--;
                        api.deleteImage(img.galleryId, img._id, imagePage);
                    }else{
                        imagePage = 0;
                        api.deleteImage(img.galleryId, img._id, imagePage);
                    }
                    commentPage=0;
                    turnOffForm();
                });
        
                if(img.username != username){
                    elmt.querySelector('.delete_btn').remove();
                }
                if (len == 1) {
                    elmt.querySelector('.next_btn').remove();
                } else {
                    elmt.querySelector('.next_btn').addEventListener('click', function(e) {
                        imagePage++;
                        api.changeImage(img.galleryId,img._id, imagePage);
                    });
                }
                if (imagePage == 0) {
                    elmt.querySelector('.prev_btn').remove();
                } else {
                    elmt.querySelector('.prev_btn').addEventListener('click', function(e) {
                        imagePage--;
                        api.changeImage(img.galleryId, img._id, imagePage);
                    });
                }
                elmt.querySelector('#create_comment_form').addEventListener('submit', function(e) {
                    e.preventDefault();
                    let content = document.querySelector('#comment_content').value;
                    // let imageId = document.getElementsByClassName('image')[0].id;
                    document.querySelector('#create_comment_form').reset();
                    api.addComment(img.galleryId, img._id, content);
                    commentPage = 0;
                });
                document.querySelector('#images').prepend(elmt);

                elmt.querySelector('.comments').innerHTML = '';
            }else{
                let title = document.querySelector('.gallery_title');
                if(title != null) title.remove();
            }
        });


        api.onCommentUpdate(updateComments);



        document.querySelector('#post_image_form').addEventListener('submit', function(e) {
            e.preventDefault();
            let title = document.querySelector('#img_title').value;
            let img = document.querySelector('#img').files[0];
            document.querySelector('#post_image_form').reset();
            api.addImage(title, img);
            imagePage = 0;
        });

        // document.querySelector('#signout').addEventListener('click', function(e) {
        //     api.signout();
        //     document.cookie = "username=";
        //     window.location.href = '/login.html';
        // });

        document.querySelector('.image_form_toggle').addEventListener('click', function(e) {
            e.preventDefault();
            let imageForm = document.querySelector('#post_image_form');
            if (imageForm.style.display == "") {
                imageForm.style.display = "none";
            } else {
                imageForm.style.display = "";
            }
        });
        turnOffForm();

    };
}());