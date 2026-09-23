const REALISTIC_NAMES_LIST = [
    "Aarav_Sharma99", "Rahul_Verma_OP", "Priya_Queen", "Kabir_LudoKing", "Rohan_Pro47",
    "Simran_Kaur", "Vikram_Rathore", "Ananya_Singh", "Rahul_Boss07", "Dev_Patel_Ace",
    "Neha_Gamer", "Aditya_Rajput", "Kavya_Star", "Arjun_Malhotra", "Riya_Sen_99",
    "Siddharth_J", "Sneha_Reddy", "Manish_Kumar9", "Pooja_Mehta", "Deepak_Chauhan",
    "Shreya_Roy", "Karan_Thakur", "Tanvi_Deshmukh", "Nikhil_Gupta", "Meera_Iyer",
    "Yash_Varma_7", "Pankaj_Bhardwaj", "Ankit_Agrawal", "Divya_Nair", "Harsh_Trivedi",
    "Suman_Das", "Alex_Thunder", "Leo_Striker", "David_King", "Sophie_Star",
    "Lucas_Viper", "Maya_Blaze", "Sam_Phantom", "Aryan_Sniper", "Isha_Vortex"
];

const REALISTIC_AVATAR_EMOJIS = [
    "👦", "👨", "👩", "👧", "🧔", "🧑‍𦱰", "👱‍♂️", "👱‍♀️", "🥷", "🤠", "👑", "🦁", "⚡", "🔥", "🎯", "🏆"
];

const REALISTIC_RANK_TAGS = [
    "Lvl 24 • 🇮🇳", "Lvl 38 • 🇮🇳", "Lvl 19 • 🇮🇳", "Lvl 42 • 👑", "Lvl 31 • 🔥",
    "Lvl 27 • 🇮🇳", "Lvl 35 • ⚡", "Lvl 22 • 🎯", "Lvl 45 • 🏆", "Lvl 29 • 🇮🇳"
];

const REALISTIC_CHAT_PHRASES = [
    "Well played! 👏",
    "Nice move! 🔥",
    "Oops! 😅",
    "Good luck! 🍀",
    "Hurry up! ⏰",
    "Thanks! 🙏",
    "Great shot! 🎯",
    "Tough luck! 😂",
    "Roll fast! 🎲"
];

window.RealisticPersonas = (function() {
    let usedNames = new Set();

    function getRandomPlayer(excludeNames = []) {
        let pool = REALISTIC_NAMES_LIST.filter(n => !usedNames.has(n) && !excludeNames.includes(n));
        if (pool.length === 0) {
            usedNames.clear();
            pool = REALISTIC_NAMES_LIST;
        }
        const name = pool[Math.floor(Math.random() * pool.length)];
        usedNames.add(name);

        const avatar = REALISTIC_AVATAR_EMOJIS[Math.floor(Math.random() * REALISTIC_AVATAR_EMOJIS.length)];
        const tag = REALISTIC_RANK_TAGS[Math.floor(Math.random() * REALISTIC_RANK_TAGS.length)];
        const level = Math.floor(Math.random() * 35) + 12;

        return {
            name: name,
            avatar: avatar,
            tag: tag,
            level: level,
            initials: name.substring(0, 2).toUpperCase()
        };
    }

    function resetPool() {
        usedNames.clear();
    }

    function triggerBotChatReaction(senderColor, triggerType = 'normal') {
        const profile = document.getElementById(`profile-${senderColor}`) || document.getElementById(`corner-${senderColor}`);
        if (!profile) return;

        let phrase = REALISTIC_CHAT_PHRASES[Math.floor(Math.random() * REALISTIC_CHAT_PHRASES.length)];
        if (triggerType === 'capture') {
            phrase = Math.random() > 0.5 ? "Got you! 🎯" : "Oops! 😅";
        } else if (triggerType === 'six') {
            phrase = Math.random() > 0.5 ? "Sixer! 🔥" : "Boom! 🎲";
        }

        let bubble = document.createElement('div');
        bubble.className = 'chat-speech-bubble';
        bubble.innerText = phrase;
        profile.style.position = 'relative';
        profile.appendChild(bubble);

        setTimeout(() => {
            if (bubble.parentElement) bubble.remove();
        }, 2800);
    }

    return {
        getRandomPlayer,
        resetPool,
        triggerBotChatReaction,
        chatPhrases: REALISTIC_CHAT_PHRASES
    };
})();
