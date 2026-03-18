import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/72af640a-e337-4659-9be0-c254a28e3009/files/aa312d24-4feb-4c10-b438-8d3d6ea74231.jpg";

const GAME_MODES = [
  { id: 1, name: "Deathmatch", icon: "Crosshair", desc: "Уничтожь всех противников", players: "10 игроков", time: "5 мин", color: "#e63946" },
  { id: 2, name: "Штурм", icon: "Shield", desc: "Атакуй и защищай точки", players: "5 vs 5", time: "10 мин", color: "#f4a261" },
  { id: 3, name: "Снайпер", icon: "Target", desc: "Только снайперское оружие", players: "8 игроков", time: "7 мин", color: "#2a9d8f" },
  { id: 4, name: "Зомби", icon: "Skull", desc: "Выживи против орды", players: "12 игроков", time: "8 мин", color: "#6a0572" },
  { id: 5, name: "Захват флага", icon: "Flag", desc: "Захвати флаг врага", players: "5 vs 5", time: "15 мин", color: "#457b9d" },
  { id: 6, name: "Батл Рояль", icon: "Zap", desc: "Последний выживший побеждает", players: "50 игроков", time: "20 мин", color: "#e9c46a" },
];

const WEAPONS = [
  { name: "AK-47", type: "Штурм", dmg: 87, rate: 65, range: 72, rarity: "legendary", color: "#ffd700" },
  { name: "M4A1", type: "Штурм", dmg: 78, rate: 80, range: 75, rarity: "epic", color: "#b44ae0" },
  { name: "AWP", type: "Снайпер", dmg: 99, rate: 20, range: 98, rarity: "legendary", color: "#ffd700" },
  { name: "Desert Eagle", type: "Пистолет", dmg: 82, rate: 35, range: 55, rarity: "rare", color: "#4a90e2" },
  { name: "MP5", type: "Автомат", dmg: 60, rate: 90, range: 45, rarity: "uncommon", color: "#2ecc71" },
  { name: "SPAS-12", type: "Дробовик", dmg: 95, rate: 15, range: 30, rarity: "epic", color: "#b44ae0" },
];

const LEADERBOARD = [
  { rank: 1, name: "ShadowKiller_RU", kills: 4821, kd: "3.8", level: 89, clan: "ALPHA" },
  { rank: 2, name: "NightWolf99", kills: 4103, kd: "3.2", level: 76, clan: "OMEGA" },
  { rank: 3, name: "IronGhost", kills: 3987, kd: "2.9", level: 84, clan: "ALPHA" },
  { rank: 4, name: "BulletStorm", kills: 3654, kd: "2.7", level: 71, clan: "DELTA" },
  { rank: 5, name: "RedPhantom", kills: 3421, kd: "2.4", level: 68, clan: "SIGMA" },
];

const SKINS = [
  { name: "Кровавый закат", weapon: "AK-47", price: "2 490", rarity: "legendary", color: "#e63946" },
  { name: "Арктический волк", weapon: "M4A1", price: "1 890", rarity: "epic", color: "#b44ae0" },
  { name: "Тёмный охотник", weapon: "AWP", price: "3 290", rarity: "legendary", color: "#ffd700" },
  { name: "Полночный шторм", weapon: "MP5", price: "990", rarity: "rare", color: "#4a90e2" },
];

const TABS = ["Главная", "Режимы", "Арсенал", "Магазин", "Рейтинг"];

const rarityLabel: Record<string, string> = {
  legendary: "Легендарный",
  epic: "Эпический",
  rare: "Редкий",
  uncommon: "Необычный",
};

