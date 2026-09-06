// =============================================================================
// ZINGARENA LUDO - "HOW TO PLAY" MULTI-LANGUAGE SYSTEM
// =============================================================================

const HowToPlayGuide = {
    currentLang: 'en',

    translations: {
        en: {
            title: "📖 How to Play Ludo",
            selectLang: "Choose Language",
            rulesTitle: "Rules & Game Modes",
            modes: [
                {
                    badge: "🎲 Classic Ludo",
                    content: "• Each player has 4 tokens in their yard.\n• Roll a 6 to bring a token onto the active board.\n• Tokens travel clockwise around the track and enter the home column.\n• All 4 tokens must reach the center triangle to win.\n• Landing on an opponent's token sends it back to their yard!\n• Safe stars (marked with a star icon) protect tokens from being captured.\n• Rolling a 6 or capturing an enemy token gives you an extra turn."
                },
                {
                    badge: "⚡ Quick Ludo Mode",
                    content: "• Fast 5-minute matches designed for quick fun.\n• Only 2 tokens need to reach home to win the match!\n• Keep pushing forward and play aggressively to capture enemy tokens."
                },
                {
                    badge: "🤝 2 vs 2 Team Up",
                    content: "• 4 Players divided into two teams: Red + Yellow vs Green + Blue.\n• Teammates cannot capture or cut each other's tokens!\n• Coordinate with your partner to trap opponents and protect team tokens."
                },
                {
                    badge: "🤖 Play vs Computer",
                    content: "• Play offline anytime without internet against smart AI bots.\n• AI bots roll the dice automatically and calculate intelligent moves in real time."
                },
                {
                    badge: "🎙️ Voice Chat & Throwable Emojis",
                    content: "• In Online multiplayer, tap the Mic button to talk with other players in real time.\n• Tap the Emoji & Chat button during a match to send quick tactical messages and throw fun emojis across the board!"
                },
                {
                    badge: "🏆 Pro Competition Mode",
                    content: "• Enter high-stakes tournaments using your Zing Tokens.\n• Win matches to claim huge prize pools and climb the weekly leaderboard."
                }
            ],
            closeBtn: "Close Guide"
        },
        hi: {
            title: "📖 लूडो कैसे खेलें",
            selectLang: "भाषा चुनें",
            rulesTitle: "नियम और गेम मोड्स",
            modes: [
                {
                    badge: "🎲 क्लासिक लूडो",
                    content: "• प्रत्येक खिलाड़ी के पास अपने यार्ड में 4 टोकन होते हैं।\n• पासे पर 6 आने पर टोकन बोर्ड पर बाहर आता है।\n• सभी टोकन दक्षिणावर्त दिशा में घूमकर होम कॉलम में पहुंचते हैं।\n• जीतने के लिए सभी 4 टोकन को होम में पहुंचाना होता है।\n• विरोधी के टोकन पर आने पर उसकी गोटी कटकर यार्ड में लौट जाती है।\n• स्टार वाले सुरक्षित स्थानों पर गोटी कट नहीं सकती।\n• 6 आने पर या विरोधी की गोटी काटने पर एक अतिरिक्त टर्न मिलता है।"
                },
                {
                    badge: "⚡ क्विक लूडो मोड",
                    content: "• तेज़ 5 मिनट का मैच।\n• मैच जीतने के लिए केवल 2 टोकन होम पहुंचाने होते हैं!\n• तेज़ी से खेलें और विरोधी की गोटी काटकर बढ़त बनाएं।"
                },
                {
                    badge: "🤝 2 vs 2 टीम मोड",
                    content: "• 4 खिलाड़ियों की 2 टीमें: लाल + पीला बनाम हरा + नीला।\n• दोनों पार्टनर एक-दूसरे की गोटी कट नहीं कर सकते!\n• अपने साथी के साथ मिलकर विरोधी टीम को हराएं।"
                },
                {
                    badge: "🤖 कंप्यूटर के साथ खेलें",
                    content: "• बिना इंटरनेट के कभी भी स्मार्ट AI बॉट्स के खिलाफ खेलें।\n• AI बॉट्स अपने आप पासा फेंकते हैं और रणनीतिक चालें चलते हैं।"
                },
                {
                    badge: "🎙️ वॉयस चैट और इमोजी",
                    content: "• ऑनलाइन मैच में माइक बटन दबाकर लाइव बातचीत करें।\n• मैच के दौरान मजेदार एनिमेटेड इमोजी और क्विक मैसेज भेजें।"
                },
                {
                    badge: "🏆 प्रो कॉम्पिटिशन मोड",
                    content: "• टोकन लगाकर बड़े टूर्नामेंट में भाग लें।\n• जीतें और वीकली लीडरबोर्ड पर टॉप रैंक हासिल करें।"
                }
            ],
            closeBtn: "बंद करें"
        },
        es: {
            title: "📖 Cómo Jugar al Ludo",
            selectLang: "Seleccionar Idioma",
            rulesTitle: "Reglas y Modos de Juego",
            modes: [
                {
                    badge: "🎲 Ludo Clásico",
                    content: "• Cada jugador tiene 4 fichas en su casa.\n• Saca un 6 para ingresar una ficha al tablero.\n• Las fichas viajan en el sentido de las agujas del reloj.\n• ¡Lleva tus 4 fichas a la meta central para ganar!\n• Caer en la ficha de un oponente la envía de regreso a su casa.\n• Las casillas con estrella son seguras contra capturas.\n• Sacar un 6 o capturar otorga un turno extra."
                },
                {
                    badge: "⚡ Modo Rápido (Quick Ludo)",
                    content: "• Partidas dinámicas de 5 minutos.\n• ¡Solo necesitas llevar 2 fichas a la meta para ganar!"
                },
                {
                    badge: "🤝 2 contra 2 en Equipo",
                    content: "• 4 jugadores en 2 equipos: Rojo + Amarillo vs Verde + Azul.\n• ¡Los compañeros de equipo nunca pueden capturar sus fichas!"
                },
                {
                    badge: "🤖 Jugar contra la Computadora",
                    content: "• Juega sin conexión a internet contra bots inteligentes que toman decisiones en tiempo real."
                },
                {
                    badge: "🎙️ Chat de Voz y Emojis",
                    content: "• Usa el micrófono para hablar en tiempo real y lanza divertidos emojis durante la partida."
                },
                {
                    badge: "🏆 Modo Competición Pro",
                    content: "• Compite con fichas en torneos de alto nivel y sube en la tabla de clasificación semanal."
                }
            ],
            closeBtn: "Cerrar Guía"
        },
        fr: {
            title: "📖 Comment Jouer aux Petits Chevaux",
            selectLang: "Choisir la Langue",
            rulesTitle: "Règles & Modes de Jeu",
            modes: [
                {
                    badge: "🎲 Ludo Classique",
                    content: "• Chaque joueur possède 4 pions dans son camp.\n• Obtenez un 6 avec le dé pour sortir un pion.\n• Faites le tour du plateau dans le sens horaire.\n• Les 4 pions doivent atteindre le centre pour remporter la partie.\n• Atterrir sur le pion d'un adversaire le renvoie à sa base.\n• Les cases étoilées sont des zones protégées."
                },
                {
                    badge: "⚡ Mode Ludo Rapide",
                    content: "• Matchs courts et intenses de 5 minutes.\n• Seulement 2 pions doivent entrer au centre pour gagner !"
                },
                {
                    badge: "🤝 Équipe 2 contre 2",
                    content: "• 4 joueurs répartis en 2 équipes : Rouge + Jaune contre Vert + Bleu.\n• Les coéquipiers ne peuvent jamais capturer leurs pions respectifs !"
                },
                {
                    badge: "🤖 Contre l'Ordinateur",
                    content: "• Jouez hors ligne contre des IA intelligentes à tout moment."
                },
                {
                    badge: "🎙️ Chat Vocal & Émojis",
                    content: "• Parlez en temps réel via le micro et envoyez des émojis animés sur le plateau."
                },
                {
                    badge: "🏆 Mode Compétition Pro",
                    content: "• Participez à des tournois, gagnez des jetons et hissez-vous au classement hebdomadaire."
                }
            ],
            closeBtn: "Fermer le Guide"
        },
        ar: {
            title: "📖 كيف تلعب لودو",
            selectLang: "اختر اللغة",
            rulesTitle: "القواعد وأنماط اللعب",
            modes: [
                {
                    badge: "🎲 لودو كلاسيك",
                    content: "• كل لاعب لديه 4 قطع في قاعدته.\n• تحتاج لرقم 6 لإخراج القطعة إلى لوحة اللعب.\n• تدور القطع باتجاه عقارب الساعة حتى تصل للمنزل.\n• أول لاعب يوصل جميع قطعه الـ 4 للمنتصف يفوز!\n• الهبوط على قطعة الخصم يعيدها لقاعدته.\n• المربعات التي تحتوي على نجمة آمنة من الأسر.\n• الحصول على 6 أو أسر قطعة يمنحك دوراً إضافياً."
                },
                {
                    badge: "⚡ الوضع السريع",
                    content: "• مباريات سريعة لمدة 5 دقائق.\n• إيصال قطعتين فقط إلى المنزل كافٍ للفوز بالمباراة!"
                },
                {
                    badge: "🤝 نمط الفريق 2 ضد 2",
                    content: "• 4 لاعبين في فريقين: أحمر + أصفر ضد أخضر + أزرق.\n• لا يمكن لزملاء الفريق أسر قطع بعضهم البعض!"
                },
                {
                    badge: "🤖 اللعب ضد الكمبيوتر",
                    content: "• العب بدون إنترنت ضد روبوتات ذكية تلعب تلقائياً وبمهارة عالية."
                },
                {
                    badge: "🎙️ الدردشة الصوتية والرموز",
                    content: "• تواصل صوتياً بضغطة زر وتفاعل بإرسال رموز تعبيرية متحركة."
                },
                {
                    badge: "🏆 وضع المنافسة الاحترافي",
                    content: "• شارك في بطولات للحصول على مكافآت وتصدر قائمة المتصدرين الأسبوعية."
                }
            ],
            closeBtn: "إغلاق الدليل"
        },
        bn: {
            title: "📖 লুডু খেলার নিয়ম",
            selectLang: "ভাষা নির্বাচন করুন",
            rulesTitle: "নিয়ম ও গেম মোড",
            modes: [
                {
                    badge: "🎲 ক্লাসিক লুডু",
                    content: "• প্রতিটি খেলোয়াড়ের ঘরে ৪টি ঘুঁটি থাকে।\n• ছক্কায় ৬ পড়লে ঘুঁটি বোর্ডে বের হয়।\n• সব ঘুঁটি ঘড়ির কাঁটার দিকে ঘুরে হোম কলামে পৌঁছায়।\n• জয়ের জন্য ৪টি ঘুঁটিই কেন্দ্রে নিয়ে যেতে হবে।\n• প্রতিপক্ষের ঘুঁটির উপর পড়লে তা কাটা যায়।\n• তারকা চিহ্নিত নিরাপদ স্থানে ঘুঁটি কাটা যায় না।\n• ৬ পড়লে বা ঘুঁটি কাটলে অতিরিক্ত চাল পাওয়া যায়।"
                },
                {
                    badge: "⚡ কুইক লুডু মোড",
                    content: "• দ্রুত ৫ মিনিটের উত্তেজনাপূর্ণ ম্যাচ।\n• মাত্র ২টি ঘুঁটি কেন্দ্রে নিয়ে গেলেই ম্যাচে জয়লাভ করা যায়!"
                },
                {
                    badge: "🤝 ২ বনাম ২ টিম মোড",
                    content: "• ৪ জন খেলোয়াড় ২ দলে বিভক্ত: লাল + হলুদ বনাম সবুজ + নীল।\n• দলের পার্টনাররা একে অপরের ঘুঁটি কাটতে পারে না!"
                },
                {
                    badge: "🤖 কম্পিউটারের সাথে খেলুন",
                    content: "• ইন্টারনেট ছাড়াই বুদ্ধিমান এআই বটের সাথে যে কোনো সময় খেলুন।"
                },
                {
                    badge: "🎙️ ভয়েস চ্যাট ও ইমোজি",
                    content: "• অনলাইনে মাইকের মাধ্যমে সরাসরি কথা বলুন এবং বোর্ডে ইমোজি পাঠান।"
                },
                {
                    badge: "🏆 প্রো কম্পিটিশন",
                    content: "• টোকেন দিয়ে টুর্নামেন্টে যোগ দিন এবং লিডারবোর্ডের শীর্ষে উঠুন।"
                }
            ],
            closeBtn: "বন্ধ করুন"
        }
    },

    openModal: function() {
        let modal = document.getElementById('how-to-play-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'how-to-play-modal';
            modal.className = 'modal';
            modal.style.zIndex = '99999';
            document.body.appendChild(modal);
        }

        this.renderContent();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    },

    closeModal: function() {
        const modal = document.getElementById('how-to-play-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    },

    switchLanguage: function(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            this.renderContent();
        }
    },

    renderContent: function() {
        const modal = document.getElementById('how-to-play-modal');
        if (!modal) return;

        const t = this.translations[this.currentLang] || this.translations.en;

        const languages = [
            { code: 'en', flag: '🇬🇧', label: 'English' },
            { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
            { code: 'es', flag: '🇪🇸', label: 'Español' },
            { code: 'fr', flag: '🇫🇷', label: 'Français' },
            { code: 'ar', flag: '🇸🇦', label: 'العربية' },
            { code: 'bn', flag: '🇧🇩', label: 'বাংলা' }
        ];

        let langButtonsHtml = languages.map(l => {
            const isActive = l.code === this.currentLang;
            const activeStyle = isActive 
                ? 'border: 2px solid #ffd700; background: rgba(234, 179, 8, 0.25); color: #ffd700; font-weight: 800;' 
                : 'border: 1px solid rgba(255,255,255,0.15); background: rgba(15,23,42,0.6); color: #cbd5e1;';
            return `<button onclick="HowToPlayGuide.switchLanguage('${l.code}')" style="padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s; ${activeStyle}">
                ${l.flag} ${l.label}
            </button>`;
        }).join('');

        let modesHtml = t.modes.map(m => {
            return `<div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; margin-bottom: 10px; text-align: left;">
                <div style="font-weight: 900; color: #ffd700; font-size: 14px; margin-bottom: 6px;">${m.badge}</div>
                <div style="font-size: 12px; color: #e2e8f0; line-height: 1.6; white-space: pre-line;">${m.content}</div>
            </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 480px; width: 92%; max-height: 85vh; display: flex; flex-direction: column; padding: 18px; border-radius: 16px; border: 2px solid #ffd700; background: linear-gradient(180deg, #1e293b, #0f172a); position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                <!-- Header with Close Cross -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                    <h2 style="color: #ffd700; font-size: 18px; font-weight: 900; margin: 0;">${t.title}</h2>
                    <button onclick="HowToPlayGuide.closeModal()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>

                <!-- Language Selector -->
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 6px; text-align: left;">🌐 ${t.selectLang}:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${langButtonsHtml}
                    </div>
                </div>

                <!-- Scrollable Body with Rules -->
                <div style="flex: 1; overflow-y: auto; padding-right: 4px; margin-bottom: 12px;">
                    ${modesHtml}
                </div>

                <!-- Footer Close Button -->
                <button onclick="HowToPlayGuide.closeModal()" class="ultra-roll-btn" style="width: 100%; padding: 10px; font-weight: 800; border-radius: 10px;">
                    ${t.closeBtn}
                </button>
            </div>
        `;
    }
};

window.HowToPlayGuide = HowToPlayGuide;
