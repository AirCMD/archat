(function(){

"use strict";


/* =========================================================
   COPY_PASTA — ДАНІ
   ========================================================= */

var PROFILE = {
  username: "copy_pasta",
  displayName: "copy_pasta",
  status: "ліньки розписувати",
  avatar:
    "https://blogger.googleusercontent.com/img/a/AVvXsEiNU5aLNwKBZvNgLsvxfKYA0hduyABhvfQrHryVIrw1Q2WVFne8Aop849IRmthJlGuRphRDtjX_d-pvH8gcUtCoAL-zkhXAP0utpiVidiXL57SIMaMBjeaXnGhTZ_j2wQj1RZxI-V5TsjxtARZSpoxZ8UGuDX_9t9hmiL6k1OyP6ilE8WmYwfKmHTQFvFg"
};


/* =========================================================
   25 СТАРИХ ДОПИСІВ
   ========================================================= */

var DEFAULT_POSTS = [

{
  title:
    "Дивилась сьогодні кіно про покинутого собаку, його власник вже кайфує від нового життя, а собака все ще чекає його повернення",

  text:
    "Навряд чи я хочу бути як та собачка. Мені дуже сумно що таке трапляється( До неї підходили люди, які хотіли її забрати до себе. Але вона не йшла до них. Вона чекала свого зрадливого власника, який вже мав сім'ю та нову собаку в іншій країні.",

  date: "15 серпня",
  likes: 29,

  comments: [
    {
      author: "sakurai_agatsuma",
      text: "Шкода собачку("
    },
    {
      author: "copy_pasta",
      text: "Шкода не те слово. Але ж собачка не винна що її власник гівнюк."
    }
  ]
},

{
  title: "Щоб я не робила",

  text:
    "Не важливо що я могла б зробити. Він ніколи цього не цінує, він бачить всіх та кожну, підтримує їх. Але ніколи й доброго слова щодо моїх досягнень я не отримую. Навіть якщо зірку з неба впіймаю. Не знаю чи варто воно все того(",

  date: "13 серпня",
  likes: 31,

  comments: [
    {
      author: "sakurai_agatsuma",
      text: "Створюй те все для себе :3"
    },
    {
      author: "copy_pasta",
      text: "Та не так вже й цікаво...."
    },
    {
      author: "sakurai_agatsuma",
      text: "А заради учасників твого островка?"
    }
  ]
},

{
  title: "Мені подобається тепла весна",

  text:
    "Я ліниво звісила руки, сидячи на стільці балкончика. Вітерець так ніжно і приємно колихає їх туди-сюди. Але не довго колихав, не люблю коли разом з вітром летить пакет та сміття. Ледве встигла прибрати руки. Фу, бридко!",

  date: "5 квітня",
  likes: 2,

  comments: [
    {
      author: "sakurai_agatsuma",
      text: "Хаха, ну ти й даєш."
    },
    {
      author: "copy_pasta",
      text: "Та та воно й таа. А якщо б пакет в пику прилетів?"
    },
    {
      author: "sakurai_agatsuma",
      text: "Якщо тільки пакет з грошима)"
    }
  ]
},

{
  title: "Як ви відноситесь до субкультури?",

  text: "Мені подобається субкультура.",

  date: "17 серпня",
  likes: 5,

  comments: [
    {
      author: "alter_core",
      text: "А яка саме субкультура? Бо всі вони різні."
    },
    {
      author: "copy_pasta",
      text:
        "Якщо субкультура передбачатиме комфорт, смачну їжу та теплу атмосферу, то саме таку."
    }
  ]
},

{
  title: "Мене попустило",

  text:
    "Я пів дня думала про те щоб наліпку собі на лоба приліпити. Але не зробила цього. Ці думки лише зараз припинили мене чіпати.",

  date: "6 серпня",
  likes: 11,

  comments: [
    {
      author: "sakurai_agatsuma",
      text: "А чому не зробила? Я собі приклеїла."
    },
    {
      author: "copy_pasta",
      text: "Щоб що? Всеодно цього ніхто не бачить."
    },
    {
      author: "sakurai_agatsuma",
      text: "То я даремно з нею весь день проходила??"
    }
  ]
},

{
  title: "Мо прибрати сімейку?",

  text:
    "Бо те що відбувається між нами точно стосунками не назвеш.",

  date: "10 серпня",
  likes: 2,

  comments: [
    {
      author: "copy_pasta",
      text: "Напевно приберу."
    },
    {
      author: "sakurai_agatsuma",
      text: "Прибирай :3"
    }
  ]
},

{
  title: "Прочитала 5 книжок",

  text:
    "Я не розумію навіщо люди лізуть в мізкологію. Всі книжки та й їхній зміст однаковий. Різниці ніякої.",

  date: "8 серпня",
  likes: 1,

  comments: [
    {
      author: "copy_pasta",
      text: "Мізкологи безкорисна витрата коштів."
    }
  ]
},

{
  title: "Чи ти мій хлопець, чи ні?",

  text:
    "Що між нами? Поясни ж ти мені, @dream_romance",

  date: "8 серпня",
  likes: 0,

  comments: [
    {
      author: "dreaming_romance",
      text: "Стосунки звісно ж."
    },
    {
      author: "copy_pasta",
      text: "Тоді нащо ти пишеш дивні речі?"
    }
  ]
},

{
  title: "Не розумію...",

  text:
    "Гарно починалося ж аніме. Але коли припиняється різко комедія та починається чорнуха, сумна частина та інше серйозне мушкалове, то й дивитися не хочу.",

  date: "7 серпня",
  likes: 5,

  comments: [
    {
      author: "copy_pasta",
      text: "Маячню назнімали."
    },
    {
      author: "copy_pasta",
      text: "Бісить."
    }
  ]
},

{
  title: "Хочу булькочай",

  text:
    "Картопельку прикут, смакобулочки та курячі шматочки з салатним листям.",

  date: "6 серпня",
  likes: 2,
  comments: []
},

{
  title: "Зіграла в одну гру",

  text: "Питайте",

  date: "2 грудня",
  likes: 2,

  comments: [
    {
      author: "copy_pasta",
      text: "Я що, даремно про це написала!?"
    },
    {
      author: "sakurai_agatsuma",
      text: "Так."
    }
  ]
},

{
  title: "Знаєте як зрозуміти що те що ти пишеш не читають?",

  text:
    "Проте всі інші за подібне завжди отримують 💖, але ж не я. Ні.",

  date: "1 грудня",
  likes: 0,
  comments: []
},

{
  title: "Сьогодні побачила на вулиці гарну кицьку.",

  text:
    "Купила їй корм, накидала у миску та навіть погладила. Вона така малесенька та ручна, напевно чиясь домашня.",

  date: "1 грудня",
  likes: 0,
  comments: []
},

{
  title: "Творчість",

  text:
    "Сьогодні я протягом години намалювала красивий пейзаж. Моє бачення іншої планети, екзотичного світу з прибульцями. Там блакитні, фіолетові та рожеві рослини з фіолетово-сірим піском. Позаду незвичні будівлі, а також фіолетове небо з двома супутниками.",

  date: "29 листопада",
  likes: 0,
  comments: []
},

{
  title: "Святі кицюні",

  text: "Як все це задовбало...",

  date: "1 серпня",
  likes: 0,
  comments: []
},

{
  title: "Почистила список друменів",

  text: "Чати також підчистила.",

  date: "31 липня",
  likes: 3,
  comments: []
},

{
  title: "Я не буду змагатися за кохання",

  text:
    "Якщо людина мене кохає, то не буде заводити безліч подружок та писати якою має бути довжина мого волосся, колір, одяг. Бо це не кохання. Та й світогляд змінювати на той, котрий у твоєї знайомої я також не буду.",

  date: "30 липня",
  likes: 98,
  comments: []
},

{
  title: "Блиск для губ створює магію",

  text:
    "Одразу стаєш значно красивішою.",

  date: "29 липня",
  likes: 0,
  comments: []
},

{
  title: "Помила волосся шампунем з ароматом вишеньки",

  text:
    "Приємно пахне, не смердить. Зазвичай шампуні мають різкий та не приємний запах, а цей ніжний та парфумований. Мені подобається.",

  date: "28 липня",
  likes: 2,
  comments: []
},

{
  title: "У мене гикавка",

  text:
    "І вода не допомагає як і затримка дихання 😨",

  date: "27 липня",
  likes: 0,
  comments: []
},

{
  title: "Поставте 💕",

  text:
    "Якщо любите мене.",

  date: "26 липня",
  likes: 5,
  comments: []
},

{
  title: "Сьогодні подумала про вплив емоцій на моє тіло",

  text:
    "Коли я лютую, це відчувається майже всім тілом.",

  date: "25 липня",
  likes: 0,
  comments: []
},

{
  title: "Якщо я чогось не зрозуміла, завжди можна це пояснити.",

  text:
    "Але тікати, матюкатися та біситися, кажучи що ви в мені розчаровані... як мінімум, це боляче.",

  date: "24 липня",
  likes: 0,
  comments: []
},

{
  title: "Кому цікаво?",

  text:
    "Мені просто захотілося сьогодні зліпити фігурку.",

  date: "23 липня",
  likes: 0,
  comments: []
},

{
  title: "Якщо я зникну",

  text:
    "Ви мене шукатимете?",

  date: "22 липня",
  likes: 57,

  comments: [
    {
      author: "copy_pasta",
      text: "Оце вже складне питання."
    },
    {
      author: "sakurai_agatsuma",
      text: "Не зникай 😰😭."
    },
    {
      author: "dreaming_romance",
      text: "Звісно шукатиму 😙."
    }
  ]
}

];


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

var STORAGE_KEY =
  "archat_copy_pasta_posts_v1";


function loadPosts(){

  try{

    var saved =
      localStorage.getItem(STORAGE_KEY);

    if(saved){

      var parsed =
        JSON.parse(saved);

      if(Array.isArray(parsed)){
        return parsed;
      }

    }

  }catch(error){

    console.warn(
      "Не вдалося завантажити пости:",
      error
    );

  }

  return DEFAULT_POSTS.map(function(post){

    return JSON.parse(
      JSON.stringify(post)
    );

  });

}


function savePosts(){

  try{

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(posts)
    );

  }catch(error){

    console.warn(
      "Не вдалося зберегти пости:",
      error
    );

  }

}


var posts = loadPosts();


/* =========================================================
   DOM
   ========================================================= */

var postsContainer =
  document.getElementById("copy-posts");

var postsCount =
  document.getElementById("posts-count");

var showMore =
  document.getElementById("show-more-posts");

var visiblePosts = 3;

var postsPerClick = 5;


/* =========================================================
   ПРОФІЛЬ
   ========================================================= */

document.getElementById(
  "profile-name"
).textContent = PROFILE.displayName;

document.getElementById(
  "profile-header-name"
).textContent = PROFILE.displayName;

document.getElementById(
  "profile-info-name"
).textContent = PROFILE.displayName;

document.getElementById(
  "profile-status"
).textContent = PROFILE.status;

document.getElementById(
  "profile-avatar"
).src = PROFILE.avatar;

document.getElementById(
  "profile-avatar"
).alt = PROFILE.displayName;


/* =========================================================
   ПОБУДОВА ПОСТУ
   ========================================================= */

function createPostElement(post,index){

  var article =
    document.createElement("div");

  article.className =
    "profile-post";


  /* TITLE */

  var title =
    document.createElement("div");

  title.className =
    "profile-post-title";

  title.textContent =
    post.title || "";


  /* BODY */

  var body =
    document.createElement("div");

  body.className =
    "profile-post-body";

  body.textContent =
    post.text || "";


  /* IMAGES */

  if(
    post.images &&
    post.images.length
  ){

    var gallery =
      document.createElement("div");

    gallery.className =
      "post-images-grid";


    post.images.forEach(function(imageSrc,imageIndex){

      var frame =
        document.createElement("div");

      frame.className =
        "post-image-frame";


      var image =
        document.createElement("img");

      image.className =
        "profile-post-image";

      image.src =
        imageSrc;

      image.alt =
        post.title || "Зображення допису";

      image.title =
        "Натисни, щоб переглянути";


      image.addEventListener(
        "click",
        function(){

          openImageViewer(
            post.images,
            imageIndex
          );

        }
      );


      frame.appendChild(image);

      gallery.appendChild(frame);

    });


    body.appendChild(gallery);

  }


  /* ACTIONS */

  var actions =
    document.createElement("div");

  actions.className =
    "post-actions";


  var like =
    document.createElement("button");

  like.type = "button";

  like.className =
    "like-button";

  like.innerHTML =
    "♡ Подобається " +
    '<span class="like-count">' +
    Number(post.likes || 0).toLocaleString("uk-UA") +
    "</span>";


  like.addEventListener(
    "click",
    function(){

      if(
        like.classList.contains("liked")
      ){

        post.likes =
          Math.max(
            0,
            Number(post.likes || 0) - 1
          );

        like.classList.remove("liked");

      }else{

        post.likes =
          Number(post.likes || 0) + 1;

        like.classList.add("liked");

      }


      like.querySelector(
        ".like-count"
      ).textContent =
        Number(post.likes).toLocaleString("uk-UA");


      savePosts();

    }
  );


  var commentButton =
    document.createElement("button");

  commentButton.type = "button";

  commentButton.className =
    "comment-button";

  commentButton.innerHTML =
    "💬 Коментарі " +
    '<span class="comment-count">' +
    (post.comments || []).length +
    "</span>";


  actions.appendChild(like);

  actions.appendChild(
    commentButton
  );


  /* COMMENTS */

  var commentsArea =
    document.createElement("div");

  commentsArea.className =
    "comments-area";


  function renderComments(){

    commentsArea.innerHTML = "";


    (post.comments || []).forEach(
      function(comment){

        var commentBox =
          document.createElement("div");

        commentBox.className =
          "fake-comment";


        var name =
          document.createElement("div");

        name.className =
          "fake-comment-name";

        name.textContent =
          comment.author;


        commentBox.appendChild(name);

        commentBox.appendChild(
          document.createTextNode(
            comment.text
          )
        );


        commentsArea.appendChild(
          commentBox
        );

      }
    );


    var form =
      document.createElement("div");

    form.className =
      "comment-form";


    var input =
      document.createElement("textarea");

    input.className =
      "comment-input";

    input.placeholder =
      "Написати коментар...";


    var send =
      document.createElement("button");

    send.type = "button";

    send.className =
      "comment-send";

    send.textContent =
      "Відправити";


    send.addEventListener(
      "click",
      function(){

        var text =
          input.value.trim();

        if(!text){
          return;
        }


        if(!post.comments){
          post.comments = [];
        }


        post.comments.push({
          author: "ти",
          text: text
        });


        input.value = "";

        savePosts();

        renderComments();

        commentsArea.classList.add(
          "open"
        );


        commentButton.querySelector(
          ".comment-count"
        ).textContent =
          post.comments.length;

      }
    );


    form.appendChild(input);

    form.appendChild(send);

    commentsArea.appendChild(form);

  }


  renderComments();


  commentButton.addEventListener(
    "click",
    function(){

      commentsArea.classList.toggle(
        "open"
      );

    }
  );


  /* DATE */

  var date =
    document.createElement("div");

  date.className =
    "profile-post-date";

  date.textContent =
    post.date || "щойно";


  /* ASSEMBLE */

  article.appendChild(title);

  article.appendChild(body);

  article.appendChild(actions);

  article.appendChild(commentsArea);

  article.appendChild(date);


  return article;

}


/* =========================================================
   ПОКАЗ ПОСТІВ
   ========================================================= */

function renderPosts(){

  postsContainer.innerHTML = "";

  postsCount.textContent =
    posts.length;


  posts.forEach(function(post,index){

    var element =
      createPostElement(
        post,
        index
      );


    if(index >= visiblePosts){

      element.style.display =
        "none";

    }


    postsContainer.appendChild(
      element
    );

  });


  if(
    visiblePosts >= posts.length
  ){

    showMore.className =
      "show-more hidden";

  }else{

    showMore.className =
      "show-more";

  }

}


showMore.addEventListener(
  "click",
  function(){

    visiblePosts +=
      postsPerClick;


    if(
      visiblePosts > posts.length
    ){

      visiblePosts =
        posts.length;

    }


    renderPosts();

  }
);


/* =========================================================
   НОВИЙ ДОПИС
   ========================================================= */

var launcher =
  document.getElementById(
    "new-post-launcher"
  );

var createBox =
  document.getElementById(
    "create-post-box"
  );

var titleInput =
  document.getElementById(
    "new-post-title"
  );

var textInput =
  document.getElementById(
    "new-post-text"
  );

var imageInput =
  document.getElementById(
    "new-post-images"
  );

var previews =
  document.getElementById(
    "new-post-previews"
  );

var publishButton =
  document.getElementById(
    "publish-post"
  );

var cancelButton =
  document.getElementById(
    "cancel-new-post"
  );

var errorBox =
  document.getElementById(
    "create-post-error"
  );


var selectedImages = [];

var MAX_IMAGE_SIZE =
  10 * 1024 * 1024;


var ALLOWED_TYPES = {
  "image/jpeg": true,
  "image/png": true,
  "image/gif": true,
  "image/webp": true
};


/* =========================================================
   ПОМИЛКА
   ========================================================= */

function showError(text){

  errorBox.textContent =
    text || "";

  errorBox.className =
    text
      ? "create-post-error open"
      : "create-post-error";

}


/* =========================================================
   ПРЕВ'Ю ЗОБРАЖЕНЬ
   ========================================================= */

function renderPreviews(){

  previews.innerHTML = "";


  selectedImages.forEach(
    function(item,index){

      var frame =
        document.createElement("div");

      frame.className =
        "create-post-preview-frame";


      var image =
        document.createElement("img");

      image.className =
        "create-post-preview-image";

      image.src =
        item.url;

      image.alt =
        item.name;


      var remove =
        document.createElement("button");

      remove.type = "button";

      remove.className =
        "create-post-preview-remove";

      remove.textContent =
        "✕";


      remove.addEventListener(
        "click",
        function(){

          URL.revokeObjectURL(
            selectedImages[index].url
          );

          selectedImages.splice(
            index,
            1
          );

          renderPreviews();

        }
      );


      var name =
        document.createElement("div");

      name.className =
        "create-post-preview-name";

      name.textContent =
        item.name;


      frame.appendChild(image);

      frame.appendChild(remove);

      frame.appendChild(name);

      previews.appendChild(frame);

    }
  );

}


/* =========================================================
   ВИБІР ФАЙЛІВ
   ========================================================= */

imageInput.addEventListener(
  "change",
  function(){

    showError("");

    Array.prototype.forEach.call(
      imageInput.files,
      function(file){

        if(
          !ALLOWED_TYPES[file.type]
        ){

          showError(
            "Дозволені лише JPG, PNG, GIF та WebP."
          );

          return;

        }


        if(
          file.size > MAX_IMAGE_SIZE
        ){

          showError(
            "Зображення «" +
            file.name +
            "» завелике. Максимум — 10 МБ."
          );

          return;

        }


        selectedImages.push({
          name: file.name,
          url: URL.createObjectURL(file)
        });

      }
    );


    imageInput.value = "";

    renderPreviews();

  }
);


/* =========================================================
   ВІДКРИТТЯ ФОРМИ
   ========================================================= */

launcher.addEventListener(
  "click",
  function(){

    createBox.classList.toggle(
      "collapsed"
    );


    if(
      !createBox.classList.contains(
        "collapsed"
      )
    ){

      titleInput.focus();

    }

  }
);


/* =========================================================
   СКАСУВАННЯ
   ========================================================= */

cancelButton.addEventListener(
  "click",
  function(){

    selectedImages.forEach(
      function(image){

        URL.revokeObjectURL(
          image.url
        );

      }
    );


    selectedImages = [];

    titleInput.value = "";

    textInput.value = "";

    previews.innerHTML = "";

    showError("");

    createBox.classList.add(
      "collapsed"
    );

  }
);


/* =========================================================
   ОПУБЛІКУВАТИ
   ========================================================= */

publishButton.addEventListener(
  "click",
  function(){

    var title =
      titleInput.value.trim();

    var text =
      textInput.value.trim();


    showError("");


    if(!title){

      showError(
        "Введи заголовок допису."
      );

      titleInput.focus();

      return;

    }


    if(!text){

      showError(
        "Введи текст допису."
      );

      textInput.focus();

      return;

    }


    var newPost = {

      id:
        "post_" +
        Date.now(),

      title: title,

      text: text,

      date: "щойно",

      likes: 0,

      comments: [],

      images:
        selectedImages.map(
          function(image){
            return image.url;
          }
        )

    };


    posts.unshift(
      newPost
    );


    /*
      Новий пост завжди зверху.
    */

    visiblePosts =
      Math.max(
        visiblePosts,
        3
      );


    savePosts();


    /*
      Очищення форми.
    */

    selectedImages = [];

    titleInput.value = "";

    textInput.value = "";

    previews.innerHTML = "";

    createBox.classList.add(
      "collapsed"
    );


    /*
      Перемальовуємо всю стрічку.
    */

    renderPosts();

  }
);


/* =========================================================
   ПЕРЕГЛЯД ЗОБРАЖЕНЬ
   ========================================================= */

var viewer =
  document.getElementById(
    "post-image-viewer"
  );

var viewerImage =
  document.getElementById(
    "post-image-viewer-image"
  );

var viewerPrev =
  document.getElementById(
    "post-image-viewer-prev"
  );

var viewerNext =
  document.getElementById(
    "post-image-viewer-next"
  );

var viewerClose =
  document.getElementById(
    "post-image-viewer-close"
  );


var viewerImages = [];

var viewerIndex = 0;


function renderViewer(){

  if(!viewerImages.length){
    return;
  }


  viewerImage.src =
    viewerImages[viewerIndex];


  viewerPrev.style.display =
    viewerImages.length > 1
      ? "block"
      : "none";


  viewerNext.style.display =
    viewerImages.length > 1
      ? "block"
      : "none";

}


function openImageViewer(
  images,
  index
){

  viewerImages =
    images.slice();

  viewerIndex =
    index || 0;

  renderViewer();

  viewer.className =
    "image-viewer open";

}


function closeViewer(){

  viewer.className =
    "image-viewer";

  viewerImage.removeAttribute(
    "src"
  );

  viewerImages = [];

  viewerIndex = 0;

}


viewerClose.addEventListener(
  "click",
  closeViewer
);


viewerPrev.addEventListener(
  "click",
  function(){

    viewerIndex =
      (
        viewerIndex -
        1 +
        viewerImages.length
      ) %
      viewerImages.length;

    renderViewer();

  }
);


viewerNext.addEventListener(
  "click",
  function(){

    viewerIndex =
      (
        viewerIndex +
        1
      ) %
      viewerImages.length;

    renderViewer();

  }
);


viewer.addEventListener(
  "click",
  function(event){

    if(
      event.target === viewer
    ){

      closeViewer();

    }

  }
);


document.addEventListener(
  "keydown",
  function(event){

    if(
      viewer.className.indexOf(
        "open"
      ) === -1
    ){

      return;

    }


    if(event.key === "Escape"){

      closeViewer();

    }


    if(event.key === "ArrowLeft"){

      viewerPrev.click();

    }


    if(event.key === "ArrowRight"){

      viewerNext.click();

    }

  }
);


/* =========================================================
   СТАТИСТИКА
   ========================================================= */

function safeNumber(
  base,
  range
){

  var value;


  do{

    value =
      base +
      Math.floor(
        Math.random() * range
      );

  }while(

    String(value).indexOf("63") !== -1 ||
    String(value).indexOf("68") !== -1 ||
    String(value).indexOf("13") !== -1 ||
    String(value).indexOf("666") !== -1

  );


  return value;

}


function updateStatistics(){

  document.getElementById(
    "registered-hoomen"
  ).textContent =
    safeNumber(
      8000000,
      47001
    ).toLocaleString("uk-UA");


  document.getElementById(
    "online-hoomen"
  ).textContent =
    safeNumber(
      1000000,
      76001
    ).toLocaleString("uk-UA");


  document.getElementById(
    "today-hoomen"
  ).textContent =
    safeNumber(
      2400000,
      180001
    ).toLocaleString("uk-UA");

}


/* =========================================================
   СТАРТ
   ========================================================= */

renderPosts();

updateStatistics();

setInterval(
  updateStatistics,
  30000
);

})();
