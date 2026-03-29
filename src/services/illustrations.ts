export interface LocalIllustration {
  id: string
  name: string
  category: string
  tags: string[]
  svg: string
}

const illustrations: LocalIllustration[] = [
  // ── People ──────────────────────────────────────────
  {
    id: 'person-laptop',
    name: 'Working on Laptop',
    category: 'people',
    tags: ['person', 'laptop', 'work', 'remote', 'computer', 'desk', 'people'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="60" y="50" width="80" height="55" rx="4" fill="#4F46E5"/><rect x="65" y="55" width="70" height="40" rx="2" fill="#818CF8"/><polygon points="50,105 150,105 160,115 40,115" fill="#6366F1"/><circle cx="100" cy="30" r="18" fill="#FBBF24"/><rect x="88" y="48" width="24" height="8" rx="4" fill="#FBBF24"/><circle cx="94" cy="26" r="2" fill="#1F2937"/><circle cx="106" cy="26" r="2" fill="#1F2937"/><path d="M95 32 Q100 36 105 32" stroke="#1F2937" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="78" y="56" width="6" height="30" rx="3" fill="#FBBF24" transform="rotate(-20 81 71)"/><rect x="116" y="56" width="6" height="30" rx="3" fill="#FBBF24" transform="rotate(20 119 71)"/><rect x="80" y="115" width="16" height="35" rx="4" fill="#3B82F6"/><rect x="104" y="115" width="16" height="35" rx="4" fill="#3B82F6"/><rect x="78" y="145" width="20" height="10" rx="5" fill="#1F2937"/><rect x="102" y="145" width="20" height="10" rx="5" fill="#1F2937"/><rect x="75" y="60" width="50" height="8" rx="1" fill="#C7D2FE"/><rect x="75" y="72" width="35" height="4" rx="1" fill="#A5B4FC"/><rect x="75" y="80" width="45" height="4" rx="1" fill="#A5B4FC"/></svg>`,
  },
  {
    id: 'person-waving',
    name: 'Person Waving',
    category: 'people',
    tags: ['person', 'wave', 'hello', 'greeting', 'friendly', 'people', 'hi'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="40" r="22" fill="#F59E0B"/><circle cx="93" cy="36" r="2.5" fill="#1F2937"/><circle cx="107" cy="36" r="2.5" fill="#1F2937"/><path d="M94 46 Q100 51 106 46" stroke="#1F2937" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M85 25 Q90 15 100 18" stroke="#1F2937" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M115 25 Q110 15 100 18" stroke="#1F2937" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="85" y="62" width="30" height="45" rx="12" fill="#EC4899"/><rect x="70" y="65" width="10" height="35" rx="5" fill="#F59E0B" transform="rotate(15 75 65)"/><g transform="rotate(-30 130 65)"><rect x="115" y="62" width="10" height="35" rx="5" fill="#F59E0B"/><circle cx="120" cy="55" r="7" fill="#F59E0B"/></g><rect x="88" y="107" width="12" height="40" rx="5" fill="#3B82F6"/><rect x="102" y="107" width="12" height="40" rx="5" fill="#3B82F6"/><ellipse cx="94" cy="150" rx="10" ry="6" fill="#1F2937"/><ellipse cx="108" cy="150" rx="10" ry="6" fill="#1F2937"/><path d="M130 45 L140 35 M135 45 L145 40 M128 38 L138 30" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'team-group',
    name: 'Team Group',
    category: 'people',
    tags: ['team', 'group', 'people', 'collaboration', 'together', 'company'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="60" cy="60" r="18" fill="#F59E0B"/><circle cx="54" cy="56" r="2" fill="#1F2937"/><circle cx="66" cy="56" r="2" fill="#1F2937"/><path d="M55 64 Q60 68 65 64" stroke="#1F2937" stroke-width="1.5" fill="none"/><rect x="45" y="78" width="30" height="35" rx="10" fill="#3B82F6"/><rect x="48" y="113" width="10" height="30" rx="4" fill="#1E40AF"/><rect x="62" y="113" width="10" height="30" rx="4" fill="#1E40AF"/><circle cx="100" cy="50" r="20" fill="#FBBF24"/><circle cx="93" cy="46" r="2.5" fill="#1F2937"/><circle cx="107" cy="46" r="2.5" fill="#1F2937"/><path d="M94 54 Q100 59 106 54" stroke="#1F2937" stroke-width="1.5" fill="none"/><rect x="83" y="70" width="34" height="40" rx="12" fill="#EC4899"/><rect x="87" y="110" width="11" height="35" rx="4" fill="#BE185D"/><rect x="102" y="110" width="11" height="35" rx="4" fill="#BE185D"/><circle cx="140" cy="60" r="18" fill="#A78BFA"/><circle cx="134" cy="56" r="2" fill="#1F2937"/><circle cx="146" cy="56" r="2" fill="#1F2937"/><path d="M135 64 Q140 68 145 64" stroke="#1F2937" stroke-width="1.5" fill="none"/><rect x="125" y="78" width="30" height="35" rx="10" fill="#10B981"/><rect x="128" y="113" width="10" height="30" rx="4" fill="#047857"/><rect x="142" y="113" width="10" height="30" rx="4" fill="#047857"/></svg>`,
  },
  // ── Business ────────────────────────────────────────
  {
    id: 'growth-chart',
    name: 'Growth Chart',
    category: 'business',
    tags: ['chart', 'graph', 'growth', 'analytics', 'data', 'business', 'statistics', 'up'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="25" y="20" width="150" height="140" rx="10" fill="#F0FDF4"/><rect x="25" y="20" width="150" height="140" rx="10" stroke="#D1FAE5" stroke-width="2" fill="none"/><line x1="45" y1="140" x2="160" y2="140" stroke="#9CA3AF" stroke-width="1.5"/><line x1="45" y1="40" x2="45" y2="140" stroke="#9CA3AF" stroke-width="1.5"/><rect x="55" y="110" width="16" height="30" rx="3" fill="#86EFAC"/><rect x="80" y="90" width="16" height="50" rx="3" fill="#4ADE80"/><rect x="105" y="70" width="16" height="70" rx="3" fill="#22C55E"/><rect x="130" y="50" width="16" height="90" rx="3" fill="#16A34A"/><polyline points="63,105 88,82 113,62 138,42" fill="none" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="63" cy="105" r="4" fill="#F59E0B"/><circle cx="88" cy="82" r="4" fill="#F59E0B"/><circle cx="113" cy="62" r="4" fill="#F59E0B"/><circle cx="138" cy="42" r="4" fill="#F59E0B"/><polygon points="148,32 138,42 148,42" fill="#F59E0B"/><text x="100" y="175" text-anchor="middle" font-size="11" fill="#6B7280" font-family="sans-serif">Growth Trend</text></svg>`,
  },
  {
    id: 'target-goal',
    name: 'Target Goal',
    category: 'business',
    tags: ['target', 'goal', 'aim', 'focus', 'bullseye', 'objective', 'business'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="75" fill="#FEE2E2"/><circle cx="100" cy="100" r="58" fill="#FECACA"/><circle cx="100" cy="100" r="58" stroke="#FCA5A5" stroke-width="2" fill="none"/><circle cx="100" cy="100" r="42" fill="#FCA5A5"/><circle cx="100" cy="100" r="42" stroke="#F87171" stroke-width="2" fill="none"/><circle cx="100" cy="100" r="26" fill="#F87171"/><circle cx="100" cy="100" r="12" fill="#EF4444"/><circle cx="100" cy="100" r="4" fill="#fff"/><line x1="140" y1="40" x2="108" y2="92" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/><polygon points="140,30 150,42 137,45" fill="#F59E0B"/><path d="M142 36 L160 30 M145 43 L160 48" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'presentation',
    name: 'Presentation',
    category: 'business',
    tags: ['presentation', 'meeting', 'board', 'business', 'slides', 'whiteboard'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="30" y="25" width="140" height="100" rx="6" fill="#EFF6FF"/><rect x="30" y="25" width="140" height="100" rx="6" stroke="#BFDBFE" stroke-width="2" fill="none"/><rect x="30" y="25" width="140" height="16" rx="6" fill="#3B82F6"/><rect x="95" y="125" width="10" height="20" fill="#9CA3AF"/><rect x="70" y="145" width="60" height="8" rx="4" fill="#9CA3AF"/><circle cx="45" cy="33" r="3" fill="#FCA5A5"/><circle cx="55" cy="33" r="3" fill="#FDE68A"/><circle cx="65" cy="33" r="3" fill="#86EFAC"/><rect x="45" y="55" width="50" height="6" rx="2" fill="#60A5FA"/><rect x="45" y="68" width="70" height="4" rx="2" fill="#BFDBFE"/><rect x="45" y="78" width="55" height="4" rx="2" fill="#BFDBFE"/><rect x="45" y="88" width="65" height="4" rx="2" fill="#BFDBFE"/><rect x="125" y="55" width="30" height="45" rx="4" fill="#DBEAFE"/><polyline points="130,90 138,75 146,82 150,65" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  // ── Communication ───────────────────────────────────
  {
    id: 'chat-bubbles',
    name: 'Chat Bubbles',
    category: 'communication',
    tags: ['chat', 'message', 'conversation', 'talk', 'bubble', 'communication', 'social'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="25" y="30" width="110" height="65" rx="16" fill="#8B5CF6"/><polygon points="50,95 65,95 45,115" fill="#8B5CF6"/><rect x="37" y="48" width="60" height="6" rx="3" fill="#C4B5FD"/><rect x="37" y="60" width="45" height="6" rx="3" fill="#C4B5FD"/><rect x="37" y="72" width="50" height="6" rx="3" fill="#C4B5FD"/><rect x="65" y="100" width="110" height="55" rx="16" fill="#06B6D4"/><polygon points="155,155 140,155 160,175" fill="#06B6D4"/><rect x="78" y="115" width="55" height="5" rx="2.5" fill="#A5F3FC"/><rect x="78" y="125" width="40" height="5" rx="2.5" fill="#A5F3FC"/><rect x="78" y="135" width="48" height="5" rx="2.5" fill="#A5F3FC"/><circle cx="52" cy="50" r="3" fill="#DDD6FE" opacity="0.6"/><circle cx="62" cy="50" r="3" fill="#DDD6FE" opacity="0.6"/><circle cx="72" cy="50" r="3" fill="#DDD6FE" opacity="0.6"/></svg>`,
  },
  {
    id: 'email-letter',
    name: 'Email',
    category: 'communication',
    tags: ['email', 'letter', 'mail', 'envelope', 'message', 'inbox', 'send'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="25" y="50" width="150" height="100" rx="10" fill="#FBBF24"/><rect x="25" y="50" width="150" height="100" rx="10" stroke="#F59E0B" stroke-width="2" fill="none"/><polygon points="25,55 100,110 175,55" fill="#FCD34D"/><polygon points="25,55 100,110 175,55" stroke="#F59E0B" stroke-width="2" fill="none"/><polygon points="25,150 75,105" stroke="#F59E0B" stroke-width="1" fill="none"/><polygon points="175,150 125,105" stroke="#F59E0B" stroke-width="1" fill="none"/><rect x="55" y="15" width="90" height="70" rx="6" fill="white" stroke="#E5E7EB" stroke-width="1"/><rect x="65" y="30" width="50" height="5" rx="2" fill="#D1D5DB"/><rect x="65" y="40" width="65" height="4" rx="2" fill="#E5E7EB"/><rect x="65" y="48" width="55" height="4" rx="2" fill="#E5E7EB"/><rect x="65" y="56" width="60" height="4" rx="2" fill="#E5E7EB"/><rect x="65" y="64" width="40" height="4" rx="2" fill="#E5E7EB"/><circle cx="160" cy="45" r="18" fill="#EF4444"/><text x="160" y="51" text-anchor="middle" font-size="16" fill="white" font-weight="bold" font-family="sans-serif">3</text></svg>`,
  },
  {
    id: 'megaphone',
    name: 'Megaphone',
    category: 'communication',
    tags: ['megaphone', 'announcement', 'marketing', 'loud', 'promote', 'speaker'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="50,70 130,35 130,155 50,120" fill="#F97316"/><rect x="30" y="70" width="25" height="50" rx="8" fill="#FB923C"/><rect x="130" y="65" width="35" height="60" rx="6" fill="#FDBA74"/><rect x="130" y="65" width="35" height="60" rx="6" stroke="#F97316" stroke-width="2" fill="none"/><rect x="42" y="120" width="12" height="35" rx="3" fill="#9CA3AF"/><rect x="35" y="150" width="26" height="8" rx="4" fill="#6B7280"/><line x1="165" y1="80" x2="185" y2="70" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/><line x1="165" y1="95" x2="190" y2="95" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/><line x1="165" y1="110" x2="185" y2="120" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/><circle cx="170" cy="70" r="3" fill="#FBBF24"/><circle cx="195" cy="95" r="3" fill="#FBBF24"/><circle cx="170" cy="120" r="3" fill="#FBBF24"/></svg>`,
  },
  // ── Technology ──────────────────────────────────────
  {
    id: 'rocket-launch',
    name: 'Rocket Launch',
    category: 'technology',
    tags: ['rocket', 'launch', 'startup', 'speed', 'fast', 'growth', 'technology', 'space'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><ellipse cx="100" cy="170" rx="40" ry="10" fill="#FEE2E2" opacity="0.6"/><path d="M85,140 Q100,30 115,140" fill="#E5E7EB"/><path d="M90,140 Q100,45 110,140" fill="white" stroke="#9CA3AF" stroke-width="1"/><circle cx="100" cy="90" r="8" fill="#60A5FA"/><circle cx="100" cy="90" r="5" fill="#93C5FD"/><path d="M85,130 L75,155 L92,140" fill="#EF4444"/><path d="M115,130 L125,155 L108,140" fill="#EF4444"/><path d="M90,140 Q100,135 110,140" fill="#EF4444"/><ellipse cx="100" cy="160" rx="8" ry="20" fill="#F97316" opacity="0.8"/><ellipse cx="100" cy="155" rx="5" ry="14" fill="#FBBF24" opacity="0.9"/><ellipse cx="100" cy="150" rx="3" ry="8" fill="#FEF3C7"/><circle cx="60" cy="50" r="2" fill="#FBBF24"/><circle cx="150" cy="40" r="3" fill="#A78BFA"/><circle cx="45" cy="90" r="2" fill="#34D399"/><circle cx="160" cy="80" r="2" fill="#F472B6"/><path d="M140 60 l5 -5 l5 5 M142 55 l3 -8" stroke="#FBBF24" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'light-bulb',
    name: 'Light Bulb Idea',
    category: 'technology',
    tags: ['idea', 'light', 'bulb', 'innovation', 'creative', 'think', 'brain', 'solution'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="85" r="50" fill="#FEF3C7"/><circle cx="100" cy="85" r="40" fill="#FDE68A"/><circle cx="100" cy="85" r="28" fill="#FBBF24" opacity="0.6"/><path d="M80,110 Q80,130 85,135 L115,135 Q120,130 120,110" fill="#FDE68A" stroke="#F59E0B" stroke-width="2"/><rect x="85" y="135" width="30" height="6" rx="3" fill="#9CA3AF"/><rect x="88" y="143" width="24" height="5" rx="2.5" fill="#9CA3AF"/><rect x="91" y="150" width="18" height="5" rx="2.5" fill="#9CA3AF"/><path d="M95 158 Q100 165 105 158" fill="#6B7280"/><line x1="100" y1="20" x2="100" y2="32" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><line x1="145" y1="40" x2="155" y2="32" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><line x1="55" y1="40" x2="45" y2="32" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><line x1="160" y1="85" x2="170" y2="85" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><line x1="40" y1="85" x2="30" y2="85" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><line x1="150" y1="125" x2="158" y2="132" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/><line x1="50" y1="125" x2="42" y2="132" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'gear-settings',
    name: 'Settings Gear',
    category: 'technology',
    tags: ['gear', 'settings', 'config', 'options', 'cog', 'preferences', 'technology'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 25 L112 35 L125 30 L128 48 L145 52 L140 68 L155 78 L145 90 L155 102 L140 112 L145 128 L128 132 L125 150 L112 145 L100 155 L88 145 L75 150 L72 132 L55 128 L60 112 L45 102 L55 90 L45 78 L60 68 L55 52 L72 48 L75 30 L88 35 Z" fill="#8B5CF6"/><circle cx="100" cy="90" r="30" fill="#C4B5FD"/><circle cx="100" cy="90" r="20" fill="#EDE9FE"/><circle cx="100" cy="90" r="8" fill="#8B5CF6"/><path d="M100 25 L112 35 L125 30 L128 48 L145 52 L140 68 L155 78 L145 90" fill="none" stroke="#7C3AED" stroke-width="2"/></svg>`,
  },
  // ── Nature ──────────────────────────────────────────
  {
    id: 'plant-growth',
    name: 'Growing Plant',
    category: 'nature',
    tags: ['plant', 'growth', 'nature', 'green', 'leaf', 'eco', 'garden', 'organic'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="65" y="130" width="70" height="55" rx="8" fill="#92400E"/><rect x="65" y="130" width="70" height="15" rx="5" fill="#78350F"/><ellipse cx="100" cy="132" rx="38" ry="8" fill="#A16207" opacity="0.5"/><line x1="100" y1="130" x2="100" y2="60" stroke="#16A34A" stroke-width="5" stroke-linecap="round"/><ellipse cx="78" cy="90" rx="22" ry="14" fill="#22C55E" transform="rotate(-30 78 90)"/><ellipse cx="122" cy="75" rx="22" ry="14" fill="#4ADE80" transform="rotate(30 122 75)"/><ellipse cx="82" cy="65" rx="18" ry="11" fill="#86EFAC" transform="rotate(-20 82 65)"/><line x1="78" y1="90" x2="95" y2="105" stroke="#15803D" stroke-width="1.5"/><line x1="122" y1="75" x2="105" y2="95" stroke="#15803D" stroke-width="1.5"/><line x1="82" y1="65" x2="97" y2="80" stroke="#15803D" stroke-width="1.5"/><circle cx="100" cy="55" r="8" fill="#F472B6"/><circle cx="100" cy="55" r="4" fill="#FBBF24"/><circle cx="95" cy="48" r="3" fill="#F9A8D4"/><circle cx="105" cy="48" r="3" fill="#F9A8D4"/><circle cx="93" cy="56" r="3" fill="#F9A8D4"/><circle cx="107" cy="56" r="3" fill="#F9A8D4"/></svg>`,
  },
  {
    id: 'mountain-landscape',
    name: 'Mountain Landscape',
    category: 'nature',
    tags: ['mountain', 'landscape', 'nature', 'outdoor', 'adventure', 'travel', 'scenery'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#E0F2FE"/><circle cx="155" cy="40" r="22" fill="#FBBF24"/><circle cx="155" cy="40" r="16" fill="#FDE68A"/><circle cx="50" cy="50" rx="25" ry="12" fill="white" opacity="0.8"/><circle cx="40" cy="48" rx="15" ry="10" fill="white" opacity="0.8"/><polygon points="30,160 80,60 130,160" fill="#6366F1"/><polygon points="80,60 95,85 80,85" fill="#818CF8"/><polygon points="70,160 130,80 190,160" fill="#8B5CF6"/><polygon points="130,80 148,108 130,108" fill="#A78BFA"/><polygon points="0,160 50,100 100,160" fill="#4F46E5"/><polygon points="50,100 62,118 50,118" fill="#6366F1"/><rect x="0" y="155" width="200" height="45" fill="#22C55E"/><ellipse cx="100" cy="160" rx="100" ry="12" fill="#16A34A" opacity="0.3"/><circle cx="35" cy="170" r="5" fill="#4ADE80"/><circle cx="80" cy="175" r="4" fill="#4ADE80"/><circle cx="150" cy="168" r="6" fill="#4ADE80"/></svg>`,
  },
  {
    id: 'sun-clouds',
    name: 'Sun & Clouds',
    category: 'nature',
    tags: ['sun', 'cloud', 'weather', 'sky', 'bright', 'day', 'nature', 'sunny'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="90" cy="75" r="35" fill="#FBBF24"/><circle cx="90" cy="75" r="25" fill="#FDE68A"/><line x1="90" y1="25" x2="90" y2="35" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="90" y1="115" x2="90" y2="125" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="75" x2="50" y2="75" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="130" y1="75" x2="140" y2="75" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="55" y1="40" x2="62" y2="47" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="118" y1="103" x2="125" y2="110" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="55" y1="110" x2="62" y2="103" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><line x1="118" y1="47" x2="125" y2="40" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/><ellipse cx="115" cy="120" rx="45" ry="22" fill="white"/><ellipse cx="100" cy="115" rx="25" ry="18" fill="white"/><ellipse cx="135" cy="118" rx="20" ry="14" fill="white"/><ellipse cx="115" cy="108" rx="22" ry="16" fill="#F8FAFC"/><rect x="60" y="150" width="3" height="12" rx="1.5" fill="#60A5FA" opacity="0.5"/><rect x="80" y="148" width="3" height="15" rx="1.5" fill="#60A5FA" opacity="0.5"/><rect x="100" y="152" width="3" height="10" rx="1.5" fill="#60A5FA" opacity="0.5"/><rect x="120" y="148" width="3" height="14" rx="1.5" fill="#60A5FA" opacity="0.5"/><rect x="140" y="150" width="3" height="12" rx="1.5" fill="#60A5FA" opacity="0.5"/></svg>`,
  },
  // ── Abstract / Decorative ───────────────────────────
  {
    id: 'abstract-blobs',
    name: 'Abstract Blobs',
    category: 'abstract',
    tags: ['abstract', 'blob', 'shape', 'decorative', 'organic', 'background', 'design'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M50,80 Q20,40 60,30 Q100,20 110,50 Q120,80 90,90 Q60,100 50,80Z" fill="#8B5CF6" opacity="0.7"/><path d="M100,120 Q70,90 90,70 Q130,50 150,80 Q170,110 140,130 Q110,150 100,120Z" fill="#EC4899" opacity="0.6"/><path d="M40,150 Q20,120 50,110 Q80,100 100,130 Q110,160 70,170 Q30,175 40,150Z" fill="#06B6D4" opacity="0.6"/><path d="M130,160 Q120,130 150,125 Q180,120 185,150 Q190,180 160,180 Q130,180 130,160Z" fill="#F59E0B" opacity="0.5"/><circle cx="45" cy="55" r="4" fill="#C4B5FD"/><circle cx="155" cy="100" r="5" fill="#F9A8D4"/><circle cx="80" cy="140" r="3" fill="#67E8F9"/></svg>`,
  },
  {
    id: 'sparkle-stars',
    name: 'Sparkle Stars',
    category: 'abstract',
    tags: ['stars', 'sparkle', 'shine', 'magic', 'decorative', 'celebration', 'twinkle'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,15 108,45 140,45 114,62 123,92 100,75 77,92 86,62 60,45 92,45" fill="#FBBF24"/><polygon points="50,100 55,115 70,115 58,124 62,140 50,131 38,140 42,124 30,115 45,115" fill="#F472B6"/><polygon points="150,95 154,107 167,107 157,114 160,127 150,120 140,127 143,114 133,107 146,107" fill="#8B5CF6"/><polygon points="80,140 83,150 94,150 86,155 88,166 80,160 72,166 74,155 66,150 77,150" fill="#34D399"/><polygon points="140,145 143,153 152,153 145,158 148,167 140,162 132,167 135,158 128,153 137,153" fill="#60A5FA"/><circle cx="170" cy="50" r="3" fill="#FBBF24" opacity="0.6"/><circle cx="30" cy="70" r="2" fill="#F472B6" opacity="0.6"/><circle cx="160" cy="170" r="2" fill="#8B5CF6" opacity="0.6"/><path d="M25 40 l3-8 3 8 M28 35 l-8 3 8 3" stroke="#FDE68A" stroke-width="1.5" fill="none"/><path d="M170 140 l2-6 2 6 M172 136 l-6 2 6 2" stroke="#C4B5FD" stroke-width="1.5" fill="none"/></svg>`,
  },
  {
    id: 'heart-love',
    name: 'Heart',
    category: 'abstract',
    tags: ['heart', 'love', 'valentine', 'like', 'favorite', 'romantic', 'emotion'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100,170 Q20,110 30,65 Q40,25 75,30 Q95,32 100,55 Q105,32 125,30 Q160,25 170,65 Q180,110 100,170Z" fill="#F43F5E"/><path d="M100,160 Q30,105 40,68 Q48,35 75,38 Q92,40 100,60" fill="#FB7185" opacity="0.6"/><circle cx="70" cy="60" r="8" fill="white" opacity="0.3"/><circle cx="65" cy="55" r="4" fill="white" opacity="0.4"/><circle cx="55" cy="120" r="3" fill="#FCA5A5" opacity="0.3"/><circle cx="145" cy="110" r="4" fill="#FCA5A5" opacity="0.3"/></svg>`,
  },
  // ── Objects ─────────────────────────────────────────
  {
    id: 'trophy-award',
    name: 'Trophy Award',
    category: 'objects',
    tags: ['trophy', 'award', 'winner', 'prize', 'achievement', 'success', 'cup', 'gold'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="75" y="130" width="50" height="10" rx="3" fill="#D97706"/><rect x="85" y="110" width="30" height="24" rx="2" fill="#B45309"/><rect x="65" y="140" width="70" height="12" rx="4" fill="#92400E"/><path d="M70,35 L70,85 Q70,110 100,110 Q130,110 130,85 L130,35Z" fill="#FBBF24"/><path d="M70,35 L130,35" stroke="#F59E0B" stroke-width="3"/><path d="M70,55 Q45,55 40,45 Q35,30 50,35 Q55,38 60,50" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.5"/><path d="M130,55 Q155,55 160,45 Q165,30 150,35 Q145,38 140,50" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.5"/><polygon points="100,50 104,62 117,62 107,70 110,82 100,74 90,82 93,70 83,62 96,62" fill="#F97316"/><path d="M75,40 L125,40" stroke="#FDE68A" stroke-width="2" opacity="0.5"/></svg>`,
  },
  {
    id: 'shopping-bag',
    name: 'Shopping Bag',
    category: 'objects',
    tags: ['shopping', 'bag', 'shop', 'store', 'ecommerce', 'buy', 'retail', 'cart'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="40" y="65" width="120" height="115" rx="10" fill="#EC4899"/><rect x="40" y="65" width="120" height="20" rx="8" fill="#DB2777"/><path d="M75,65 L75,45 Q75,25 100,25 Q125,25 125,45 L125,65" fill="none" stroke="#9D174D" stroke-width="5" stroke-linecap="round"/><rect x="55" y="95" width="90" height="50" rx="6" fill="#FDF2F8" opacity="0.3"/><circle cx="100" cy="120" r="15" fill="#FDF2F8" opacity="0.5"/><polygon points="100,108 103,117 113,117 105,123 108,132 100,126 92,132 95,123 87,117 97,117" fill="#DB2777"/></svg>`,
  },
  {
    id: 'gift-box',
    name: 'Gift Box',
    category: 'objects',
    tags: ['gift', 'present', 'box', 'birthday', 'surprise', 'celebration', 'holiday'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="35" y="80" width="130" height="95" rx="6" fill="#8B5CF6"/><rect x="35" y="80" width="130" height="20" rx="6" fill="#7C3AED"/><rect x="92" y="80" width="16" height="95" fill="#FDE68A"/><rect x="35" y="60" width="130" height="25" rx="8" fill="#A78BFA"/><rect x="92" y="60" width="16" height="25" fill="#FDE68A"/><path d="M100,60 Q80,40 65,45 Q55,48 60,58 Q63,65 80,60" fill="none" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/><path d="M100,60 Q120,40 135,45 Q145,48 140,58 Q137,65 120,60" fill="none" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="58" r="6" fill="#FBBF24"/><rect x="50" y="110" width="25" height="25" rx="3" fill="#7C3AED" opacity="0.5"/><circle cx="140" cy="140" r="10" fill="#7C3AED" opacity="0.4"/></svg>`,
  },
  {
    id: 'camera-photo',
    name: 'Camera',
    category: 'objects',
    tags: ['camera', 'photo', 'photography', 'picture', 'image', 'capture', 'snap'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="30" y="65" width="140" height="95" rx="14" fill="#1F2937"/><rect x="30" y="65" width="140" height="20" rx="14" fill="#374151"/><path d="M75,65 L85,45 L115,45 L125,65" fill="#374151" stroke="#4B5563" stroke-width="1"/><circle cx="100" cy="115" r="32" fill="#4B5563"/><circle cx="100" cy="115" r="26" fill="#1E40AF"/><circle cx="100" cy="115" r="20" fill="#2563EB"/><circle cx="100" cy="115" r="12" fill="#3B82F6"/><circle cx="100" cy="115" r="6" fill="#60A5FA"/><circle cx="90" cy="105" r="5" fill="white" opacity="0.3"/><rect x="145" y="75" width="15" height="10" rx="3" fill="#F59E0B"/><circle cx="50" cy="75" r="5" fill="#EF4444"/><circle cx="50" cy="75" r="3" fill="#FCA5A5" opacity="0.5"/></svg>`,
  },
  {
    id: 'book-education',
    name: 'Open Book',
    category: 'objects',
    tags: ['book', 'education', 'learning', 'read', 'study', 'knowledge', 'library', 'school'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100,45 Q60,35 25,50 L25,150 Q60,138 100,148Z" fill="#DBEAFE"/><path d="M100,45 Q140,35 175,50 L175,150 Q140,138 100,148Z" fill="#EFF6FF"/><path d="M100,45 L100,148" stroke="#93C5FD" stroke-width="2"/><line x1="25" y1="50" x2="25" y2="150" stroke="#60A5FA" stroke-width="3"/><line x1="175" y1="50" x2="175" y2="150" stroke="#60A5FA" stroke-width="3"/><path d="M25,150 Q60,138 100,148 Q140,138 175,150" fill="none" stroke="#60A5FA" stroke-width="3"/><rect x="40" y="65" width="45" height="4" rx="2" fill="#93C5FD"/><rect x="40" y="78" width="35" height="3" rx="1.5" fill="#BFDBFE"/><rect x="40" y="88" width="40" height="3" rx="1.5" fill="#BFDBFE"/><rect x="40" y="98" width="30" height="3" rx="1.5" fill="#BFDBFE"/><rect x="40" y="108" width="38" height="3" rx="1.5" fill="#BFDBFE"/><rect x="115" y="65" width="45" height="4" rx="2" fill="#93C5FD"/><rect x="120" y="78" width="35" height="3" rx="1.5" fill="#BFDBFE"/><rect x="115" y="88" width="40" height="3" rx="1.5" fill="#BFDBFE"/><rect x="118" y="98" width="35" height="3" rx="1.5" fill="#BFDBFE"/><rect x="115" y="108" width="42" height="3" rx="1.5" fill="#BFDBFE"/></svg>`,
  },
  {
    id: 'globe-world',
    name: 'Globe World',
    category: 'objects',
    tags: ['globe', 'world', 'earth', 'global', 'international', 'map', 'travel', 'planet'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="95" r="65" fill="#60A5FA"/><circle cx="100" cy="95" r="65" stroke="#3B82F6" stroke-width="2" fill="none"/><ellipse cx="100" cy="95" rx="30" ry="65" fill="none" stroke="#93C5FD" stroke-width="1.5"/><ellipse cx="100" cy="95" rx="65" ry="25" fill="none" stroke="#93C5FD" stroke-width="1.5"/><path d="M60,55 Q75,50 80,60 Q85,70 70,75 Q55,80 50,70 Q48,60 60,55Z" fill="#4ADE80"/><path d="M105,45 Q125,40 135,55 Q140,65 125,70 Q110,75 105,60 Q102,50 105,45Z" fill="#4ADE80"/><path d="M85,90 Q100,85 120,95 Q135,100 130,115 Q125,130 105,125 Q85,120 80,105 Q78,95 85,90Z" fill="#4ADE80"/><path d="M55,105 Q65,100 70,110 Q72,118 60,120 Q50,118 55,105Z" fill="#4ADE80"/><circle cx="80" cy="60" r="4" fill="white" opacity="0.2"/><circle cx="120" cy="90" r="6" fill="white" opacity="0.15"/><rect x="85" y="165" width="30" height="8" rx="4" fill="#6B7280"/><rect x="75" y="170" width="50" height="10" rx="5" fill="#4B5563"/></svg>`,
  },
  {
    id: 'music-notes',
    name: 'Music Notes',
    category: 'objects',
    tags: ['music', 'notes', 'sound', 'audio', 'song', 'melody', 'play', 'listen'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><ellipse cx="65" cy="140" rx="18" ry="14" fill="#8B5CF6" transform="rotate(-15 65 140)"/><rect x="80" y="50" width="5" height="92" fill="#8B5CF6"/><ellipse cx="135" cy="125" rx="18" ry="14" fill="#EC4899" transform="rotate(-15 135 125)"/><rect x="150" y="40" width="5" height="87" fill="#EC4899"/><path d="M85,50 L155,40 L155,65 L85,75Z" fill="#F59E0B"/><circle cx="45" cy="70" r="5" fill="#06B6D4" opacity="0.6"/><circle cx="40" cy="55" r="3" fill="#06B6D4" opacity="0.4"/><circle cx="160" cy="80" r="4" fill="#F472B6" opacity="0.5"/><circle cx="170" cy="65" r="3" fill="#F472B6" opacity="0.3"/><path d="M30 95 Q35 85 40 95" stroke="#A78BFA" stroke-width="2" fill="none"/><path d="M160 105 Q165 95 170 105" stroke="#F9A8D4" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: 'location-pin',
    name: 'Location Pin',
    category: 'objects',
    tags: ['location', 'pin', 'map', 'place', 'navigation', 'gps', 'address', 'marker'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><ellipse cx="100" cy="175" rx="30" ry="8" fill="#E5E7EB"/><path d="M100,165 Q100,120 55,80 Q35,55 55,35 Q75,15 100,20 Q125,15 145,35 Q165,55 145,80 Q100,120 100,165Z" fill="#EF4444"/><path d="M100,155 Q100,115 62,80 Q45,60 62,42 Q78,25 100,28" fill="#F87171" opacity="0.5"/><circle cx="100" cy="65" r="22" fill="white"/><circle cx="100" cy="65" r="12" fill="#EF4444" opacity="0.6"/></svg>`,
  },
]

// ── Local helpers ─────────────────────────────────────

export function getFeaturedIllustrations(): LocalIllustration[] {
  return illustrations
}

export function getCategories(): string[] {
  return Array.from(new Set(illustrations.map(ill => ill.category)))
}

// ── Iconify API (300K+ vectors, no auth) ──────────────

export interface IconifyResult {
  id: string
  prefix: string
  name: string
  svgUrl: string
  thumbUrl: string
}

const ICONIFY_BASE = 'https://api.iconify.design'

export async function searchIconify(query: string, limit = 80): Promise<IconifyResult[]> {
  const res = await fetch(
    `${ICONIFY_BASE}/search?query=${encodeURIComponent(query)}&limit=${limit}`
  )
  if (!res.ok) return []

  const data = await res.json()
  const icons: string[] = data.icons || []

  return icons.map(icon => {
    const [prefix, ...rest] = icon.split(':')
    const name = rest.join(':')
    return {
      id: icon,
      prefix,
      name,
      svgUrl: `${ICONIFY_BASE}/${prefix}/${name}.svg`,
      thumbUrl: `${ICONIFY_BASE}/${prefix}/${name}.svg?height=80`,
    }
  })
}

export async function fetchIconifySvg(prefix: string, name: string): Promise<string> {
  const res = await fetch(`${ICONIFY_BASE}/${prefix}/${name}.svg?height=200`)
  if (!res.ok) throw new Error('Failed to fetch SVG')
  return res.text()
}
