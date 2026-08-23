(function() {
  "use strict";

  /* =====================================================
     КОНФІГ БОТІВ
     Тільки ці персонажі мають чат з ботом
     ===================================================== */
  var BOT_ENABLED_PERSONAGES = [
    "night_fox",
    "rusty_robot",
    "blue_comet"
  ];

  /* =====================================================
     ЕЛЕМЕНТИ DOM
     ===================================================== */
  var chatModal = document.getElementById("chat-modal");
  var chatSend = document.getElementById("chat-send");
  var chatInput = document.getElementById("chat-input");
  var chatMessages = document.getElementById("chat-messages");
  var chatClose = document.getElementById("chat-close");
  var archatBtn = document.getElementById("archat-btn");
  var messageBadge = document.getElementById("message-badge");
  var badgeCount = document.querySelector(".badge-count");

  if (!chatModal || !chatSend || !chatInput || !chatMessages) {
    console.error("Chat elements not found");
    return;
  }

  /* =====================================================
     ЗМІННІ
     ===================================================== */
  var personageNickname = (PROFILE_CONFIG && PROFILE_CONFIG.nickname) || "персонажем";
  var isBotEnabled = BOT_ENABLED_PERSONAGES.indexOf(personageNickname) !== -1;
  var dialogsData = [];
  var messages = [];
  var unreadCount = isBotEnabled ? 3 : 0;

  /* =====================================================
     ІНІЦІАЛІЗАЦІЯ
     ===================================================== */

  function init() {
    if (!isBotEnabled) {
      if (archatBtn) {
        archatBtn.style.opacity = "0.5";
        archatBtn.style.cursor = "not-allowed";
        archatBtn.title = "Чат не доступний для цього персонажа";
      }
      return;
    }

    loadDialogs();
    showBadge();
    setupEventListeners();
    showInitialMessages();
  }

  /* =====================================================
     ЗАВАНТАЖЕННЯ ДІАЛОГІВ З JSON
     ===================================================== */

  function loadDialogs() {
    var jsonUrl = "chats/" + personageNickname + ".json";

    fetch(jsonUrl)
      .then(function(response) {
        if (!response.ok) throw new Error("Dialogs not found");
        return response.json();
      })
      .then(function(data) {
        dialogsData = (data && data.dialogs) || [];
        console.log("Dialogs loaded for " + personageNickname + ":", dialogsData.length);
      })
      .catch(function(err) {
        console.warn("Error loading dialogs for " + personageNickname + ":", err);
        dialogsData = getDefaultDialogs();
      });
  }

  /* =====================================================
     СТАНДАРТНІ ДІАЛОГИ (якщо JSON не завантажився)
     ===================================================== */

  function getDefaultDialogs() {
    return [
      {
        user: "привіт",
        bot: "Привіт! 😊"
      },
      {
        user: "як справи",
        bot: "Чудово, дякую!"
      },
      {
        user: "хто ти",
        bot: "Я " + personageNickname + "!"
      },
      {
        user: "цікаво",
        bot: "Мені теж! 😄"
      }
    ];
  }

  /* =====================================================
     ПОКАЗ БЕЙДЖУ
     ===================================================== */

  function showBadge() {
    if (!messageBadge || !badgeCount) return;

    if (unreadCount > 0) {
      badgeCount.textContent = unreadCount;
      messageBadge.style.display = "flex";
    } else {
      messageBadge.style.display = "none";
    }
  }

  /* =====================================================
     ДОДАВАННЯ ПОВІДОМЛЕННЯ
     ===================================================== */

  function addMessage(text, isUser) {
    var msg = {
      text: text,
      isUser: isUser,
      time: new Date().toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };
    messages.push(msg);
    renderMessage(msg);
  }

  /* =====================================================
     РЕНДЕРИНГ ПОВІДОМЛЕННЯ
     ===================================================== */

  function renderMessage(msg) {
    var div = document.createElement("div");
    div.className = "chat-message " + (msg.isUser ? "user" : "bot");

    var textSpan = document.createElement("span");
    textSpan.textContent = msg.text;

    var timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = msg.time;

    div.appendChild(textSpan);
    div.appendChild(timeSpan);

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /* =====================================================
     ОТРИМАННЯ ВІДПОВІДІ БОТА
     ===================================================== */

  function getBotResponse(userText) {
    var lowerText = userText.toLowerCase().trim();

    // Шукаємо у завантажених діалогах
    for (var i = 0; i < dialogsData.length; i++) {
      var dialog = dialogsData[i];
      if (!dialog || !dialog.user || !dialog.bot) continue;

      var dialogKey = dialog.user.toLowerCase().trim();

      // Точний матч
      if (lowerText === dialogKey) {
        return dialog.bot;
      }

      // Часткове збігання (якщо діалог коротший за 30 символів)
      if (dialogKey.length < 30 && lowerText.indexOf(dialogKey) !== -1) {
        return dialog.bot;
      }
    }

    // Якщо не знайшли — random фраза
    var defaultResponses = [
      "Цікаво! 🤔",
      "Ага, розумію! 😊",
      "Хм, розповідай більше!",
      "Це смішно! 😄",
      "Не зовсім розумію, що ти маєш на думці?",
      "Оу! 👀",
      "Класно!",
      "А що ти маєш на думці?",
      "Ніколи про це не чув! 🤷",
      "Цікавий момент! ✨"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  /* =====================================================
     ВІДПРАВКА ПОВІДОМЛЕННЯ
     ===================================================== */

  function sendMessage() {
    var text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatInput.value = "";

    // Затримка перед відповіддю (для реалістичності)
    setTimeout(function() {
      var botResponse = getBotResponse(text);
      addMessage(botResponse, false);
    }, 300 + Math.random() * 400);
  }

  /* =====================================================
     EVENT LISTENERS
     ===================================================== */

  function setupEventListeners() {
    // Кнопка АРЧАТ
    if (archatBtn) {
      archatBtn.addEventListener("click", function(e) {
        e.preventDefault();
        openChat();
      });
    }

    // Закриття чату
    if (chatClose) {
      chatClose.addEventListener("click", closeChat);
    }

    // Кнопка відправки
    if (chatSend) {
      chatSend.addEventListener("click", sendMessage);
    }

    // Enter в input
    if (chatInput) {
      chatInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // Закриття при кліку на фон
    if (chatModal) {
      chatModal.addEventListener("click", function(e) {
        if (e.target === chatModal) {
          closeChat();
        }
      });
    }
  }

  /* =====================================================
     ВІДКРИТТЯ/ЗАКРИТТЯ ЧАТУ
     ===================================================== */

  function openChat() {
    if (!chatModal) return;

    var partnerNameEl = document.getElementById("chat-partner-name");
    if (partnerNameEl) {
      partnerNameEl.textContent = personageNickname;
    }

    chatModal.classList.add("open");
    unreadCount = 0;
    showBadge();

    if (chatInput) {
      setTimeout(function() {
        chatInput.focus();
      }, 100);
    }
  }

  function closeChat() {
    if (!chatModal) return;
    chatModal.classList.remove("open");
  }

  /* =====================================================
     СТАРТОВІ ПОВІДОМЛЕННЯ
     ===================================================== */

  function showInitialMessages() {
    setTimeout(function() {
      addMessage("Привіт! Як справи? 😊", false);
    }, 400);

    setTimeout(function() {
      addMessage("Давно не чув від тебе)", false);
    }, 1200);
  }

  /* =====================================================
     ЗАПУСК
     ===================================================== */

  init();
})();
