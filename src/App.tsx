import { useState, useRef, useEffect } from 'react';
import { Users, MessageCircle, Crown, Sword, Coins, Home, Menu, X, Play } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  popular?: boolean;
  comingSoon?: boolean;
  tebexPackageId?: number; // optional direct package link
}

function App() {
  const [currentSection, setCurrentSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const serverIp = 'OUTCRAFT.NET';
  const [serverInfo, setServerInfo] = useState<any | null>(null);
  const discordInvite = 'https://discord.gg/MXDPQYMGUC';
  const [serverCopied, setServerCopied] = useState(false);
  const tebexStoreUrl: string | undefined = (() => {
    const raw = (import.meta as any)?.env?.VITE_TEBEX_STORE_URL as string | undefined;
    if (!raw) return undefined;
    return raw.replace(/^['"]|['"]$/g, '').trim();
  })();

  const products: Product[] = [
    // VIP Access
    { id: 'vip-sub', name: 'VIP Subscription', price: '9.99 EUR', category: 'vip', popular: true },
    { id: 'vip-month', name: 'VIP Single Month', price: '12.99 EUR', category: 'vip', popular: true },
    { id: 'vip-lifetime', name: 'VIP Life Long 🔥', price: '49.99 EUR', category: 'vip', popular: true },
    
    // War SMP Ranks
    { id: 'warrior', name: 'Warrior', price: '9.99 EUR', category: 'ranks'},
    { id: 'knight', name: 'Knight Rank', price: '19.99 EUR', category: 'ranks'},
    { id: 'legend', name: 'Legend Rank', price: '34.99 EUR', category: 'ranks'},
    { id: 'immortal', name: 'Immortal Rank', price: '59.99 EUR', category: 'ranks'},
    
    // War Coins
    { id: 'coins-1k', name: '1,000 WarCoins', price: '4.99 EUR', category: 'coins' },
    { id: 'coins-2k', name: '2,200 WarCoins', price: '9.99 EUR', category: 'coins' },
    { id: 'coins-5k', name: '5,000 WarCoins', price: '19.99 EUR', category: 'coins' },
    { id: 'coins-8k', name: '8,500 WarCoins', price: '29.99 EUR', category: 'coins' },
    { id: 'coins-14k', name: '14,000 WarCoins', price: '49.99 EUR', category: 'coins' },
  ];

  // Build package ID mapping from env first, then optional hard-coded fallback map
  const toEnvKey = (id: string) => id.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
  const envPkgMap: Record<string, number> = {};
  for (const p of products) {
    const key = `VITE_TEBEX_PKG_${toEnvKey(p.id)}`;
    const val = (import.meta as any)?.env?.[key];
    const num = val ? Number(val) : NaN;
    if (Number.isFinite(num) && num > 0) envPkgMap[p.id] = num as number;
  }
  // Optional static fallback map (leave empty unless you want code-based defaults)
  const fallbackPkgMap: Record<string, number> = {
    // 'vip-sub': 123456,
  };
  const tebexPackageMap: Record<string, number> = { ...fallbackPkgMap, ...envPkgMap };

  // featured products: popular ones first, then others; show up to 9
  const featuredProducts = [
    ...products.filter(p => p.popular && !p.comingSoon),
    ...products.filter(p => !p.popular && p.comingSoon),
  ].slice(0, 6);

  const addToCart = (_productId: string) => {
    const product = products.find(p => p.id === _productId);
    if (!product || product.comingSoon) return;

    const pkgId = product.tebexPackageId ?? tebexPackageMap[_productId];
    if (!tebexStoreUrl) {
      alert('Store is not configured yet. Ask the admin to set VITE_TEBEX_STORE_URL in .env and restart.');
      return;
    }
    const base = tebexStoreUrl.replace(/\/$/, '');
    const url = pkgId ? `${base}/package/${pkgId}` : base;
    window.location.href = url; // redirect in the same tab
  };

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'vip', label: 'VIP Access (events)', icon: Crown },
    { id: 'ranks', label: 'War SMP Ranks', icon: Sword },
    { id: 'coins', label: 'WAR COINS', icon: Coins },
    { id: 'about', label: 'About', icon: MessageCircle },
  ];

  // refs and state for animated sliding indicator in the desktop navbar
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  const updateIndicator = () => {
    const activeIndex = navigationItems.findIndex(i => i.id === currentSection);
    const btn = buttonRefs.current[activeIndex];
    const nav = navRef.current;
    if (btn && nav && nav.offsetWidth > 0) {
      const left = btn.offsetLeft;
      const width = btn.offsetWidth;
      setIndicator({ left, width, visible: true });
    } else {
      setIndicator(prev => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    // update on mount and when currentSection changes
    updateIndicator();
    // update on resize to keep indicator in sync
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection]);

  const copyServerIp = async () => {
    try {
      await navigator.clipboard.writeText(serverIp);
      setServerCopied(true);
      window.setTimeout(() => setServerCopied(false), 1800);
    } catch (e) {
      // fallback: try execCommand (older browsers) or silently fail
      try {
        const ta = document.createElement('textarea');
        ta.value = serverIp;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setServerCopied(true);
        window.setTimeout(() => setServerCopied(false), 1800);
      } catch {
        // ignore
      }
    }
  };

  // Fetch server status from mcapi.us and poll every 10 seconds
  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    const fetchStatus = async () => {
      try {
        // mcapi.us server status endpoint
        const res = await fetch(`https://mcapi.us/server/status?ip=${encodeURIComponent(serverIp)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setServerInfo({ ...data, lastUpdated: Date.now() });
      } catch (err: any) {
        if (!mounted) return;
        setServerInfo({ online: false, players: { now: 0, max: 0 }, error: err?.message || String(err), lastUpdated: Date.now() });
      } finally {
      }
    };

    // initial fetch
    fetchStatus();
    // poll every 10s
    timer = window.setInterval(fetchStatus, 10000);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [serverIp]);

  

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-black/60 backdrop-blur-sm border border-purple-500/10 rounded-lg p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {/* category icon */}
          <div className="bg-purple-600 rounded-full p-2 flex items-center justify-center">
            {product.category === 'vip' ? <Crown className="h-5 w-5 text-white" /> : product.category === 'ranks' ? <Sword className="h-5 w-5 text-white" /> : <Coins className="h-5 w-5 text-white" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{product.name}</h3>
            <div className="text-sm text-gray-300">{product.category.toUpperCase()}</div>
          </div>
        </div>

        <div className="space-y-2 text-right">
          {product.popular && (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full inline-block">
              🔥 MOST WANTED
            </div>
          )}
          {product.comingSoon && (
            <div className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full inline-block">
              COMING SOON
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-2xl font-bold text-purple-400">{product.price}</span>
        <button 
          onClick={() => addToCart(product.id)}
          disabled={product.comingSoon}
          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
            product.comingSoon 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white hover:transform hover:scale-105'
          }`}
        >
          {product.comingSoon ? 'Coming Soon' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'home':
        return (
          <div className="space-y-12">
            {/* About Us (logo left, text right) */}
            <div className="bg-gray-900 rounded-lg p-6 border border-purple-500/20">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="md:w-1/3 flex justify-center md:justify-start">
                  <img src="/Outcraft-logo.png" alt="Outcraft logo" className="h-40" />
                </div>

                <div className="md:w-2/3 text-gray-300">
                  <h2 className="text-3xl font-bold text-white mb-2">About Us</h2>
                  <p className="text-lg leading-relaxed">
                    OutCraft is a community-driven Minecraft server focused on competitive events, teamwork,
                    and fun experiences. We host regular events, offer exclusive VIP perks, and maintain an
                    active Discord where players can connect, get support, and stay up to date.
                  </p>
                </div>
              </div>
            </div>

            {/* Featured Products (moved below About) */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-8 text-center">Featured Products</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </div>
        );

      case 'vip':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">VIP Access Package</h1>
              <p className="text-purple-300 text-lg">Get priority access and exclusive perks!</p>
            </div>

            {/* VIP Benefits */}
            <div className="bg-gray-900 rounded-lg p-8 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-6">What You Get:</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-600 rounded-full p-1 mt-1">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-purple-400 font-semibold">Priority Event Access</h3>
                    <p className="text-gray-300">Skip the regular queue and join events faster. If the server is full, you'll be at the front of the queue ahead of non-VIP players.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-600 rounded-full p-1 mt-1">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-purple-400 font-semibold">Custom In-Game Tag</h3>
                    <p className="text-gray-300">Show off your VIP status with a unique name tag in-game.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-600 rounded-full p-1 mt-1">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-purple-400 font-semibold">Exclusive Discord Role</h3>
                    <p className="text-gray-300">Stand out in our Discord with a special VIP role and access to VIP-only channels.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Products */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.filter(p => p.category === 'vip' && !p.comingSoon).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* How It Works */}
            <div className="bg-gray-900 rounded-lg p-8 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-6">How It Works:</h2>
              <div className="space-y-4 text-gray-300">
                <p>1. After purchase, you will automatically receive a Discord role that grants you access to VIP channels and perks.</p>
                <p>2. For your custom in-game tag, create a ticket in our Discord server and provide your in-game username. Our team will assign your tag promptly.</p>
                <p>3. Enjoy instant access to all events—no waiting, no hassle!</p>
              </div>
            </div>
          </div>
        );

      case 'ranks':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">War SMP Ranks</h1>
              <p className="text-yellow-400 text-lg font-semibold">Coming Soon!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.filter(p => p.category === 'ranks' && !p.comingSoon).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        );

      case 'coins':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">WAR COINS</h1>
              <p className="text-purple-300 text-lg">Purchase WarCoins to enhance your gameplay experience!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.filter(p => p.category === 'coins' && !p.comingSoon).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">About</h1>
            </div>

            <div className="bg-gray-900 rounded-lg p-8 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-6">Welcome to our VIP Page!</h2>
              <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
                <p>
                  Here, you can purchase exclusive VIP access to get instant entry into our Minecraft events. 
                  As a VIP, you'll enjoy perks like priority server access, a custom in-game and Discord name, and much more!
                </p>
                <p>
                  If you have any questions about purchasing VIP or want to learn more about the benefits, 
                  feel free to check out our knowledge base for helpful guides or reach out to us through the support page.
                </p>
                <p className="font-semibold text-purple-400">
                  Complete your purchase by heading over to the VIP section of our webstore!
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#4D1864FF] to-black">
      {/* Header wrapper provides edge padding */}
      <div className="w-full px-4 py-4 flex flex-col items-center">
        <div className="relative w-full mt-36">
          <div className="container mx-auto px-4 relative">
            {/* server box aligned to container left */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
              <div
                role="button"
                title="Click to Copy IP"
                onClick={copyServerIp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copyServerIp(); }}
                tabIndex={0}
                className="flex items-center space-x-3 bg-black/40 border border-purple-500/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-black/60 transition-all duration-150"
              >
                <div className="text-left">
                  {serverInfo == null ? (
                    <div className="text-sm text-yellow-400 font-semibold">Loading...</div>
                  ) : serverInfo?.online ? (
                    <div className="text-sm text-green-400 font-semibold">{serverInfo.players?.now ?? 0} Player{(serverInfo.players?.now ?? 0) === 1 ? '' : 's'} online</div>
                  ) : (
                    <div className="text-sm text-red-400 font-semibold">Server Offline</div>
                  )}

                  {serverCopied ? (
                    <div className="text-xs text-green-400 font-semibold">IP Copied</div>
                  ) : (
                    <div className="text-xs text-gray-300">{serverIp}</div>
                  )}
                </div>
                <div className="pl-4">
                  <Play className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>

            {/* logo above navbar */}
              <div className="mb-0">
                <img src="/Outcraft-logo.png" alt="Outcraft logo" className="h-60 mx-auto" />
              </div>

              {/* discord box aligned to container right */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                <div
                  role="button"
                  title="Click to open the invite link"
                  onClick={() => window.open(discordInvite, '_blank', 'noopener,noreferrer')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.open(discordInvite, '_blank', 'noopener,noreferrer'); }}
                  tabIndex={0}
                  className="flex items-center space-x-3 bg-black/40 border border-purple-500/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-black/60 transition-all duration-150"
                >
                  <div className="pl-1">
                    {/* inline Discord logo */}
                    <svg className="h-6 w-6 text-[#5561EA]" viewBox="0 -28.5 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="currentColor" fillRule="nonzero"> </path> <path d="M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="transparent" fillRule="nonzero"> </path> </g> </g></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-white font-semibold">Join our Discord Server</div>
                    <div className="text-xs text-gray-300">Click to open the invite link</div>
                  </div>
                </div>
              </div>
          </div>
        </div>

        <header style={{ marginTop: 10 }} className="bg-black/40 backdrop-blur-md border border-purple-500/10 rounded-2xl px-4 py-3 inline-flex items-center sticky z-50 shadow-sm">


          {/* center: navigation */}
          <nav ref={navRef as any} className="hidden lg:flex items-center space-x-4 mx-auto relative">
            {/* sliding indicator */}
            <div
              aria-hidden
              className={`absolute top-0 bottom-0 rounded-lg bg-purple-600/90 transition-all duration-300 ease-out pointer-events-none ${indicator.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: indicator.left,
                width: indicator.width,
              }}
            />

            {navigationItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={el => (buttonRefs.current[idx] = el)}
                  onClick={() => setCurrentSection(item.id)}
                  className={`relative z-10 flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    currentSection === item.id
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* previously the server box was here; moved above the logo */}

          {/* right: actions */}
          <div className="flex items-center space-x-3 ml-auto">

            <button 
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation expanded beneath the glass panel when open */}
        {mobileMenuOpen && (
          <div className="mt-3 px-3 lg:hidden flex justify-center">
            <nav className="inline-block bg-black/40 backdrop-blur-md border border-purple-500/10 rounded-xl p-3 w-max">
              <div className="space-y-2">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                        currentSection === item.id
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}
      </div>

  {/* small toast for copy success (removed) */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-black/80 border-t border-purple-500/20 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4 ">
            <img src="/Outcraft-logo.png" alt="Outcraft logo" className="h-20 mx-auto" />
            
          </div>
          <p className="text-purple-400 mt-2">
            <a href="https://discord.gg/MXDPQYMGUC" className="hover:text-purple-300">Join our Discord</a>
          </p>
          <p className="text-gray-400">© 2025 OutCraft. All rights reserved.</p>

        </div>
      </footer>
    </div>
  );
}

export default App;