export default function Index() {
  const [activeTab, setActiveTab] = useState("Главная");
  const [particles, setParticles] = useState<{ x: number; y: number; id: number }[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("Гость");
  const [showNotif, setShowNotif] = useState(false);
  const [notifText, setNotifText] = useState("");
  const [searchingGame, setSearchingGame] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => {
        const filtered = prev.filter(p => p.id > Date.now() - 3000);
        if (Math.random() > 0.6) {
          return [...filtered, { x: Math.random() * 100, y: Math.random() * 100, id: Date.now() }];
        }
        return filtered;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (searchingGame) {
      timer = setInterval(() => setSearchTime(t => t + 1), 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(timer);
  }, [searchingGame]);

  const notify = (text: string) => {
    setNotifText(text);
    setShowNotif(true);
    setTimeout(() => setShowNotif(false), 3000);
  };

  const handlePlay = (modeId?: number) => {
    if (!loggedIn) {
      setLoginOpen(true);
      return;
    }
    setSearchingGame(true);
    setTimeout(() => {
      setSearchingGame(false);
      notify("Матч найден! Подключение к серверу...");
    }, 5000);
  };

  const handleLogin = () => {
    if (playerName.trim().length < 2) return;
    setCurrentUser(playerName.trim());
    setLoggedIn(true);
    setLoginOpen(false);
    notify(`Добро пожаловать, ${playerName.trim()}!`);
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden" style={{ fontFamily: "'Roboto', sans-serif" }}>
      {/* Notification */}
      <div className={`fixed top-6 right-6 z-[100] transition-all duration-500 ${showNotif ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20"}`}>
        <div className="bg-[#e63946] text-white px-6 py-3 text-sm tracking-widest uppercase shadow-2xl border border-red-700" style={{ fontFamily: "'Oswald', sans-serif" }}>
          {notifText}
        </div>
      </div>

      {/* Login Modal */}
      {loginOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111118] border border-[#e63946]/40 p-8 w-full max-w-sm shadow-2xl">
            <div className="text-[#e63946] text-2xl tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Войти в игру</div>
            <div className="text-gray-400 text-sm mb-6">Введи никнейм для входа</div>
            <input
              className="w-full bg-[#1a1a25] border border-[#333] text-white px-4 py-3 mb-4 outline-none focus:border-[#e63946] transition-colors"
              placeholder="Твой никнейм..."
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              maxLength={20}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-[#e63946] hover:bg-[#c62836] text-white py-3 tracking-widest uppercase text-sm transition-colors"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Войти
            </button>
            <button
              onClick={() => setLoginOpen(false)}
              className="w-full mt-3 text-gray-500 hover:text-white text-sm transition-colors py-2"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Searching Modal */}
      {searchingGame && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-[#e63946]/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-[#e63946] rounded-full animate-spin" />
              <Icon name="Crosshair" size={32} className="absolute inset-0 m-auto text-[#e63946]" />
            </div>
            <div className="text-3xl text-white tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Поиск матча</div>
            <div className="text-gray-400 mb-4">Игроков в очереди: 847</div>
            <div className="text-[#e63946] text-4xl tracking-widest" style={{ fontFamily: "'Oswald', sans-serif" }}>{formatTime(searchTime)}</div>
            <button
              onClick={() => setSearchingGame(false)}
              className="mt-8 border border-gray-600 hover:border-white text-gray-400 hover:text-white px-8 py-2 tracking-widest uppercase text-sm transition-all"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="text-2xl tracking-[0.3em] text-white uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
            STAND<span className="text-[#e63946]">OFF</span> 2
          </div>
          <div className="hidden md:flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm tracking-widest uppercase transition-all ${
                  activeTab === tab
                    ? "text-[#e63946] border-b-2 border-[#e63946]"
                    : "text-gray-400 hover:text-white"
                }`}
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {loggedIn ? (
              <div className="flex items-center gap-2 bg-[#1a1a25] px-4 py-2 border border-[#333]">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm tracking-widest text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>{currentUser}</span>
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="bg-[#e63946] hover:bg-[#c62836] text-white px-5 py-2 text-sm tracking-widest uppercase transition-colors"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      {activeTab === "Главная" && (
        <>
          <section className="relative min-h-screen flex items-center overflow-hidden">
            <div className="absolute inset-0">
              <img
                src={HERO_IMAGE}
                alt="hero"
                className="w-full h-full object-cover object-center opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
            </div>

            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particles.map(p => (
                <div
                  key={p.id}
                  className="absolute w-1 h-1 bg-[#e63946] rounded-full opacity-60"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, animation: "fadeUp 3s ease-out forwards" }}
                />
              ))}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-12 bg-[#e63946]" />
                  <span className="text-[#e63946] text-sm tracking-[0.3em] uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>Тактический шутер</span>
                </div>
                <h1 className="leading-none tracking-tight mb-4" style={{ fontFamily: "'Oswald', sans-serif", fontSize: "clamp(3rem, 10vw, 6rem)" }}>
                  STAND<span className="text-[#e63946]">OFF</span>
                  <br />
                  <span style={{ fontSize: "0.75em", color: "#d1d5db" }}>2</span>
                </h1>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed max-w-lg">
                  Intense tactical shooter. Молниеносные рефлексы. Стратегическое мышление. Победа любой ценой.
                </p>
                <div className="flex flex-wrap gap-4 mb-12">
                  <button
                    onClick={() => handlePlay()}
                    className="bg-[#e63946] hover:bg-[#c62836] text-white px-10 py-4 text-lg tracking-widest uppercase transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                    style={{ fontFamily: "'Oswald', sans-serif", boxShadow: "0 10px 40px rgba(230,57,70,0.3)" }}
                  >
                    <Icon name="Play" size={20} />
                    Играть сейчас
                  </button>
                  <button
                    onClick={() => setActiveTab("Режимы")}
                    className="border border-white/30 hover:border-white text-white px-10 py-4 text-lg tracking-widest uppercase transition-all hover:bg-white/10"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    Режимы игры
                  </button>
                </div>
                <div className="flex gap-8">
                  {[["12M+", "Игроков"], ["150+", "Стран"], ["6", "Режимов"], ["99.9%", "Аптайм"]].map(([val, label]) => (
                    <div key={label}>
                      <div className="text-2xl text-[#e63946]" style={{ fontFamily: "'Oswald', sans-serif" }}>{val}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="bg-[#0d0d14] py-20 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-12">
                <div className="text-4xl tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  Почему <span className="text-[#e63946]">Standoff 2</span>?
                </div>
                <div className="h-px w-24 bg-[#e63946] mx-auto" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: "Zap", title: "Молниеносный геймплей", desc: "Оптимизированный сервер с пингом менее 20ms. Никаких лагов в критические моменты." },
                  { icon: "Shield", title: "Античит система", desc: "Продвинутая защита от читеров. Честная игра для всех. Автоматические баны нарушителей." },
                  { icon: "Trophy", title: "Рейтинговые матчи", desc: "Соревновательная лига с сезонами. Зарабатывай ранги и получай эксклюзивные награды." },
                ].map(f => (
                  <div key={f.title} className="bg-[#111118] border border-white/5 p-8 hover:border-[#e63946]/30 transition-all group">
                    <div className="w-12 h-12 bg-[#e63946]/10 flex items-center justify-center mb-4 group-hover:bg-[#e63946]/20 transition-colors">
                      <Icon name={f.icon} size={24} className="text-[#e63946]" />
                    </div>
                    <div className="text-xl tracking-wide mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{f.title}</div>
                    <div className="text-gray-400 text-sm leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Quick modes */}
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-between mb-10">
                <div className="text-3xl tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>Режимы игры</div>
                <button
                  onClick={() => setActiveTab("Режимы")}
                  className="text-[#e63946] text-sm tracking-widest uppercase hover:text-white transition-colors"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  Все режимы →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {GAME_MODES.slice(0, 3).map(mode => (
                  <div
                    key={mode.id}
                    onClick={() => handlePlay(mode.id)}
                    className="bg-[#111118] border border-white/5 p-6 cursor-pointer hover:border-[#e63946]/40 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 flex items-center justify-center" style={{ background: `${mode.color}20` }}>
                        <Icon name={mode.icon} size={20} style={{ color: mode.color }} />
                      </div>
                      <div className="text-lg tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>{mode.name}</div>
                    </div>
                    <div className="text-gray-400 text-sm mb-3">{mode.desc}</div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-500">{mode.players}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500">{mode.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* MODES TAB */}
      {activeTab === "Режимы" && (
        <section className="min-h-screen pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <div className="text-5xl tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Режимы <span className="text-[#e63946]">игры</span>
              </div>
              <div className="h-px w-20 bg-[#e63946] mb-4" />
              <div className="text-gray-400">Выбери свой стиль боя</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {GAME_MODES.map(mode => (
                <div
                  key={mode.id}
                  className="relative bg-[#111118] border border-white/5 p-7 cursor-pointer transition-all hover:border-white/10 overflow-hidden"
                  onClick={() => handlePlay(mode.id)}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ background: mode.color }} />
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 flex items-center justify-center" style={{ background: `${mode.color}15` }}>
                      <Icon name={mode.icon} size={28} style={{ color: mode.color }} />
                    </div>
                    <button
                      className="text-xs tracking-widest uppercase py-1.5 px-4 border transition-all"
                      style={{ borderColor: mode.color, color: mode.color, fontFamily: "'Oswald', sans-serif" }}
                      onClick={e => { e.stopPropagation(); handlePlay(mode.id); }}
                    >
                      Играть
                    </button>
                  </div>
                  <div className="text-2xl tracking-wide mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{mode.name}</div>
                  <div className="text-gray-400 text-sm mb-5 leading-relaxed">{mode.desc}</div>
                  <div className="flex gap-5 text-xs">
                    <div>
                      <div className="text-gray-600 uppercase tracking-wider mb-1">Игроки</div>
                      <div className="text-white">{mode.players}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 uppercase tracking-wider mb-1">Время</div>
                      <div className="text-white">{mode.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ARSENAL TAB */}
      {activeTab === "Арсенал" && (
        <section className="min-h-screen pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <div className="text-5xl tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Арсе<span className="text-[#e63946]">нал</span>
              </div>
              <div className="h-px w-20 bg-[#e63946] mb-4" />
              <div className="text-gray-400">Выбери своё оружие</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {WEAPONS.map(w => (
                <div key={w.name} className="bg-[#111118] border border-white/5 p-6 hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xl tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>{w.name}</div>
                      <div className="text-gray-500 text-xs uppercase tracking-widest">{w.type}</div>
                    </div>
                    <div
                      className="text-xs tracking-widest px-2 py-1 uppercase"
                      style={{ color: w.color, background: `${w.color}15`, fontFamily: "'Oswald', sans-serif" }}
                    >
                      {rarityLabel[w.rarity]}
                    </div>
                  </div>
                  <div className="space-y-3 mb-5">
                    {([["Урон", w.dmg], ["Скорострельность", w.rate], ["Дальность", w.range]] as [string, number][]).map(([label, val]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 uppercase tracking-wider">{label}</span>
                          <span className="text-white">{val}</span>
                        </div>
                        <div className="h-1 bg-[#1a1a25] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: w.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => notify(`${w.name} экипирован!`)}
                    className="w-full border border-white/10 hover:border-white/30 text-gray-300 hover:text-white py-2 text-sm tracking-widest uppercase transition-all"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    Экипировать
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SHOP TAB */}
      {activeTab === "Магазин" && (
        <section className="min-h-screen pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <div className="text-5xl tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Мага<span className="text-[#e63946]">зин</span>
              </div>
              <div className="h-px w-20 bg-[#e63946] mb-4" />
              <div className="text-gray-400">Эксклюзивные скины и предметы</div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="bg-[#111118] border border-[#e63946]/20 px-6 py-3 flex items-center gap-3">
                <Icon name="Coins" size={20} className="text-yellow-400" />
                <span className="text-yellow-400 text-xl tracking-wider" style={{ fontFamily: "'Oswald', sans-serif" }}>5 000 монет</span>
              </div>
              <button
                onClick={() => notify("Пополнение баланса в разработке")}
                className="bg-[#e63946] hover:bg-[#c62836] text-white px-5 py-3 text-sm tracking-widest uppercase transition-colors"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                + Пополнить
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {SKINS.map(skin => (
                <div key={skin.name} className="bg-[#111118] border border-white/5 overflow-hidden hover:border-white/10 transition-all">
                  <div
                    className="h-40 flex items-center justify-center relative"
                    style={{ background: `linear-gradient(135deg, ${skin.color}10, ${skin.color}25)` }}
                  >
                    <div
                      className="absolute inset-0 opacity-5"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, ${skin.color} 0, ${skin.color} 1px, transparent 0, transparent 50%)`,
                        backgroundSize: "10px 10px"
                      }}
                    />
                    <Icon name="Crosshair" size={60} style={{ color: skin.color, opacity: 0.3 }} />
                    <div className="absolute top-3 right-3">
                      <div
                        className="text-xs tracking-widest px-2 py-0.5 uppercase"
                        style={{ color: skin.color, background: `${skin.color}20`, fontFamily: "'Oswald', sans-serif" }}
                      >
                        {rarityLabel[skin.rarity]}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-base tracking-wide mb-0.5" style={{ fontFamily: "'Oswald', sans-serif" }}>{skin.name}</div>
                    <div className="text-gray-500 text-xs mb-3">{skin.weapon}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon name="Coins" size={14} className="text-yellow-400" />
                        <span className="text-yellow-400 tracking-wider" style={{ fontFamily: "'Oswald', sans-serif" }}>{skin.price}</span>
                      </div>
                      <button
                        onClick={() => notify(`${skin.name} куплен!`)}
                        className="bg-[#e63946] hover:bg-[#c62836] text-white px-4 py-1.5 text-xs tracking-widest uppercase transition-colors"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        Купить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === "Рейтинг" && (
        <section className="min-h-screen pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="mb-10">
              <div className="text-5xl tracking-widest uppercase mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Рей<span className="text-[#e63946]">тинг</span>
              </div>
              <div className="h-px w-20 bg-[#e63946] mb-4" />
              <div className="text-gray-400">Топ игроков сезона</div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((player, i) => {
                const medals = ["🥈", "🥇", "🥉"];
                const isPodium1 = player.rank === 1;
                return (
                  <div
                    key={player.rank}
                    className={`bg-[#111118] border p-5 text-center transition-all ${isPodium1 ? "border-yellow-500/40 scale-105" : "border-white/5"}`}
                  >
                    <div className="text-3xl mb-2">{medals[i]}</div>
                    <div className="text-sm tracking-wide mb-1 truncate" style={{ fontFamily: "'Oswald', sans-serif" }}>{player.name}</div>
                    <div className="text-gray-500 text-xs mb-2">[{player.clan}]</div>
                    <div className="text-[#e63946]" style={{ fontFamily: "'Oswald', sans-serif" }}>{player.kills.toLocaleString()} kills</div>
                    <div className="text-gray-400 text-xs">K/D: {player.kd}</div>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#111118] border border-white/5 overflow-hidden">
              <div className="grid grid-cols-5 px-6 py-3 border-b border-white/5 text-gray-500 text-xs tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
                <span>#</span>
                <span className="col-span-2">Игрок</span>
                <span>Убийства</span>
                <span>K/D</span>
              </div>
              {LEADERBOARD.map(player => (
                <div key={player.rank} className="grid grid-cols-5 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center">
                  <div className="text-[#e63946] text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>{player.rank}</div>
                  <div className="col-span-2">
                    <div className="tracking-wide text-sm" style={{ fontFamily: "'Oswald', sans-serif" }}>{player.name}</div>
                    <div className="text-gray-600 text-xs">[{player.clan}] · Lv.{player.level}</div>
                  </div>
                  <div style={{ fontFamily: "'Oswald', sans-serif" }}>{player.kills.toLocaleString()}</div>
                  <div className="text-gray-300" style={{ fontFamily: "'Oswald', sans-serif" }}>{player.kd}</div>
                </div>
              ))}
            </div>

            {loggedIn && (
              <div className="mt-4 bg-[#e63946]/10 border border-[#e63946]/20 px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="tracking-wide text-sm" style={{ fontFamily: "'Oswald', sans-serif" }}>{currentUser}</div>
                  <div className="text-gray-500 text-xs">Твоя позиция: #4,821</div>
                </div>
                <div className="text-[#e63946]" style={{ fontFamily: "'Oswald', sans-serif" }}>127 kills</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl tracking-[0.3em] text-white uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
            STAND<span className="text-[#e63946]">OFF</span> 2
          </div>
          <div className="flex gap-6 text-gray-600 text-xs uppercase tracking-widest">
            <span className="hover:text-white cursor-pointer transition-colors">Поддержка</span>
            <span className="hover:text-white cursor-pointer transition-colors">Правила</span>
            <span className="hover:text-white cursor-pointer transition-colors">Конфиденциальность</span>
          </div>
          <div className="text-gray-700 text-xs">© 2026 Standoff 2. Все права защищены.</div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0.6; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-60px); }
        }
      `}</style>
    </div>
  );
}