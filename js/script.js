let services = [
    { id: "S001", name: "Юридична консультація", specialist: "Коваленко І.В.", usersM1: 150, usersM2: 120, cost: 1000, duration: 60 },
    { id: "S002", name: "Фінансовий аудит", specialist: "Шевченко О.М.", usersM1: 80, usersM2: 100, cost: 1500, duration: 120 },
    { id: "S003", name: "Маркетингові дослідження", specialist: "Іванов І.І.", usersM1: 200, usersM2: 200, cost: 1300, duration: 180 },
    { id: "S004", name: "HR-консалтинг", specialist: "Мельник О.С.", usersM1: 90, usersM2: 80, cost: 900, duration: 60 },
    { id: "S005", name: "Бухгалтерський супровід", specialist: "Петренко В.П.", usersM1: 110, usersM2: 150, cost: 1100, duration: 60 },
    { id: "S006", name: "Податковий консалтинг", specialist: "Іванов І.І.", usersM1: 300, usersM2: 250, cost: 1200, duration: 60 },
    { id: "S007", name: "Оцінка ризиків", specialist: "Сидоренко А.В.", usersM1: 120, usersM2: 130, cost: 1400, duration: 90 },
    { id: "S008", name: "Планування бюджету", specialist: "Петренко В.П.", usersM1: 60, usersM2: 60, cost: 800, duration: 45 },
    { id: "S009", name: "Веб-розробка платформи", specialist: "Коваленко І.В.", usersM1: 400, usersM2: 380, cost: 2000, duration: 240 },
    { id: "S010", name: "Комплексний фінансовий аналіз", specialist: "Шевченко О.М.", usersM1: 50, usersM2: 70, cost: 1500, duration: 130 }
];

function sortAndAverageDuration(arr) {
    let sorted = arr.splace().sort((a, b) => a.cost - b.cost);
    console.log("Відсортовані послуги за вартістю:", sorted);

    let costGroups = {};
    arr.forEach(s => {
        if (!costGroups[s.cost]) costGroups[s.cost] = { totalDuration: 0, count: 0 };
        costGroups[s.cost].totalDuration += s.duration;
        costGroups[s.cost].count += 1;
    });

    console.log("Середня тривалість для кожної вартості:");
    for (let cost in costGroups) {
        if (costGroups[cost].count > 1) {
            let avg = costGroups[cost].totalDuration / costGroups[cost].count;
            console.log(`Вартість ${cost} грн: Середня тривалість = ${avg.toFixed(1)} хв`);
        }
    }
}


function findMaxUsersM1(arr) {
    let maxService = arr.reduce((max, current) => (current.usersM1 > max.usersM1) ? current : max);
    console.log(`Послуга з макс. інтересом за Місяць 1: ID = ${maxService.id} (${maxService.name})`);
}

function addNewService(arr, newService) {
    let isMissingInfo = Object.values(newService).some(val => val === undefined || val === null || val === "");
    
    let sorted = arr.splice().sort((a, b) => b.cost - a.cost);

    if (isMissingInfo) {
        sorted.push(newService);
        console.log("Нову послугу додано в кінець (інформація неповна).");
    } else {
        let index = sorted.findIndex(s => s.cost < newService.cost);
        if (index === -1) sorted.push(newService);
        else sorted.splice(index, 0, newService);
        console.log("Нову послугу додано з урахуванням порядку спадання вартості.");
    }

    console.log("Виведено новий масив:", sorted)
}

function updateServiceCosts(arr) {
    console.log("Оновлена вартість послуг на наступний місяць:");
    let updatedServices = arr.map(s => {
        let newCost = s.cost;
        if (s.usersM1 < s.usersM2) newCost *= 1.15;
        else if (s.usersM1 > s.usersM2) newCost *= 0.95;
        
        return { name: s.name, cost: newCost.toFixed(2), specialist: s.specialist };
    });
    console.table(updatedServices);
}

sortAndAverageDuration(services);
findMaxUsersM1(services);
addNewService(services, { id: "S011", name: "Супровід договорів", specialist: "Коваленко І.В.", usersM1: 140, usersM2: 160, cost: 1200, duration: 60 });
updateServiceCosts(services);

