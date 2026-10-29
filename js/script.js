document.addEventListener("DOMContentLoaded", () => {

    const typingContainer = document.getElementById("typing-container");
    const mainTitle = document.getElementById("main-title");
    const carouselImg = document.getElementById('carousel-img');
    const modal = document.getElementById('diagnostic-modal');
    const modalQuestion = document.getElementById('modal-question');

    const detailsInput = document.querySelector("#details-input");
    const detailsTooltip = document.querySelector("#details-tooltip");
    
    const serviceItems = document.querySelectorAll('.service li');


    if (typingContainer && mainTitle) {
        const textToType = "Вітаємо з прийдешніми святами! Графік роботи: 09:00 - 18:00. Змін немає.";
        let charIndex = 0;
        
        const titleWeight = parseInt(window.getComputedStyle(mainTitle).fontWeight); 
        typingContainer.style.fontWeight = Math.min(900, Math.round(titleWeight * 1.5)).toString();

        function typeWriter() {
            if (charIndex < textToType.length) {
                typingContainer.innerHTML += textToType.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriter, 100);
            }
        }
        setTimeout(typeWriter, 500);
    }


    if (carouselImg) {
        const images = [
            "images/juridical_consult.jpg",
            "images/finance_aud.jpg",
            "images/market_research.jpg",
            "images/HR_consult.jpg",
            "images/accounting_support.jpg"
        ];
        let currentImgIndex = 0;

        setInterval(() => {
            currentImgIndex = (currentImgIndex + 1) % images.length;
            carouselImg.style.opacity = 0;
            setTimeout(() => {
                carouselImg.setAttribute("src", images[currentImgIndex]);
                carouselImg.style.opacity = 1;
            }, 500);
        }, 3000);
    }


    const serviceQuestions = {
        "Юридична консультація": "Які саме юридичні питання або ризики для бізнесу вас турбують?",
        "Фінансовий аудит": "Чи маєте ви потреби в перевірці фінансової звітності або оптимізації витрат?",
        "Маркетингові дослідження": "Яка саме цільова аудиторія чи ринок вас цікавить для дослідження?",
        "HR-консалтинг": "Які складнощі виникають при підборі персоналу чи оцінці ефективності?",
        "Бухгалтерський супровід": "Вам потрібен супровід для ФОП чи ТОВ?"
    };

    if (serviceItems.length > 0 && modal) {
        let focusTimer;
        const TIME_TO_WAIT = 40000;

        serviceItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const serviceTitle = item.querySelector('h3')?.innerText.trim();
                
                focusTimer = setTimeout(() => {
                    if (modalQuestion && serviceQuestions[serviceTitle]) {
                        modalQuestion.innerText = serviceQuestions[serviceTitle];
                    }
                    modal.style.display = 'block';
                }, TIME_TO_WAIT);
            });

            item.onmouseleave = function() {
                clearTimeout(focusTimer);
            };
        });
    }

    if (detailsInput && detailsTooltip) {
        detailsInput.addEventListener("mouseenter", () => {
            detailsTooltip.style.display = "block";
        });
        detailsInput.onmouseleave = function() {
            detailsTooltip.style.display = "none";
        };
    }

    const currentHour = new Date().getHours();
    const backgroundToChange = document.querySelectorAll('header, .purpose, aside, table, th, td, .contacts, .service li, .feedback-form, .personal-info');

    if (currentHour >= 6 && currentHour < 21) {
        document.body.style.backgroundColor = "#f0f4f8"; 
        backgroundToChange.forEach(el => {
            el.style.backgroundColor = "#ffffff";
        });
    } else {
        document.body.style.backgroundColor = "#a8abb2"; 
        backgroundToChange.forEach(el => {
            el.style.backgroundColor = "#b2b2b2"; 
        });
    }
});