(function(){

"use strict";


/* =====================================================
   ВИЗНАЧАЄМО КОРИСТУВАЧА
   ===================================================== */

const params =
  new URLSearchParams(window.location.search);

const username =
  params.get("user") || "copy_pasta";


const profile =
  PROFILES[username];


if(!profile){

  document.body.innerHTML =
    "<h2>Профіль не знайдено</h2>";

  return;

}


/* =====================================================
   ЗНАХОДИМО ДОПИСИ
   ===================================================== */

let posts = [];


if(profile.postsFile === "copy_pasta"){

  posts = POSTS_COPY_PASTA;

}


/* =====================================================
   ПРОФІЛЬ
   ===================================================== */

document.title =
  "Гуменчат — " +
  profile.displayName;


document.getElementById(
  "profile-name"
).textContent =
  profile.displayName;


document.getElementById(
  "profile-avatar"
).src =
  profile.avatar;


document.getElementById(
  "profile-avatar"
).alt =
  profile.displayName;


document.getElementById(
  "profile-header"
).textContent =
  "Мій гумгайл: " +
  profile.username;


document.getElementById(
  "profile-username"
).textContent =
  profile.username;


document.getElementById(
  "profile-description"
).textContent =
  "Статус: " +
  profile.description;


/* =====================================================
   СІМЕЙКА
   ===================================================== */

const family =
  document.getElementById(
    "profile-family"
  );


if(profile.family){

  family.innerHTML =
    'Сімейка: <b><a href="' +
    profile.family.url +
    '">' +
    profile.family.name +
    "</a></b>";

}else{

  family.textContent =
    "Сімейка: немає";

}


/* =====================================================
   СТАТУС
   ===================================================== */

const statusElement =
  document.getElementById(
    "profile-status"
  );


function getStatus(){

  if(
    profile.status.type === "online"
  ){

    return "● онлайн";

  }


  if(
    profile.status.type === "offline"
  ){

    return "Офлайн";

  }


  return profile.status.text ||
    "Офлайн";

}


statusElement.textContent =
  getStatus();


/* =====================================================
   КІЛЬКІСТЬ ДОПИСІВ
   ===================================================== */

document.getElementById(
  "posts-header"
).textContent =
  "Дописи " +
  profile.username +
  " — " +
  profile.postsCount;


/* =====================================================
   РЕНДЕР ДОПИСІВ
   ===================================================== */

const postsContainer =
  document.getElementById(
    "profile-posts"
  );


const showMore =
  document.getElementById(
    "show-more-posts"
  );


let visiblePosts = 3;

const postsPerClick = 5;


function renderPosts(){

  postsContainer.innerHTML = "";


  posts
    .slice(0, visiblePosts)
    .forEach(function(post, index){

      postsContainer.appendChild(
        createPost(post,index)
      );

    });


  if(
    visiblePosts >= posts.length
  ){

    showMore.classList.add(
      "hidden"
    );

  }else{

    showMore.classList.remove(
      "hidden"
    );

  }

}


showMore.addEventListener(
  "click",
  function(){

    visiblePosts += postsPerClick;


    if(
      visiblePosts > posts.length
    ){

      visiblePosts =
        posts.length;

    }


    renderPosts();

  }
);


/* =====================================================
   СТВОРЕННЯ ДОПИСУ
   ===================================================== */

function createPost(post,index){

  const article =
    document.createElement("div");

  article.className =
    "profile-post";


  const title =
    document.createElement("div");

  title.className =
    "profile-post-title";

  title.textContent =
    post.title;


  const body =
    document.createElement("div");

  body.className =
    "profile-post-body";


  if(post.html){

    body.innerHTML =
      post.text;

  }else{

    body.textContent =
      post.text;

  }


  const actions =
    document.createElement("div");

  actions.className =
    "post-actions";


  const like =
    document.createElement("button");

  like.className =
    "like-button";

  like.type =
    "button";

  like.innerHTML =
    '♡ Подобається <span class="like-count">' +
    post.likes +
    "</span>";


  const comments =
    document.createElement("button");

  comments.className =
    "comment-button";

  comments.type =
    "button";

  comments.innerHTML =
    '💬 Коментарі <span class="comment-count">' +
    post.comments.length +
    "</span>";


  actions.appendChild(like);

  actions.appendChild(comments);


  const commentsArea =
    document.createElement("div");

  commentsArea.className =
    "comments-area";


  post.comments.forEach(
    function(comment){

      const commentElement =
        document.createElement("div");

      commentElement.className =
        "fake-comment";


      const name =
        document.createElement("div");

      name.className =
        "fake-comment-name";

      name.textContent =
        comment.user;


      commentElement.appendChild(
        name
      );


      commentElement.appendChild(
        document.createTextNode(
          comment.text
        )
      );


      commentsArea.appendChild(
        commentElement
      );

    }
  );


  const form =
    document.createElement("div");

  form.className =
    "comment-form";


  const input =
    document.createElement("textarea");

  input.className =
    "comment-input";

  input.placeholder =
    "Написати коментар...";


  const send =
    document.createElement("button");

  send.className =
    "comment-send";

  send.type =
    "button";

  send.textContent =
    "Відправити";


  form.appendChild(input);

  form.appendChild(send);

  commentsArea.appendChild(form);


  const date =
    document.createElement("div");

  date.className =
    "profile-post-date";

  date.textContent =
    post.date;


  article.appendChild(title);

  article.appendChild(body);

  article.appendChild(actions);

  article.appendChild(commentsArea);

  article.appendChild(date);


  /* LIKE */

  like.addEventListener(
    "click",
    function(){

      let number =
        parseInt(
          post.likes,
          10
        );


      if(
        like.classList.contains(
          "liked"
        )
      ){

        number--;

        like.classList.remove(
          "liked"
        );

      }else{

        number++;

        like.classList.add(
          "liked"
        );

      }


      post.likes =
        number;


      like.innerHTML =
        (like.classList.contains(
          "liked"
        ) ? "♥" : "♡") +
        ' Подобається <span class="like-count">' +
        number +
        "</span>";

    }
  );


  /* COMMENTS */

  comments.addEventListener(
    "click",
    function(){

      commentsArea.classList.toggle(
        "open"
      );

    }
  );


  /* SEND COMMENT */

  send.addEventListener(
    "click",
    function(){

      const text =
        input.value.trim();


      if(!text){
        return;
      }


      const comment =
        document.createElement("div");

      comment.className =
        "user-comment";


      const strong =
        document.createElement("strong");

      strong.textContent =
        "ти: ";


      comment.appendChild(
        strong
      );


      comment.appendChild(
        document.createTextNode(
          text
        )
      );


      commentsArea.insertBefore(
        comment,
        form
      );


      input.value = "";


      post.comments.push({

        user: "ти",

        text: text

      });


      const count =
        article.querySelector(
          ".comment-count"
        );


      count.textContent =
        post.comments.length;

    }
  );


  return article;

}


/* =====================================================
   ЗАПУСК
   ===================================================== */

renderPosts();


})();