class UserAccount {
    constructor(lastName, firstName, age, education, feedbackPurpose, inquiryDate, inquiryTime) {
        this.lastName = lastName;
        this.firstName = firstName;
        this.age = age;
        this.education = education;
        this.feedbackPurpose = feedbackPurpose;
        this.inquiryDate = new Date(inquiryDate); 
        this.inquiryTime = inquiryTime;
    }
}

let users = [
    new UserAccount("Шевченко", "Олег", 34, "Вища", "Співпраця", "2026-10-12", "14:30"),
    new UserAccount("Коваленко", "Ірина", 22, "Середня", "Скарга", "2026-10-15", "08:15"),
    new UserAccount("Мельник", "Анна", 45, "Вища", "Пропозиція", "2026-09-05", "11:00"),
    new UserAccount("Бойко", "Іван", 19, "Незакінчена вища", "Помилка на сайті", "2026-10-13", "19:45"),
    new UserAccount("Ткаченко", "Марія", 51, "Вища", "Інше", "2026-08-20", "16:20"),
    new UserAccount("Кравченко", "Петро", 28, "Середня спеціальна", "Співпраця", "2026-10-12", "10:00"),
    new UserAccount("Олійник", "Олена", 39, "Вища", "Пропозиція", "2026-10-01", "09:30"),
    new UserAccount("Поліщук", "Дмитро", 60, "Середня", "Скарга", "2026-07-11", "21:10"),
    new UserAccount("Лисенко", "Вікторія", 25, "Вища", "Співпраця", "2026-10-13", "14:30"),
    new UserAccount("Григоренко", "Максим", 31, "Вища", "Помилка на сайті", "2026-09-22", "15:00")
];

function findUsersByMonthAndTime(usersArr, targetMonth, targetTime) {
    let filtered = usersArr.filter(u => u.inquiryDate.getMonth() === (targetMonth - 1) && u.inquiryTime === targetTime);
    
    let monthName = "";
    switch (targetMonth) {
        case 1: monthName = "Січень"; break;
        case 2: monthName = "Лютий"; break;
        case 3: monthName = "Березень"; break;
        case 4: monthName = "Квітень"; break;
        case 5: monthName = "Травень"; break;
        case 6: monthName = "Червень"; break;
        case 7: monthName = "Липень"; break;
        case 8: monthName = "Серпень"; break;
        case 9: monthName = "Вересень"; break;
        case 10: monthName = "Жовтень"; break;
        case 11: monthName = "Листопад"; break;
        case 12: monthName = "Грудень"; break;
        default: monthName = "Невідомий місяць";
    }

    console.log(`Користувачі за місяць ${monthName} та час ${targetTime}:`, filtered);
}

function getMinAgeUserInfo(usersArr) {
    let minAgeUser = usersArr.reduce((min, current) => (current.age < min.age) ? current : min);
    console.log(`Мін. вік: ${minAgeUser.age}, Освіта: ${minAgeUser.education}, Ім'я: ${minAgeUser.firstName}`);
}

function analyzeWorkingHours(usersArr) {
    let working = { count: 0, totalAge: 0 };
    let nonWorking = { count: 0, totalAge: 0 };

    usersArr.forEach(u => {
        let hour = parseInt(u.inquiryTime.split(":")[0]);
        if (hour >= 9 && hour < 17) {
            working.count++;
            working.totalAge += u.age;
        } else {
            nonWorking.count++;
            nonWorking.totalAge += u.age;
        }
    });

    console.log("Робочий час:", working.count, "осіб, Середній вік:", (working.totalAge / working.count || 0).toFixed(1));
    console.log("Неробочий час:", nonWorking.count, "осіб, Середній вік:", (nonWorking.totalAge / nonWorking.count || 0).toFixed(1));
}

function sortAlphabeticallyAndPrintPurpose(usersArr) {
    let sortedUsers = usersArr.splice().sort((a, b) => a.lastName.localeCompare(b.lastName));
    console.log("Користувачі за алфавітом та їх мета звернення:");
    sortedUsers.forEach(u => {
        console.log(`${u.lastName} ${u.firstName} - Мета: ${u.feedbackPurpose}`);
    });
}

findUsersByMonthAndTime(users, 10, "14:30");
getMinAgeUserInfo(users);
analyzeWorkingHours(users);
sortAlphabeticallyAndPrintPurpose(users);
