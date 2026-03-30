/**
 * Marketifyall Design Editor - Element Library
 * A comprehensive library of 500+ design elements organized by categories.
 * Each element is an inline SVG for zero-dependency rendering.
 */

export interface ElementItem {
  id: string
  name: string
  svg: string
  tags?: string[]
}

export interface SubCategory {
  id: string
  name: string
  elements: ElementItem[]
}

export interface ElementCategory {
  id: string
  name: string
  icon: string // SVG icon for the category
  subcategories: SubCategory[]
}

// ─────────────────────────────────────────────────────────────
// SHAPES
// ─────────────────────────────────────────────────────────────

const SHAPES_BASIC: ElementItem[] = [
  { id: 's-rect', name: 'Rectangle', tags: ['square', 'box'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="2" fill="#5A3FFF"/></svg>' },
  { id: 's-square', name: 'Square', tags: ['box', 'block'], svg: '<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="2" fill="#5A3FFF"/></svg>' },
  { id: 's-rounded-rect', name: 'Rounded Rectangle', tags: ['pill', 'button'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="10" width="40" height="28" rx="14" fill="#7C5CFC"/></svg>' },
  { id: 's-circle', name: 'Circle', tags: ['round', 'dot'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#5A3FFF"/></svg>' },
  { id: 's-ellipse', name: 'Ellipse', tags: ['oval'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="20" ry="14" fill="#8B5CF6"/></svg>' },
  { id: 's-triangle', name: 'Triangle', tags: ['arrow', 'pyramid'], svg: '<svg viewBox="0 0 48 48"><path d="M24 6L44 42H4L24 6Z" fill="#5A3FFF"/></svg>' },
  { id: 's-triangle-down', name: 'Triangle Down', tags: ['arrow'], svg: '<svg viewBox="0 0 48 48"><path d="M24 42L4 6H44L24 42Z" fill="#6366F1"/></svg>' },
  { id: 's-triangle-right', name: 'Triangle Right', tags: ['play', 'arrow'], svg: '<svg viewBox="0 0 48 48"><path d="M42 24L6 44V4L42 24Z" fill="#818CF8"/></svg>' },
  { id: 's-triangle-left', name: 'Triangle Left', tags: ['arrow'], svg: '<svg viewBox="0 0 48 48"><path d="M6 24L42 4V44L6 24Z" fill="#A78BFA"/></svg>' },
  { id: 's-diamond', name: 'Diamond', tags: ['rhombus', 'gem'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L44 24L24 44L4 24L24 4Z" fill="#00C9A7"/></svg>' },
  { id: 's-pentagon', name: 'Pentagon', tags: ['polygon'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L44 18L36 42H12L4 18L24 4Z" fill="#8B5CF6"/></svg>' },
  { id: 's-hexagon', name: 'Hexagon', tags: ['polygon', 'honeycomb'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" fill="#5A3FFF"/></svg>' },
  { id: 's-octagon', name: 'Octagon', tags: ['stop', 'polygon'], svg: '<svg viewBox="0 0 48 48"><path d="M16 4H32L44 16V32L32 44H16L4 32V16L16 4Z" fill="#F59E0B"/></svg>' },
  { id: 's-star-4', name: '4-Point Star', tags: ['sparkle', 'twinkle'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L28 20L44 24L28 28L24 44L20 28L4 24L20 20L24 4Z" fill="#FFD700"/></svg>' },
  { id: 's-star-5', name: '5-Point Star', tags: ['favorite', 'rating'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L30 16.5L44 18.5L34 28L36.5 42L24 35.5L11.5 42L14 28L4 18.5L18 16.5L24 4Z" fill="#FFD700"/></svg>' },
  { id: 's-star-6', name: '6-Point Star', tags: ['david', 'hexagram'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L30 16H44L34 24L44 32H30L24 44L18 32H4L14 24L4 16H18L24 4Z" fill="#F97316"/></svg>' },
  { id: 's-heart', name: 'Heart', tags: ['love', 'like', 'valentine'], svg: '<svg viewBox="0 0 48 48"><path d="M24 42C24 42 4 30 4 16C4 10 9 4 15 4C19 4 22 6 24 10C26 6 29 4 33 4C39 4 44 10 44 16C44 30 24 42 24 42Z" fill="#FF4D8D"/></svg>' },
  { id: 's-crescent', name: 'Crescent Moon', tags: ['moon', 'night'], svg: '<svg viewBox="0 0 48 48"><path d="M32 6A18 18 0 1 0 32 42A14 14 0 0 1 32 6Z" fill="#6366F1"/></svg>' },
  { id: 's-cross', name: 'Cross', tags: ['plus', 'add', 'medical'], svg: '<svg viewBox="0 0 48 48"><path d="M18 4H30V18H44V30H30V44H18V30H4V18H18V4Z" fill="#10B981"/></svg>' },
  { id: 's-ring', name: 'Ring', tags: ['donut', 'circle outline'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#5A3FFF" stroke-width="6"/></svg>' },
]

const SHAPES_ABSTRACT: ElementItem[] = [
  { id: 's-blob-1', name: 'Blob 1', tags: ['organic', 'fluid'], svg: '<svg viewBox="0 0 48 48"><path d="M36 8C42 14 44 24 40 32C36 40 26 44 18 40C10 36 4 28 6 20C8 12 20 4 28 4C30 4 34 6 36 8Z" fill="#A78BFA"/></svg>' },
  { id: 's-blob-2', name: 'Blob 2', tags: ['organic', 'fluid'], svg: '<svg viewBox="0 0 48 48"><path d="M30 6C38 8 44 16 42 24C40 32 34 38 26 40C18 42 10 38 6 30C2 22 4 12 12 8C18 4 24 4 30 6Z" fill="#EC4899"/></svg>' },
  { id: 's-blob-3', name: 'Blob 3', tags: ['organic', 'fluid'], svg: '<svg viewBox="0 0 48 48"><path d="M34 6C40 10 46 18 44 26C42 34 36 40 28 42C20 44 12 40 8 34C4 28 2 18 6 12C10 6 22 2 28 4C30 4 32 5 34 6Z" fill="#F472B6"/></svg>' },
  { id: 's-blob-4', name: 'Blob 4', tags: ['organic', 'amoeba'], svg: '<svg viewBox="0 0 48 48"><path d="M32 4C40 8 46 18 42 28C38 38 28 44 18 40C8 36 2 26 6 16C10 6 24 0 32 4Z" fill="#60A5FA"/></svg>' },
  { id: 's-wave-shape', name: 'Wave Shape', tags: ['fluid', 'water'], svg: '<svg viewBox="0 0 48 24"><path d="M0 12C4 6 8 4 12 8C16 12 20 18 24 12C28 6 32 4 36 8C40 12 44 16 48 12V24H0V12Z" fill="#06B6D4"/></svg>' },
  { id: 's-teardrop', name: 'Teardrop', tags: ['drop', 'water'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C24 4 40 20 40 30C40 38.8 32.8 44 24 44C15.2 44 8 38.8 8 30C8 20 24 4 24 4Z" fill="#3B82F6"/></svg>' },
  { id: 's-leaf', name: 'Leaf Shape', tags: ['nature', 'organic'], svg: '<svg viewBox="0 0 48 48"><path d="M8 40C8 40 8 20 24 8C40 20 40 40 40 40C32 36 16 36 8 40Z" fill="#22C55E"/></svg>' },
  { id: 's-egg', name: 'Egg', tags: ['oval', 'organic'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="26" rx="14" ry="18" fill="#FCD34D"/></svg>' },
  { id: 's-petal', name: 'Petal', tags: ['flower', 'organic'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C32 12 36 20 36 28C36 36 30 44 24 44C18 44 12 36 12 28C12 20 16 12 24 4Z" fill="#F9A8D4"/></svg>' },
  { id: 's-squircle', name: 'Squircle', tags: ['rounded square', 'ios'], svg: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="12" fill="#8B5CF6"/></svg>' },
  { id: 's-flower-shape', name: 'Flower Shape', tags: ['petal', 'bloom'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="14" r="8" fill="#F472B6"/><circle cx="33" cy="20" r="8" fill="#FB7185"/><circle cx="30" cy="32" r="8" fill="#F472B6"/><circle cx="18" cy="32" r="8" fill="#FB7185"/><circle cx="15" cy="20" r="8" fill="#F472B6"/><circle cx="24" cy="24" r="5" fill="#FCD34D"/></svg>' },
  { id: 's-cloud-shape', name: 'Cloud', tags: ['weather', 'sky'], svg: '<svg viewBox="0 0 48 32"><path d="M38 28H12C6 28 2 24 2 18C2 12 6 8 12 8C12 8 12 8 12 8C14 4 18 2 22 2C28 2 32 6 34 10C36 8 38 8 40 10C44 12 46 16 44 20C46 22 46 26 42 28C40 28 38 28 38 28Z" fill="#60A5FA"/></svg>' },
  { id: 's-lightning', name: 'Lightning Bolt', tags: ['electric', 'power', 'thunder'], svg: '<svg viewBox="0 0 48 48"><path d="M28 4L12 26H22L18 44L36 22H26L28 4Z" fill="#FBBF24"/></svg>' },
  { id: 's-explosion', name: 'Explosion', tags: ['burst', 'pow', 'bang'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L28 14L38 6L32 18L46 18L36 26L44 36L32 30L34 44L24 34L14 44L16 30L4 36L12 26L2 18L16 18L10 6L20 14L24 2Z" fill="#F97316"/></svg>' },
  { id: 's-infinity', name: 'Infinity', tags: ['loop', 'forever'], svg: '<svg viewBox="0 0 48 28"><path d="M14 4C6 4 2 10 2 14C2 18 6 24 14 24C18 24 22 20 24 18C26 20 30 24 34 24C42 24 46 18 46 14C46 10 42 4 34 4C30 4 26 8 24 10C22 8 18 4 14 4Z" fill="none" stroke="#5A3FFF" stroke-width="4"/></svg>' },
]

const SHAPES_GEOMETRIC: ElementItem[] = [
  { id: 's-parallelogram', name: 'Parallelogram', tags: ['slanted'], svg: '<svg viewBox="0 0 48 48"><path d="M14 8H44L34 40H4L14 8Z" fill="#6366F1"/></svg>' },
  { id: 's-trapezoid', name: 'Trapezoid', tags: ['polygon'], svg: '<svg viewBox="0 0 48 48"><path d="M14 8H34L44 40H4L14 8Z" fill="#8B5CF6"/></svg>' },
  { id: 's-rhombus', name: 'Rhombus', tags: ['diamond', 'tilted'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L42 24L24 44L6 24L24 4Z" fill="#A78BFA"/></svg>' },
  { id: 's-semicircle', name: 'Semicircle', tags: ['half circle', 'arch'], svg: '<svg viewBox="0 0 48 48"><path d="M6 36A18 18 0 0 1 42 36H6Z" fill="#5A3FFF"/></svg>' },
  { id: 's-quarter-circle', name: 'Quarter Circle', tags: ['arc', 'pie'], svg: '<svg viewBox="0 0 48 48"><path d="M6 42V6A36 36 0 0 1 42 42H6Z" fill="#7C5CFC"/></svg>' },
  { id: 's-arrow-right', name: 'Arrow Shape Right', tags: ['chevron', 'direction'], svg: '<svg viewBox="0 0 48 48"><path d="M4 14H28V4L44 24L28 44V34H4V14Z" fill="#5A3FFF"/></svg>' },
  { id: 's-arrow-left', name: 'Arrow Shape Left', tags: ['chevron', 'direction'], svg: '<svg viewBox="0 0 48 48"><path d="M44 14H20V4L4 24L20 44V34H44V14Z" fill="#6366F1"/></svg>' },
  { id: 's-arrow-up', name: 'Arrow Shape Up', tags: ['chevron', 'direction'], svg: '<svg viewBox="0 0 48 48"><path d="M14 44V20H4L24 4L44 20H34V44H14Z" fill="#818CF8"/></svg>' },
  { id: 's-arrow-down', name: 'Arrow Shape Down', tags: ['chevron', 'direction'], svg: '<svg viewBox="0 0 48 48"><path d="M14 4V28H4L24 44L44 28H34V4H14Z" fill="#A78BFA"/></svg>' },
  { id: 's-chevron-right', name: 'Chevron Right', tags: ['bracket', 'angle'], svg: '<svg viewBox="0 0 48 48"><path d="M8 4L28 24L8 44L18 44L38 24L18 4H8Z" fill="#5A3FFF"/></svg>' },
  { id: 's-tab-shape', name: 'Tab Shape', tags: ['folder', 'label'], svg: '<svg viewBox="0 0 48 48"><path d="M4 14H18L22 8H44V40H4V14Z" fill="#6366F1"/></svg>' },
  { id: 's-donut', name: 'Donut', tags: ['ring', 'circle'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4A20 20 0 1 0 24 44A20 20 0 1 0 24 4ZM24 14A10 10 0 1 1 24 34A10 10 0 1 1 24 14Z" fill="#5A3FFF" fill-rule="evenodd"/></svg>' },
  { id: 's-pacman', name: 'Pac-Man', tags: ['game', 'mouth'], svg: '<svg viewBox="0 0 48 48"><path d="M24 24L42 10A20 20 0 1 0 42 38L24 24Z" fill="#FBBF24"/></svg>' },
  { id: 's-ribbon-shape', name: 'Ribbon Shape', tags: ['banner', 'flag'], svg: '<svg viewBox="0 0 48 24"><path d="M0 0H48V24H0L8 12L0 0Z" fill="#EC4899"/></svg>' },
  { id: 's-speech-rect', name: 'Speech Rectangle', tags: ['dialog', 'tooltip'], svg: '<svg viewBox="0 0 48 48"><path d="M4 4H44V32H20L10 42V32H4V4Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/></svg>' },
  { id: 's-speech-round', name: 'Speech Bubble', tags: ['dialog', 'chat'], svg: '<svg viewBox="0 0 48 48"><path d="M44 20C44 10 35 4 24 4C13 4 4 10 4 20C4 30 13 34 18 34L12 44L26 34C36 33 44 28 44 20Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/></svg>' },
  { id: 's-thought-bubble', name: 'Thought Bubble', tags: ['think', 'idea'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="26" cy="18" rx="18" ry="14" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/><circle cx="14" cy="36" r="4" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/><circle cx="8" cy="42" r="2" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/></svg>' },
  { id: 's-cylinder-shape', name: 'Cylinder', tags: ['3d', 'database', 'can'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="10" rx="16" ry="6" fill="#818CF8"/><rect x="8" y="10" width="32" height="28" fill="#6366F1"/><ellipse cx="24" cy="38" rx="16" ry="6" fill="#5A3FFF"/><ellipse cx="24" cy="10" rx="16" ry="6" fill="#A78BFA"/></svg>' },
  { id: 's-cube', name: 'Cube', tags: ['3d', 'box', 'block'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L44 16V36L24 44L4 36V16L24 4Z" fill="#6366F1"/><path d="M24 4L44 16L24 24L4 16L24 4Z" fill="#A78BFA"/><path d="M24 24V44L44 36V16L24 24Z" fill="#5A3FFF"/></svg>' },
]

const SHAPES_OUTLINED: ElementItem[] = [
  { id: 's-o-rect', name: 'Rectangle Outline', tags: ['border', 'frame'], svg: '<svg viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" rx="2" fill="none" stroke="#5A3FFF" stroke-width="3"/></svg>' },
  { id: 's-o-circle', name: 'Circle Outline', tags: ['ring'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#5A3FFF" stroke-width="3"/></svg>' },
  { id: 's-o-triangle', name: 'Triangle Outline', tags: ['border'], svg: '<svg viewBox="0 0 48 48"><path d="M24 6L44 42H4L24 6Z" fill="none" stroke="#5A3FFF" stroke-width="3" stroke-linejoin="round"/></svg>' },
  { id: 's-o-star', name: 'Star Outline', tags: ['favorite'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L30 16.5L44 18.5L34 28L36.5 42L24 35.5L11.5 42L14 28L4 18.5L18 16.5L24 4Z" fill="none" stroke="#FFD700" stroke-width="3" stroke-linejoin="round"/></svg>' },
  { id: 's-o-heart', name: 'Heart Outline', tags: ['love'], svg: '<svg viewBox="0 0 48 48"><path d="M24 42C24 42 4 30 4 16C4 10 9 4 15 4C19 4 22 6 24 10C26 6 29 4 33 4C39 4 44 10 44 16C44 30 24 42 24 42Z" fill="none" stroke="#FF4D8D" stroke-width="3"/></svg>' },
  { id: 's-o-hexagon', name: 'Hexagon Outline', tags: ['polygon'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" fill="none" stroke="#5A3FFF" stroke-width="3" stroke-linejoin="round"/></svg>' },
  { id: 's-o-diamond', name: 'Diamond Outline', tags: ['rhombus'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L44 24L24 44L4 24L24 4Z" fill="none" stroke="#00C9A7" stroke-width="3" stroke-linejoin="round"/></svg>' },
  { id: 's-o-octagon', name: 'Octagon Outline', tags: ['stop'], svg: '<svg viewBox="0 0 48 48"><path d="M16 4H32L44 16V32L32 44H16L4 32V16L16 4Z" fill="none" stroke="#F59E0B" stroke-width="3" stroke-linejoin="round"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// LINES & ARROWS
// ─────────────────────────────────────────────────────────────

const LINES_BASIC: ElementItem[] = [
  { id: 'l-solid', name: 'Solid Line', tags: ['straight'], svg: '<svg viewBox="0 0 48 12"><line x1="2" y1="6" x2="46" y2="6" stroke="#333" stroke-width="2" stroke-linecap="round"/></svg>' },
  { id: 'l-thick', name: 'Thick Line', tags: ['bold', 'heavy'], svg: '<svg viewBox="0 0 48 12"><line x1="2" y1="6" x2="46" y2="6" stroke="#333" stroke-width="4" stroke-linecap="round"/></svg>' },
  { id: 'l-thin', name: 'Thin Line', tags: ['light', 'hairline'], svg: '<svg viewBox="0 0 48 12"><line x1="2" y1="6" x2="46" y2="6" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'l-dashed', name: 'Dashed Line', tags: ['broken'], svg: '<svg viewBox="0 0 48 12"><line x1="2" y1="6" x2="46" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="6 3" stroke-linecap="round"/></svg>' },
  { id: 'l-dotted', name: 'Dotted Line', tags: ['dots'], svg: '<svg viewBox="0 0 48 12"><line x1="2" y1="6" x2="46" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/></svg>' },
  { id: 'l-double', name: 'Double Line', tags: ['parallel'], svg: '<svg viewBox="0 0 48 12"><line x1="2" y1="4" x2="46" y2="4" stroke="#333" stroke-width="1.5"/><line x1="2" y1="8" x2="46" y2="8" stroke="#333" stroke-width="1.5"/></svg>' },
  { id: 'l-triple', name: 'Triple Line', tags: ['parallel'], svg: '<svg viewBox="0 0 48 14"><line x1="2" y1="3" x2="46" y2="3" stroke="#333" stroke-width="1"/><line x1="2" y1="7" x2="46" y2="7" stroke="#333" stroke-width="1.5"/><line x1="2" y1="11" x2="46" y2="11" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'l-tapered', name: 'Tapered Line', tags: ['wedge'], svg: '<svg viewBox="0 0 48 12"><path d="M2 6L46 2V10L2 6Z" fill="#333"/></svg>' },
  { id: 'l-curved', name: 'Curved Line', tags: ['arc', 'bend'], svg: '<svg viewBox="0 0 48 24"><path d="M2 20Q24 2 46 20" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'l-s-curve', name: 'S-Curve', tags: ['wave', 'sine'], svg: '<svg viewBox="0 0 48 24"><path d="M2 18Q14 2 24 12Q34 22 46 6" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'l-zigzag', name: 'Zigzag', tags: ['jagged'], svg: '<svg viewBox="0 0 48 16"><polyline points="2 12 8 4 14 12 20 4 26 12 32 4 38 12 44 4" stroke="#333" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>' },
  { id: 'l-wave', name: 'Wave Line', tags: ['sine', 'wavy'], svg: '<svg viewBox="0 0 48 16"><path d="M2 8Q8 2 14 8Q20 14 26 8Q32 2 38 8Q44 14 46 8" stroke="#333" stroke-width="2" fill="none"/></svg>' },
  { id: 'l-spiral', name: 'Spiral', tags: ['coil', 'swirl'], svg: '<svg viewBox="0 0 48 48"><path d="M24 24C24 20 28 18 30 20C34 24 30 30 24 30C16 30 14 20 18 14C24 6 36 8 38 18C40 30 30 40 20 38C8 36 6 22 12 12" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
]

const LINES_ARROWS: ElementItem[] = [
  { id: 'la-right', name: 'Arrow Right', tags: ['direction', 'next'], svg: '<svg viewBox="0 0 48 24"><line x1="4" y1="12" x2="40" y2="12" stroke="#333" stroke-width="2" stroke-linecap="round"/><polyline points="34 6 42 12 34 18" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-left', name: 'Arrow Left', tags: ['direction', 'back'], svg: '<svg viewBox="0 0 48 24"><line x1="8" y1="12" x2="44" y2="12" stroke="#333" stroke-width="2" stroke-linecap="round"/><polyline points="14 6 6 12 14 18" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-up', name: 'Arrow Up', tags: ['direction', 'top'], svg: '<svg viewBox="0 0 24 48"><line x1="12" y1="44" x2="12" y2="8" stroke="#333" stroke-width="2" stroke-linecap="round"/><polyline points="6 14 12 6 18 14" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-down', name: 'Arrow Down', tags: ['direction', 'bottom'], svg: '<svg viewBox="0 0 24 48"><line x1="12" y1="4" x2="12" y2="40" stroke="#333" stroke-width="2" stroke-linecap="round"/><polyline points="6 34 12 42 18 34" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-double', name: 'Double Arrow', tags: ['both', 'bidirectional'], svg: '<svg viewBox="0 0 48 24"><line x1="10" y1="12" x2="38" y2="12" stroke="#333" stroke-width="2"/><polyline points="14 6 6 12 14 18" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="34 6 42 12 34 18" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-curved-right', name: 'Curved Arrow', tags: ['bend', 'turn'], svg: '<svg viewBox="0 0 48 48"><path d="M8 36C8 20 20 8 36 8" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="30 4 38 8 30 12" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-circular', name: 'Circular Arrow', tags: ['refresh', 'reload', 'cycle'], svg: '<svg viewBox="0 0 48 48"><path d="M36 12A16 16 0 1 0 40 24" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="36 6 40 12 34 14" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-corner', name: 'L-Shape Arrow', tags: ['turn', 'corner'], svg: '<svg viewBox="0 0 48 48"><path d="M8 8V36H40" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="34 30 42 36 34 42" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'la-block-right', name: 'Block Arrow Right', tags: ['thick', 'solid'], svg: '<svg viewBox="0 0 48 32"><path d="M4 8H28V2L44 16L28 30V24H4V8Z" fill="#5A3FFF"/></svg>' },
  { id: 'la-block-left', name: 'Block Arrow Left', tags: ['thick', 'solid'], svg: '<svg viewBox="0 0 48 32"><path d="M44 8H20V2L4 16L20 30V24H44V8Z" fill="#6366F1"/></svg>' },
  { id: 'la-block-up', name: 'Block Arrow Up', tags: ['thick', 'solid'], svg: '<svg viewBox="0 0 32 48"><path d="M8 44V20H2L16 4L30 20H24V44H8Z" fill="#818CF8"/></svg>' },
  { id: 'la-block-down', name: 'Block Arrow Down', tags: ['thick', 'solid'], svg: '<svg viewBox="0 0 32 48"><path d="M8 4V28H2L16 44L30 28H24V4H8Z" fill="#A78BFA"/></svg>' },
  { id: 'la-fat-right', name: 'Fat Arrow Right', tags: ['heavy', 'direction'], svg: '<svg viewBox="0 0 48 36"><path d="M4 6H30V0L46 18L30 36V30H4V6Z" fill="#5A3FFF"/></svg>' },
  { id: 'la-notch-right', name: 'Notched Arrow', tags: ['direction', 'process'], svg: '<svg viewBox="0 0 48 32"><path d="M0 0H36L48 16L36 32H0L10 16L0 0Z" fill="#5A3FFF"/></svg>' },
  { id: 'la-u-turn', name: 'U-Turn Arrow', tags: ['return', 'back'], svg: '<svg viewBox="0 0 48 48"><path d="M32 40V20A8 8 0 0 0 16 20V28" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="10 24 16 30 22 24" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
]

const LINES_DIVIDERS: ElementItem[] = [
  { id: 'ld-simple', name: 'Simple Divider', tags: ['separator', 'hr'], svg: '<svg viewBox="0 0 48 8"><line x1="0" y1="4" x2="48" y2="4" stroke="#CBD5E1" stroke-width="1"/></svg>' },
  { id: 'ld-thick', name: 'Thick Divider', tags: ['separator', 'bold'], svg: '<svg viewBox="0 0 48 8"><line x1="0" y1="4" x2="48" y2="4" stroke="#333" stroke-width="3"/></svg>' },
  { id: 'ld-double', name: 'Double Divider', tags: ['separator', 'parallel'], svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="4" x2="48" y2="4" stroke="#333" stroke-width="1"/><line x1="0" y1="8" x2="48" y2="8" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'ld-dot-center', name: 'Center Dot Divider', tags: ['separator', 'ornament'], svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="18" y2="6" stroke="#333" stroke-width="1"/><circle cx="24" cy="6" r="3" fill="#333"/><line x1="30" y1="6" x2="48" y2="6" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'ld-diamond-center', name: 'Diamond Divider', tags: ['separator', 'ornament'], svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="18" y2="6" stroke="#333" stroke-width="1"/><path d="M24 2L28 6L24 10L20 6L24 2Z" fill="#333"/><line x1="30" y1="6" x2="48" y2="6" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'ld-star-center', name: 'Star Divider', tags: ['separator', 'ornament'], svg: '<svg viewBox="0 0 48 12"><line x1="0" y1="6" x2="17" y2="6" stroke="#333" stroke-width="1"/><path d="M24 1L25.5 4.5L29 5L26 7.5L27 11L24 9L21 11L22 7.5L19 5L22.5 4.5L24 1Z" fill="#FFD700"/><line x1="31" y1="6" x2="48" y2="6" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'ld-dots', name: 'Dotted Divider', tags: ['separator', 'dots'], svg: '<svg viewBox="0 0 48 8"><line x1="0" y1="4" x2="48" y2="4" stroke="#333" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/></svg>' },
  { id: 'ld-gradient', name: 'Gradient Divider', tags: ['separator', 'fade'], svg: '<svg viewBox="0 0 48 8"><defs><linearGradient id="gd"><stop offset="0" stop-color="#333" stop-opacity="0"/><stop offset="0.5" stop-color="#333" stop-opacity="1"/><stop offset="1" stop-color="#333" stop-opacity="0"/></linearGradient></defs><line x1="0" y1="4" x2="48" y2="4" stroke="url(#gd)" stroke-width="2"/></svg>' },
  { id: 'ld-wave', name: 'Wave Divider', tags: ['separator', 'wavy'], svg: '<svg viewBox="0 0 48 12"><path d="M0 6Q6 2 12 6Q18 10 24 6Q30 2 36 6Q42 10 48 6" stroke="#333" stroke-width="1.5" fill="none"/></svg>' },
  { id: 'ld-zigzag', name: 'Zigzag Divider', tags: ['separator', 'jagged'], svg: '<svg viewBox="0 0 48 12"><polyline points="0 6 4 2 8 6 12 2 16 6 20 2 24 6 28 2 32 6 36 2 40 6 44 2 48 6" stroke="#333" stroke-width="1.5" fill="none"/></svg>' },
  { id: 'ld-arrows', name: 'Arrow Chain', tags: ['separator', 'direction'], svg: '<svg viewBox="0 0 48 12"><path d="M0 6L6 2L12 6L18 2L24 6L30 2L36 6L42 2L48 6L42 10L36 6L30 10L24 6L18 10L12 6L6 10L0 6Z" fill="none" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'ld-scroll', name: 'Scroll Divider', tags: ['separator', 'decorative'], svg: '<svg viewBox="0 0 48 16"><path d="M0 8C4 4 6 4 8 8C10 12 12 12 14 8L16 4L18 8C20 12 22 12 24 8C26 4 28 4 30 8C32 12 34 12 36 8L38 4L40 8C42 12 44 12 46 8" stroke="#333" stroke-width="1.5" fill="none"/></svg>' },
]

const LINES_CONNECTORS: ElementItem[] = [
  { id: 'lc-elbow-right', name: 'Elbow Right', tags: ['connector', 'bend'], svg: '<svg viewBox="0 0 48 48"><path d="M4 12H24V36H44" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'lc-elbow-down', name: 'Elbow Down', tags: ['connector', 'bend'], svg: '<svg viewBox="0 0 48 48"><path d="M12 4V24H36V44" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'lc-curve-right', name: 'Curve Connector', tags: ['connector', 'smooth'], svg: '<svg viewBox="0 0 48 48"><path d="M4 12C24 12 24 36 44 36" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'lc-curve-down', name: 'Curve Down', tags: ['connector', 'smooth'], svg: '<svg viewBox="0 0 48 48"><path d="M12 4C12 24 36 24 36 44" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'lc-step', name: 'Step Connector', tags: ['connector', 'flow'], svg: '<svg viewBox="0 0 48 48"><path d="M4 12H16V24H32V36H44" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'lc-branch', name: 'Branch', tags: ['connector', 'split'], svg: '<svg viewBox="0 0 48 48"><path d="M4 24H24" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 24L44 8" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 24L44 40" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// GRAPHICS - Illustrations
// ─────────────────────────────────────────────────────────────

const GRAPHICS_NATURE: ElementItem[] = [
  { id: 'g-sun', name: 'Sun', tags: ['weather', 'day', 'bright'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="10" fill="#FBBF24"/><g stroke="#FBBF24" stroke-width="3" stroke-linecap="round"><line x1="24" y1="2" x2="24" y2="8"/><line x1="24" y1="40" x2="24" y2="46"/><line x1="2" y1="24" x2="8" y2="24"/><line x1="40" y1="24" x2="46" y2="24"/><line x1="8.5" y1="8.5" x2="13" y2="13"/><line x1="35" y1="35" x2="39.5" y2="39.5"/><line x1="8.5" y1="39.5" x2="13" y2="35"/><line x1="35" y1="13" x2="39.5" y2="8.5"/></g></svg>' },
  { id: 'g-moon', name: 'Moon', tags: ['night', 'dark', 'crescent'], svg: '<svg viewBox="0 0 48 48"><path d="M34 8C28 8 22 12 20 18C18 24 20 32 26 36C32 40 38 40 42 36C38 42 30 46 22 44C14 42 8 34 8 26C8 16 16 8 26 6C28 6 32 6 34 8Z" fill="#6366F1"/><circle cx="22" cy="16" r="1.5" fill="#A78BFA" opacity="0.5"/><circle cx="18" cy="28" r="1" fill="#A78BFA" opacity="0.3"/></svg>' },
  { id: 'g-cloud', name: 'Cloud', tags: ['weather', 'sky'], svg: '<svg viewBox="0 0 48 32"><path d="M38 28H12C7 28 4 25 4 20C4 15 7 12 12 12C12 6 17 2 24 2C30 2 34 6 36 10C39 8 43 10 44 14C46 18 44 24 40 26C40 28 38 28 38 28Z" fill="#93C5FD"/><path d="M38 28H12C7 28 4 25 4 20C4 15 7 12 12 12C12 6 17 2 24 2C30 2 34 6 36 10" fill="#BFDBFE"/></svg>' },
  { id: 'g-rain', name: 'Rain Cloud', tags: ['weather', 'water'], svg: '<svg viewBox="0 0 48 48"><path d="M36 22H12C7 22 4 19 4 14C4 9 7 6 12 6C12 2 17 -2 24 0C28 0 32 4 34 8C37 6 41 8 42 12C44 16 42 20 38 22Z" fill="#93C5FD"/><line x1="14" y1="28" x2="12" y2="36" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="28" x2="20" y2="38" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="28" x2="28" y2="34" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/></svg>' },
  { id: 'g-snowflake', name: 'Snowflake', tags: ['winter', 'cold', 'ice'], svg: '<svg viewBox="0 0 48 48"><g stroke="#60A5FA" stroke-width="2" stroke-linecap="round"><line x1="24" y1="4" x2="24" y2="44"/><line x1="6" y1="14" x2="42" y2="34"/><line x1="6" y1="34" x2="42" y2="14"/><line x1="24" y1="4" x2="20" y2="10"/><line x1="24" y1="4" x2="28" y2="10"/><line x1="24" y1="44" x2="20" y2="38"/><line x1="24" y1="44" x2="28" y2="38"/></g></svg>' },
  { id: 'g-tree', name: 'Tree', tags: ['forest', 'plant', 'nature'], svg: '<svg viewBox="0 0 48 48"><rect x="21" y="32" width="6" height="12" fill="#92400E"/><path d="M24 4L38 20H30L40 32H8L18 20H10L24 4Z" fill="#22C55E"/></svg>' },
  { id: 'g-pine', name: 'Pine Tree', tags: ['forest', 'christmas', 'evergreen'], svg: '<svg viewBox="0 0 48 48"><rect x="22" y="36" width="4" height="8" fill="#92400E"/><path d="M24 4L36 18H30L38 28H10L18 18H12L24 4Z" fill="#15803D"/></svg>' },
  { id: 'g-palm', name: 'Palm Tree', tags: ['tropical', 'beach', 'summer'], svg: '<svg viewBox="0 0 48 48"><path d="M24 18C24 18 22 30 23 44" stroke="#92400E" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 18C18 10 8 12 4 16" stroke="#22C55E" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 18C30 10 40 12 44 16" stroke="#22C55E" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 18C22 8 24 2 28 4" stroke="#22C55E" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 18C20 10 16 6 12 8" stroke="#16A34A" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M24 18C32 12 38 10 40 6" stroke="#16A34A" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'g-flower', name: 'Flower', tags: ['plant', 'bloom', 'garden'], svg: '<svg viewBox="0 0 48 48"><line x1="24" y1="24" x2="24" y2="44" stroke="#22C55E" stroke-width="3" stroke-linecap="round"/><path d="M24 32C20 30 14 32 14 32" stroke="#22C55E" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="24" cy="14" r="5" fill="#EC4899"/><circle cx="18" cy="18" r="5" fill="#F472B6"/><circle cx="30" cy="18" r="5" fill="#F472B6"/><circle cx="18" cy="10" r="5" fill="#EC4899"/><circle cx="30" cy="10" r="5" fill="#EC4899"/><circle cx="24" cy="14" r="3" fill="#FBBF24"/></svg>' },
  { id: 'g-tulip', name: 'Tulip', tags: ['flower', 'spring'], svg: '<svg viewBox="0 0 48 48"><line x1="24" y1="26" x2="24" y2="44" stroke="#22C55E" stroke-width="3" stroke-linecap="round"/><path d="M18 26C14 14 18 6 24 4C30 6 34 14 30 26Z" fill="#EF4444"/><path d="M24 4C24 10 22 18 18 26H30C26 18 24 10 24 4Z" fill="#DC2626"/></svg>' },
  { id: 'g-leaf', name: 'Leaf', tags: ['nature', 'plant', 'green'], svg: '<svg viewBox="0 0 48 48"><path d="M8 40C8 40 8 20 24 8C40 20 40 40 40 40C32 36 16 36 8 40Z" fill="#22C55E"/><path d="M24 8C24 8 24 20 24 40" stroke="#16A34A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'g-mountain', name: 'Mountain', tags: ['landscape', 'outdoor', 'hill'], svg: '<svg viewBox="0 0 48 36"><path d="M0 36L16 8L26 22L32 14L48 36H0Z" fill="#6B7280"/><path d="M16 8L20 16L12 16L16 8Z" fill="#E5E7EB"/><path d="M32 14L36 22L28 22L32 14Z" fill="#F3F4F6"/></svg>' },
  { id: 'g-wave', name: 'Ocean Wave', tags: ['water', 'sea', 'beach'], svg: '<svg viewBox="0 0 48 24"><path d="M0 12C4 6 8 4 12 8C16 12 20 18 24 12C28 6 32 4 36 8C40 12 44 16 48 12V24H0V12Z" fill="#3B82F6"/><path d="M0 16C6 10 10 10 14 14C18 18 22 20 26 16C30 12 34 10 38 14C42 18 46 18 48 16V24H0V16Z" fill="#2563EB" opacity="0.7"/></svg>' },
  { id: 'g-rainbow', name: 'Rainbow', tags: ['color', 'arc', 'sky'], svg: '<svg viewBox="0 0 48 28"><path d="M4 28A20 20 0 0 1 44 28" fill="none" stroke="#EF4444" stroke-width="3"/><path d="M7 28A17 17 0 0 1 41 28" fill="none" stroke="#F97316" stroke-width="3"/><path d="M10 28A14 14 0 0 1 38 28" fill="none" stroke="#FBBF24" stroke-width="3"/><path d="M13 28A11 11 0 0 1 35 28" fill="none" stroke="#22C55E" stroke-width="3"/><path d="M16 28A8 8 0 0 1 32 28" fill="none" stroke="#3B82F6" stroke-width="3"/><path d="M19 28A5 5 0 0 1 29 28" fill="none" stroke="#8B5CF6" stroke-width="3"/></svg>' },
  { id: 'g-cactus', name: 'Cactus', tags: ['desert', 'plant', 'western'], svg: '<svg viewBox="0 0 48 48"><rect x="20" y="10" width="8" height="32" rx="4" fill="#22C55E"/><path d="M20 22C14 22 12 18 12 14C12 10 14 10 16 12C16 16 18 18 20 18" fill="#16A34A"/><path d="M28 28C34 28 36 24 36 20C36 16 34 16 32 18C32 22 30 24 28 24" fill="#16A34A"/></svg>' },
  { id: 'g-mushroom', name: 'Mushroom', tags: ['forest', 'nature', 'fungi'], svg: '<svg viewBox="0 0 48 48"><rect x="20" y="28" width="8" height="14" rx="2" fill="#E5E7EB"/><path d="M6 28C6 16 14 8 24 8C34 8 42 16 42 28H6Z" fill="#EF4444"/><circle cx="16" cy="18" r="3" fill="#FEF2F2"/><circle cx="28" cy="16" r="2" fill="#FEF2F2"/><circle cx="22" cy="24" r="2.5" fill="#FEF2F2"/><circle cx="34" cy="22" r="2" fill="#FEF2F2"/></svg>' },
]

const GRAPHICS_FOOD: ElementItem[] = [
  { id: 'g-apple', name: 'Apple', tags: ['fruit', 'healthy'], svg: '<svg viewBox="0 0 48 48"><path d="M24 8C16 6 8 14 8 24C8 34 14 44 24 44C34 44 40 34 40 24C40 14 32 6 24 8Z" fill="#EF4444"/><path d="M24 8C22 4 26 2 28 4" stroke="#22C55E" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 4C30 6 32 6 34 4" stroke="#22C55E" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'g-cherry', name: 'Cherry', tags: ['fruit', 'berry'], svg: '<svg viewBox="0 0 48 48"><path d="M24 6C20 12 14 20 12 28" stroke="#22C55E" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 6C28 12 34 20 36 28" stroke="#22C55E" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="12" cy="34" r="8" fill="#DC2626"/><circle cx="36" cy="34" r="8" fill="#EF4444"/><circle cx="10" cy="32" r="2" fill="#FCA5A5" opacity="0.6"/><circle cx="34" cy="32" r="2" fill="#FCA5A5" opacity="0.6"/></svg>' },
  { id: 'g-watermelon', name: 'Watermelon', tags: ['fruit', 'summer'], svg: '<svg viewBox="0 0 48 32"><path d="M4 28A20 20 0 0 1 44 28H4Z" fill="#22C55E"/><path d="M6 28A18 18 0 0 1 42 28H6Z" fill="#EF4444"/><circle cx="16" cy="22" r="1.5" fill="#1F2937"/><circle cx="24" cy="20" r="1.5" fill="#1F2937"/><circle cx="32" cy="22" r="1.5" fill="#1F2937"/><circle cx="20" cy="26" r="1" fill="#1F2937"/><circle cx="28" cy="26" r="1" fill="#1F2937"/></svg>' },
  { id: 'g-pizza', name: 'Pizza Slice', tags: ['food', 'italian'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L42 42H6L24 4Z" fill="#FBBF24"/><path d="M24 4L42 42H6L24 4Z" fill="#F59E0B" opacity="0.5"/><circle cx="20" cy="24" r="3" fill="#EF4444"/><circle cx="28" cy="30" r="3" fill="#EF4444"/><circle cx="24" cy="16" r="2" fill="#22C55E"/></svg>' },
  { id: 'g-coffee', name: 'Coffee Cup', tags: ['drink', 'cafe', 'beverage'], svg: '<svg viewBox="0 0 48 48"><rect x="10" y="16" width="24" height="24" rx="4" fill="#92400E"/><rect x="12" y="16" width="20" height="4" rx="2" fill="#78350F"/><path d="M34 22C38 22 42 24 42 28C42 32 38 34 34 34" stroke="#92400E" stroke-width="3" fill="none"/><path d="M18 10C18 8 20 6 20 6" stroke="#9CA3AF" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 8C24 6 26 4 26 4" stroke="#9CA3AF" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'g-cake', name: 'Birthday Cake', tags: ['birthday', 'celebration', 'dessert'], svg: '<svg viewBox="0 0 48 48"><rect x="8" y="22" width="32" height="20" rx="4" fill="#EC4899"/><rect x="8" y="22" width="32" height="6" rx="3" fill="#F472B6"/><path d="M12 22C12 22 14 18 16 18C18 18 20 22 20 22" fill="#FBBF24"/><path d="M20 22C20 22 22 18 24 18C26 18 28 22 28 22" fill="#F97316"/><path d="M28 22C28 22 30 18 32 18C34 18 36 22 36 22" fill="#FBBF24"/><rect x="22" y="10" width="4" height="12" rx="2" fill="#FCD34D"/><path d="M24 6C22 6 22 10 24 10C26 10 26 6 24 6Z" fill="#F97316"/></svg>' },
  { id: 'g-icecream', name: 'Ice Cream', tags: ['dessert', 'summer', 'sweet'], svg: '<svg viewBox="0 0 48 48"><path d="M18 22L24 44L30 22H18Z" fill="#D4A574"/><circle cx="24" cy="18" r="8" fill="#F9A8D4"/><circle cx="18" cy="14" r="6" fill="#FBBF24"/><circle cx="30" cy="14" r="6" fill="#A78BFA"/><circle cx="24" cy="10" r="5" fill="#FCA5A5"/></svg>' },
  { id: 'g-donut', name: 'Donut', tags: ['dessert', 'sweet', 'bakery'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#F472B6"/><circle cx="24" cy="24" r="7" fill="#FDF2F8"/><path d="M8 20C10 18 14 22 18 20C22 18 26 22 30 18C34 14 38 18 40 20C40 16 34 8 24 6C14 8 8 16 8 20Z" fill="#FBBF24"/><circle cx="14" cy="18" r="1.5" fill="#EF4444"/><circle cx="22" cy="14" r="1" fill="#22C55E"/><circle cx="30" cy="16" r="1.5" fill="#3B82F6"/><circle cx="36" cy="20" r="1" fill="#EF4444"/></svg>' },
  { id: 'g-burger', name: 'Hamburger', tags: ['food', 'fast food'], svg: '<svg viewBox="0 0 48 48"><path d="M8 20C8 14 14 8 24 8C34 8 40 14 40 20H8Z" fill="#D97706"/><rect x="6" y="22" width="36" height="4" fill="#22C55E"/><rect x="6" y="27" width="36" height="3" fill="#EF4444"/><rect x="6" y="31" width="36" height="5" rx="0" fill="#92400E"/><path d="M8 38C8 38 14 40 24 40C34 40 40 38 40 38V36H8V38Z" fill="#D97706"/></svg>' },
  { id: 'g-wine', name: 'Wine Glass', tags: ['drink', 'alcohol', 'celebration'], svg: '<svg viewBox="0 0 48 48"><path d="M16 4H32V18C32 24 28 28 24 28C20 28 16 24 16 18V4Z" fill="none" stroke="#6B7280" stroke-width="2"/><path d="M16 4H32V14C32 14 30 18 24 18C18 18 16 14 16 14V4Z" fill="#7C3AED" opacity="0.6"/><line x1="24" y1="28" x2="24" y2="38" stroke="#6B7280" stroke-width="2"/><line x1="16" y1="40" x2="32" y2="40" stroke="#6B7280" stroke-width="2" stroke-linecap="round"/></svg>' },
  { id: 'g-avocado', name: 'Avocado', tags: ['fruit', 'healthy', 'green'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C16 4 8 14 8 26C8 38 14 44 24 44C34 44 40 38 40 26C40 14 32 4 24 4Z" fill="#22C55E"/><ellipse cx="24" cy="28" rx="10" ry="12" fill="#BEF264"/><circle cx="24" cy="30" r="6" fill="#92400E"/></svg>' },
  { id: 'g-lemon', name: 'Lemon', tags: ['fruit', 'citrus', 'yellow'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="16" ry="12" fill="#FDE047" transform="rotate(-15 24 24)"/><path d="M24 24C24 24 40 8 42 10" stroke="#A3E635" stroke-width="1" fill="none"/></svg>' },
]

const GRAPHICS_CELEBRATION: ElementItem[] = [
  { id: 'g-balloon', name: 'Balloon', tags: ['party', 'birthday', 'celebration'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="18" rx="12" ry="16" fill="#EF4444"/><path d="M24 34L22 36L26 36L24 34Z" fill="#DC2626"/><path d="M24 36C24 36 22 40 24 44" stroke="#9CA3AF" stroke-width="1" fill="none"/><ellipse cx="20" cy="14" rx="3" ry="4" fill="#FCA5A5" opacity="0.4"/></svg>' },
  { id: 'g-gift', name: 'Gift Box', tags: ['present', 'birthday', 'christmas'], svg: '<svg viewBox="0 0 48 48"><rect x="8" y="18" width="32" height="24" rx="2" fill="#EF4444"/><rect x="8" y="18" width="32" height="8" rx="2" fill="#DC2626"/><rect x="22" y="18" width="4" height="24" fill="#FBBF24"/><rect x="8" y="20" width="32" height="4" fill="#FBBF24" rx="0"/><path d="M24 18C20 14 16 10 18 8C20 6 24 10 24 14" stroke="#FBBF24" stroke-width="2" fill="none"/><path d="M24 18C28 14 32 10 30 8C28 6 24 10 24 14" stroke="#FBBF24" stroke-width="2" fill="none"/></svg>' },
  { id: 'g-confetti', name: 'Confetti', tags: ['party', 'celebration'], svg: '<svg viewBox="0 0 48 48"><rect x="8" y="10" width="4" height="8" fill="#EF4444" transform="rotate(15 10 14)"/><rect x="20" y="6" width="3" height="6" fill="#3B82F6" transform="rotate(-20 21.5 9)"/><rect x="34" y="12" width="4" height="8" fill="#22C55E" transform="rotate(30 36 16)"/><rect x="14" y="28" width="3" height="6" fill="#FBBF24" transform="rotate(-10 15.5 31)"/><rect x="30" y="30" width="4" height="7" fill="#EC4899" transform="rotate(25 32 33.5)"/><circle cx="26" cy="20" r="2" fill="#F97316"/><circle cx="12" cy="22" r="1.5" fill="#8B5CF6"/><circle cx="38" cy="24" r="2" fill="#EF4444"/><circle cx="22" cy="38" r="1.5" fill="#22C55E"/><circle cx="40" cy="36" r="1" fill="#3B82F6"/></svg>' },
  { id: 'g-trophy', name: 'Trophy', tags: ['award', 'winner', 'champion'], svg: '<svg viewBox="0 0 48 48"><path d="M14 8H34V22C34 30 30 34 24 34C18 34 14 30 14 22V8Z" fill="#FBBF24"/><path d="M14 12C10 12 6 14 6 18C6 22 10 24 14 24" fill="#F59E0B"/><path d="M34 12C38 12 42 14 42 18C42 22 38 24 34 24" fill="#F59E0B"/><rect x="20" y="34" width="8" height="4" fill="#D97706"/><rect x="16" y="38" width="16" height="4" rx="2" fill="#92400E"/><path d="M14 8H34V12H14V8Z" fill="#F59E0B"/></svg>' },
  { id: 'g-medal', name: 'Medal', tags: ['award', 'achievement', 'prize'], svg: '<svg viewBox="0 0 48 48"><path d="M18 4L16 20H20L18 4Z" fill="#3B82F6"/><path d="M30 4L32 20H28L30 4Z" fill="#EF4444"/><circle cx="24" cy="28" r="12" fill="#FBBF24"/><circle cx="24" cy="28" r="8" fill="#F59E0B"/><path d="M24 22L26 26H30L27 28.5L28 32.5L24 30L20 32.5L21 28.5L18 26H22L24 22Z" fill="#FBBF24"/></svg>' },
  { id: 'g-crown', name: 'Crown', tags: ['king', 'queen', 'royal'], svg: '<svg viewBox="0 0 48 40"><path d="M4 32L8 8L16 20L24 4L32 20L40 8L44 32H4Z" fill="#FBBF24"/><rect x="4" y="32" width="40" height="6" rx="2" fill="#F59E0B"/><circle cx="8" cy="8" r="3" fill="#FBBF24"/><circle cx="24" cy="4" r="3" fill="#FBBF24"/><circle cx="40" cy="8" r="3" fill="#FBBF24"/><circle cx="16" cy="34" r="2" fill="#EF4444"/><circle cx="24" cy="34" r="2" fill="#3B82F6"/><circle cx="32" cy="34" r="2" fill="#22C55E"/></svg>' },
  { id: 'g-firework', name: 'Firework', tags: ['celebration', 'new year', 'party'], svg: '<svg viewBox="0 0 48 48"><g stroke-width="2" stroke-linecap="round"><line x1="24" y1="24" x2="24" y2="6" stroke="#EF4444"/><line x1="24" y1="24" x2="24" y2="42" stroke="#EF4444"/><line x1="24" y1="24" x2="6" y2="24" stroke="#FBBF24"/><line x1="24" y1="24" x2="42" y2="24" stroke="#FBBF24"/><line x1="24" y1="24" x2="11" y2="11" stroke="#22C55E"/><line x1="24" y1="24" x2="37" y2="37" stroke="#22C55E"/><line x1="24" y1="24" x2="37" y2="11" stroke="#3B82F6"/><line x1="24" y1="24" x2="11" y2="37" stroke="#3B82F6"/></g><circle cx="24" cy="24" r="3" fill="#FBBF24"/></svg>' },
  { id: 'g-champagne', name: 'Champagne', tags: ['celebration', 'toast', 'cheers'], svg: '<svg viewBox="0 0 48 48"><path d="M16 4H24V24C24 28 22 30 20 30C18 30 16 28 16 24V4Z" fill="#D4D4D8"/><path d="M16 4H24V14C24 14 22 18 20 18C18 18 16 14 16 14V4Z" fill="#FDE68A" opacity="0.5"/><line x1="20" y1="30" x2="20" y2="40" stroke="#9CA3AF" stroke-width="2"/><line x1="14" y1="42" x2="26" y2="42" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/><circle cx="30" cy="8" r="1" fill="#FBBF24"/><circle cx="34" cy="12" r="1.5" fill="#FBBF24"/><circle cx="28" cy="14" r="1" fill="#FBBF24"/><circle cx="32" cy="6" r="0.8" fill="#F59E0B"/></svg>' },
  { id: 'g-party-hat', name: 'Party Hat', tags: ['birthday', 'celebration', 'party'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L38 42H10L24 4Z" fill="#8B5CF6"/><path d="M14 30L34 30" stroke="#FBBF24" stroke-width="2"/><path d="M16 36L32 36" stroke="#EC4899" stroke-width="2"/><path d="M18 24L30 24" stroke="#22C55E" stroke-width="2"/><circle cx="24" cy="4" r="3" fill="#FBBF24"/></svg>' },
  { id: 'g-sparkle', name: 'Sparkle', tags: ['glitter', 'shine', 'twinkle'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L28 18L42 22L28 26L24 40L20 26L6 22L20 18L24 4Z" fill="#FBBF24"/><path d="M10 8L12 14L18 16L12 18L10 24L8 18L2 16L8 14L10 8Z" fill="#FBBF24" opacity="0.6"/><path d="M38 32L40 36L44 38L40 40L38 44L36 40L32 38L36 36L38 32Z" fill="#FBBF24" opacity="0.6"/></svg>' },
  { id: 'g-star-burst', name: 'Starburst', tags: ['explosion', 'sale', 'promo'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L28 14L38 6L32 18L46 18L36 26L44 36L32 30L34 44L24 34L14 44L16 30L4 36L12 26L2 18L16 18L10 6L20 14L24 2Z" fill="#F97316"/></svg>' },
  { id: 'g-ribbon', name: 'Ribbon', tags: ['award', 'decoration', 'prize'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="18" r="12" fill="#3B82F6"/><circle cx="24" cy="18" r="8" fill="#2563EB"/><path d="M16 28L12 44L20 38L24 44L28 38L36 44L32 28" stroke="#3B82F6" stroke-width="2" fill="#60A5FA"/></svg>' },
]

const GRAPHICS_TRAVEL: ElementItem[] = [
  { id: 'g-airplane', name: 'Airplane', tags: ['travel', 'flight', 'transport'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L28 16L44 20L28 24L24 44L20 24L4 20L20 16L24 4Z" fill="#6B7280"/><circle cx="24" cy="20" r="3" fill="#9CA3AF"/></svg>' },
  { id: 'g-car', name: 'Car', tags: ['vehicle', 'transport', 'drive'], svg: '<svg viewBox="0 0 48 36"><path d="M10 20L14 10H34L38 20" fill="#3B82F6"/><rect x="4" y="18" width="40" height="12" rx="4" fill="#2563EB"/><circle cx="14" cy="30" r="4" fill="#1F2937"/><circle cx="14" cy="30" r="2" fill="#6B7280"/><circle cx="34" cy="30" r="4" fill="#1F2937"/><circle cx="34" cy="30" r="2" fill="#6B7280"/><rect x="16" y="12" width="6" height="8" rx="1" fill="#BFDBFE"/><rect x="24" y="12" width="8" height="8" rx="1" fill="#BFDBFE"/></svg>' },
  { id: 'g-bicycle', name: 'Bicycle', tags: ['bike', 'cycling', 'sport'], svg: '<svg viewBox="0 0 48 48"><circle cx="12" cy="32" r="8" fill="none" stroke="#333" stroke-width="2"/><circle cx="36" cy="32" r="8" fill="none" stroke="#333" stroke-width="2"/><path d="M12 32L20 16H32L36 32" stroke="#333" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M20 16L28 32" stroke="#333" stroke-width="2" fill="none"/><line x1="28" y1="16" x2="32" y2="16" stroke="#333" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="16" r="1.5" fill="#333"/></svg>' },
  { id: 'g-compass', name: 'Compass', tags: ['navigation', 'direction', 'explore'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#333" stroke-width="2"/><circle cx="24" cy="24" r="16" fill="none" stroke="#D4D4D8" stroke-width="1"/><path d="M24 8L28 24L24 40L20 24L24 8Z" fill="none"/><path d="M24 8L28 24H20L24 8Z" fill="#EF4444"/><path d="M24 40L20 24H28L24 40Z" fill="#D4D4D8"/><circle cx="24" cy="24" r="2" fill="#333"/></svg>' },
  { id: 'g-camera', name: 'Camera', tags: ['photo', 'photography', 'picture'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="14" width="40" height="28" rx="4" fill="#4B5563"/><path d="M16 14L20 8H28L32 14" fill="#374151"/><circle cx="24" cy="28" r="8" fill="#1F2937"/><circle cx="24" cy="28" r="6" fill="#6366F1"/><circle cx="24" cy="28" r="2" fill="#A5B4FC"/><circle cx="38" cy="20" r="2" fill="#FBBF24"/></svg>' },
  { id: 'g-globe', name: 'Globe', tags: ['world', 'earth', 'international'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#3B82F6"/><ellipse cx="24" cy="24" rx="8" ry="18" fill="none" stroke="#93C5FD" stroke-width="1.5"/><path d="M6 24H42" stroke="#93C5FD" stroke-width="1.5"/><path d="M8 16H40" stroke="#93C5FD" stroke-width="1"/><path d="M8 32H40" stroke="#93C5FD" stroke-width="1"/></svg>' },
  { id: 'g-map-pin', name: 'Map Pin', tags: ['location', 'marker', 'gps'], svg: '<svg viewBox="0 0 48 48"><path d="M24 44C24 44 40 28 40 18C40 8 32 2 24 2C16 2 8 8 8 18C8 28 24 44 24 44Z" fill="#EF4444"/><circle cx="24" cy="18" r="6" fill="#FEF2F2"/></svg>' },
  { id: 'g-suitcase', name: 'Suitcase', tags: ['luggage', 'travel', 'bag'], svg: '<svg viewBox="0 0 48 48"><rect x="6" y="16" width="36" height="26" rx="4" fill="#8B5CF6"/><rect x="6" y="16" width="36" height="8" rx="4" fill="#7C3AED"/><rect x="18" y="10" width="12" height="8" rx="2" fill="none" stroke="#7C3AED" stroke-width="2"/><circle cx="24" cy="32" r="3" fill="#A78BFA"/><line x1="24" y1="29" x2="24" y2="35" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"/></svg>' },
  { id: 'g-hot-air-balloon', name: 'Hot Air Balloon', tags: ['fly', 'sky', 'travel'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C14 4 8 14 8 22C8 28 12 32 16 34H32C36 32 40 28 40 22C40 14 34 4 24 4Z" fill="#EF4444"/><path d="M24 4C20 4 16 8 14 14C14 14 18 12 24 12C30 12 34 14 34 14C32 8 28 4 24 4Z" fill="#FBBF24"/><path d="M14 22C14 26 18 30 20 32H28C30 30 34 26 34 22C34 22 30 24 24 24C18 24 14 22 14 22Z" fill="#FBBF24"/><path d="M16 34L18 36H30L32 34" stroke="#92400E" stroke-width="1" fill="none"/><rect x="18" y="36" width="12" height="6" rx="1" fill="#92400E"/></svg>' },
  { id: 'g-ship', name: 'Ship', tags: ['boat', 'cruise', 'ocean'], svg: '<svg viewBox="0 0 48 48"><path d="M4 34L10 20H38L44 34H4Z" fill="#6B7280"/><rect x="18" y="10" width="12" height="12" rx="1" fill="#E5E7EB"/><rect x="22" y="4" width="4" height="8" fill="#9CA3AF"/><path d="M26 4L38 14" stroke="#EF4444" stroke-width="1" fill="none"/><path d="M4 36C8 32 12 36 16 34C20 32 24 36 28 34C32 32 36 36 40 34C44 32 48 36 48 36" stroke="#3B82F6" stroke-width="2" fill="none"/></svg>' },
]

const GRAPHICS_BUSINESS: ElementItem[] = [
  { id: 'g-lightbulb', name: 'Light Bulb', tags: ['idea', 'innovation', 'creative'], svg: '<svg viewBox="0 0 48 48"><path d="M18 34C18 28 12 24 12 18C12 12 16 6 24 6C32 6 36 12 36 18C36 24 30 28 30 34H18Z" fill="#FBBF24"/><rect x="18" y="34" width="12" height="4" rx="1" fill="#D97706"/><rect x="20" y="38" width="8" height="2" rx="1" fill="#D97706"/><rect x="22" y="40" width="4" height="2" rx="1" fill="#D97706"/><path d="M20 18C20 14 22 12 24 12" stroke="#FEF3C7" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'g-rocket', name: 'Rocket', tags: ['launch', 'startup', 'space'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C24 4 34 14 34 28L28 34H20L14 28C14 14 24 4 24 4Z" fill="#E5E7EB"/><path d="M24 4C24 4 28 10 30 18L24 12L18 18C20 10 24 4 24 4Z" fill="#D4D4D8"/><circle cx="24" cy="20" r="4" fill="#3B82F6"/><path d="M14 28L8 34L14 32" fill="#EF4444"/><path d="M34 28L40 34L34 32" fill="#EF4444"/><path d="M20 34L24 44L28 34" fill="#F97316"/><path d="M22 34L24 40L26 34" fill="#FBBF24"/></svg>' },
  { id: 'g-gear', name: 'Gear', tags: ['settings', 'cog', 'mechanical'], svg: '<svg viewBox="0 0 48 48"><path d="M22 4H26L28 10L34 8L36 12L30 16L34 20L38 18L40 22V26L34 28L36 34L32 36L28 30L26 34L28 38L26 40L22 40L20 34L14 36L12 32L18 28L14 24L10 26L8 22V18L14 16L12 10L16 8L20 14L22 10V4Z" fill="#6B7280"/><circle cx="24" cy="22" r="6" fill="#E5E7EB"/></svg>' },
  { id: 'g-target', name: 'Target', tags: ['goal', 'aim', 'focus'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FEE2E2"/><circle cx="24" cy="24" r="14" fill="#FECACA"/><circle cx="24" cy="24" r="8" fill="#FCA5A5"/><circle cx="24" cy="24" r="3" fill="#EF4444"/></svg>' },
  { id: 'g-chart-bar', name: 'Bar Chart', tags: ['data', 'analytics', 'statistics'], svg: '<svg viewBox="0 0 48 48"><rect x="6" y="30" width="8" height="12" rx="1" fill="#3B82F6"/><rect x="16" y="20" width="8" height="22" rx="1" fill="#8B5CF6"/><rect x="26" y="12" width="8" height="30" rx="1" fill="#EC4899"/><rect x="36" y="24" width="8" height="18" rx="1" fill="#F97316"/><line x1="4" y1="44" x2="46" y2="44" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'g-chart-pie', name: 'Pie Chart', tags: ['data', 'analytics', 'statistics'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#3B82F6"/><path d="M24 24L24 6A18 18 0 0 1 42 24L24 24Z" fill="#EC4899"/><path d="M24 24L42 24A18 18 0 0 1 32 40L24 24Z" fill="#FBBF24"/><path d="M24 24L32 40A18 18 0 0 1 24 42L24 24Z" fill="#22C55E"/></svg>' },
  { id: 'g-money', name: 'Money Bag', tags: ['finance', 'wealth', 'cash'], svg: '<svg viewBox="0 0 48 48"><path d="M12 42C8 42 6 36 6 30C6 20 12 14 24 14C36 14 42 20 42 30C42 36 40 42 36 42H12Z" fill="#22C55E"/><path d="M20 8L18 14H30L28 8C28 8 26 4 24 4C22 4 20 8 20 8Z" fill="#16A34A"/><text x="24" y="32" font-family="Arial" font-size="14" font-weight="bold" fill="#FEF2F2" text-anchor="middle">$</text></svg>' },
  { id: 'g-handshake', name: 'Handshake', tags: ['deal', 'agreement', 'partnership'], svg: '<svg viewBox="0 0 48 36"><path d="M4 12L14 8L22 16L16 22L4 20V12Z" fill="#F59E0B"/><path d="M44 12L34 8L26 16L32 22L44 20V12Z" fill="#3B82F6"/><path d="M22 16L26 16L30 20L26 24L22 24L18 20L22 16Z" fill="#FCD34D"/></svg>' },
  { id: 'g-puzzle', name: 'Puzzle Piece', tags: ['solution', 'connect', 'game'], svg: '<svg viewBox="0 0 48 48"><path d="M8 12H18C18 8 22 6 24 8C26 10 26 12 24 14C22 16 18 14 18 12H8V24C12 24 14 20 16 22C18 24 16 28 14 28C12 28 12 24 8 24V36H20C20 32 24 30 26 32C28 34 26 38 24 38C22 38 20 36 20 36V36H32V24C36 24 38 20 40 22C42 24 40 28 38 28C36 28 36 24 32 24V12H8Z" fill="#8B5CF6"/></svg>' },
  { id: 'g-clock', name: 'Clock', tags: ['time', 'schedule', 'deadline'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#F3F4F6" stroke="#333" stroke-width="2"/><line x1="24" y1="24" x2="24" y2="12" stroke="#333" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="24" x2="32" y2="28" stroke="#333" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="24" r="2" fill="#EF4444"/></svg>' },
]

const GRAPHICS_TECH: ElementItem[] = [
  { id: 'g-laptop', name: 'Laptop', tags: ['computer', 'device', 'work'], svg: '<svg viewBox="0 0 48 40"><rect x="10" y="4" width="28" height="22" rx="2" fill="#374151"/><rect x="12" y="6" width="24" height="18" rx="1" fill="#60A5FA"/><path d="M4 28H44L42 34H6L4 28Z" fill="#6B7280"/><rect x="20" y="26" width="8" height="2" rx="1" fill="#4B5563"/></svg>' },
  { id: 'g-phone', name: 'Smartphone', tags: ['mobile', 'device', 'cell'], svg: '<svg viewBox="0 0 32 48"><rect x="4" y="2" width="24" height="44" rx="4" fill="#374151"/><rect x="6" y="6" width="20" height="32" rx="1" fill="#60A5FA"/><circle cx="16" cy="42" r="2" fill="#6B7280"/><rect x="12" y="3" width="8" height="1.5" rx="1" fill="#4B5563"/></svg>' },
  { id: 'g-wifi', name: 'WiFi Symbol', tags: ['internet', 'wireless', 'network'], svg: '<svg viewBox="0 0 48 48"><path d="M4 16C12 8 36 8 44 16" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 24C16 18 32 18 38 24" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M18 32C20 30 28 30 30 32" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="38" r="3" fill="#333"/></svg>' },
  { id: 'g-code', name: 'Code Brackets', tags: ['programming', 'developer', 'html'], svg: '<svg viewBox="0 0 48 48"><path d="M16 12L4 24L16 36" stroke="#22C55E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 12L44 24L32 36" stroke="#22C55E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="28" y1="8" x2="20" y2="40" stroke="#22C55E" stroke-width="2" stroke-linecap="round"/></svg>' },
  { id: 'g-battery', name: 'Battery', tags: ['power', 'energy', 'charge'], svg: '<svg viewBox="0 0 48 32"><rect x="4" y="6" width="36" height="20" rx="3" fill="none" stroke="#333" stroke-width="2"/><rect x="40" y="12" width="4" height="8" rx="1" fill="#333"/><rect x="8" y="10" width="20" height="12" rx="1" fill="#22C55E"/></svg>' },
]

const GRAPHICS_PEOPLE: ElementItem[] = [
  { id: 'g-person', name: 'Person', tags: ['user', 'avatar', 'human'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="14" r="8" fill="#F59E0B"/><path d="M8 44C8 32 16 26 24 26C32 26 40 32 40 44" fill="#3B82F6"/></svg>' },
  { id: 'g-group', name: 'Group', tags: ['team', 'people', 'community'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="12" r="6" fill="#3B82F6"/><path d="M12 40C12 30 18 26 24 26C30 26 36 30 36 40" fill="#3B82F6"/><circle cx="12" cy="16" r="5" fill="#60A5FA"/><path d="M2 40C2 32 6 28 12 28C14 28 16 28 18 30" fill="#60A5FA"/><circle cx="36" cy="16" r="5" fill="#60A5FA"/><path d="M46 40C46 32 42 28 36 28C34 28 32 28 30 30" fill="#60A5FA"/></svg>' },
  { id: 'g-avatar-male', name: 'Male Avatar', tags: ['user', 'man', 'profile'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#DBEAFE"/><circle cx="24" cy="18" r="8" fill="#92400E"/><path d="M24 18C24 18 16 18 16 12C16 8 20 6 24 6C28 6 32 8 32 12C32 18 24 18 24 18Z" fill="#1F2937"/><path d="M10 42C10 32 16 28 24 28C32 28 38 32 38 42" fill="#3B82F6"/></svg>' },
  { id: 'g-avatar-female', name: 'Female Avatar', tags: ['user', 'woman', 'profile'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FCE7F3"/><circle cx="24" cy="18" r="8" fill="#D4A574"/><path d="M14 14C14 8 18 4 24 4C30 4 34 8 34 14C34 14 32 12 24 12C16 12 14 14 14 14Z" fill="#1F2937"/><path d="M10 42C10 32 16 28 24 28C32 28 38 32 38 42" fill="#EC4899"/></svg>' },
  { id: 'g-running', name: 'Runner', tags: ['sport', 'exercise', 'fitness'], svg: '<svg viewBox="0 0 48 48"><circle cx="30" cy="8" r="4" fill="#F59E0B"/><path d="M20 18L28 14L36 20L32 26L24 22" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 22L16 34L22 36" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 22L32 36L26 40" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// FRAMES
// ─────────────────────────────────────────────────────────────

const FRAMES_BASIC: ElementItem[] = [
  { id: 'f-square', name: 'Square Frame', tags: ['border', 'box'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'f-rounded', name: 'Rounded Frame', tags: ['border', 'soft'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="8" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'f-circle', name: 'Circle Frame', tags: ['round', 'avatar'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'f-oval', name: 'Oval Frame', tags: ['ellipse', 'portrait'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="14" ry="20" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'f-diamond', name: 'Diamond Frame', tags: ['rhombus', 'angle'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L44 24L24 44L4 24L24 4Z" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round"/></svg>' },
  { id: 'f-hexagon', name: 'Hexagon Frame', tags: ['polygon'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round"/></svg>' },
  { id: 'f-arch', name: 'Arch Frame', tags: ['door', 'window'], svg: '<svg viewBox="0 0 48 48"><path d="M8 44V18A16 16 0 0 1 40 18V44H8Z" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'f-star', name: 'Star Frame', tags: ['favorite'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L30 16.5L44 18.5L34 28L36.5 42L24 35.5L11.5 42L14 28L4 18.5L18 16.5L24 4Z" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round"/></svg>' },
]

const FRAMES_DECORATIVE: ElementItem[] = [
  { id: 'f-double', name: 'Double Border', tags: ['border', 'elegant'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="none" stroke="#333" stroke-width="1.5"/><rect x="7" y="7" width="34" height="34" fill="none" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'f-triple', name: 'Triple Border', tags: ['border', 'ornate'], svg: '<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" fill="none" stroke="#333" stroke-width="1"/><rect x="6" y="6" width="36" height="36" fill="none" stroke="#333" stroke-width="1.5"/><rect x="9" y="9" width="30" height="30" fill="none" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'f-corner', name: 'Corner Frame', tags: ['elegant', 'decorative'], svg: '<svg viewBox="0 0 48 48"><path d="M4 14V4H14" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M34 4H44V14" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M44 34V44H34" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 44H4V34" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'f-corner-ornate', name: 'Ornate Corner Frame', tags: ['decorative', 'fancy'], svg: '<svg viewBox="0 0 48 48"><path d="M4 16V4H16" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M32 4H44V16" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M44 32V44H32" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 44H4V32" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="4" cy="4" r="2.5" fill="#333"/><circle cx="44" cy="4" r="2.5" fill="#333"/><circle cx="44" cy="44" r="2.5" fill="#333"/><circle cx="4" cy="44" r="2.5" fill="#333"/></svg>' },
  { id: 'f-dashed', name: 'Dashed Frame', tags: ['border', 'broken'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="4" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="6 3"/></svg>' },
  { id: 'f-dotted', name: 'Dotted Frame', tags: ['border', 'dots'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="4" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/></svg>' },
  { id: 'f-shadow', name: 'Shadow Frame', tags: ['depth', '3d', 'layered'], svg: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="38" height="38" rx="2" fill="#D4D4D8"/><rect x="4" y="4" width="38" height="38" rx="2" fill="none" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'f-ribbon-frame', name: 'Ribbon Corner Frame', tags: ['decorative', 'badge'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="2" fill="none" stroke="#333" stroke-width="1.5"/><path d="M4 14L14 4" stroke="#5A3FFF" stroke-width="4"/><path d="M4 4L14 4L4 14Z" fill="#5A3FFF"/></svg>' },
]

const FRAMES_PHOTO: ElementItem[] = [
  { id: 'f-polaroid', name: 'Polaroid', tags: ['photo', 'instant', 'retro'], svg: '<svg viewBox="0 0 44 52"><rect x="2" y="2" width="40" height="48" rx="1" fill="#FAFAFA" stroke="#E5E5E5" stroke-width="1"/><rect x="5" y="5" width="34" height="32" fill="#D4D4D8"/><rect x="14" y="42" width="16" height="2" rx="1" fill="#D4D4D8"/></svg>' },
  { id: 'f-film-strip', name: 'Film Strip', tags: ['movie', 'cinema', 'retro'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="2" fill="#1F2937"/><rect x="8" y="12" width="32" height="24" fill="#D4D4D8"/><rect x="6" y="6" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="14" y="6" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="22" y="6" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="30" y="6" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="38" y="6" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="6" y="39" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="14" y="39" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="22" y="39" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="30" y="39" width="4" height="3" rx="1" fill="#D4D4D8"/><rect x="38" y="39" width="4" height="3" rx="1" fill="#D4D4D8"/></svg>' },
  { id: 'f-tape', name: 'Tape Frame', tags: ['scrapbook', 'casual'], svg: '<svg viewBox="0 0 48 48"><rect x="6" y="8" width="36" height="32" fill="none" stroke="#333" stroke-width="1.5"/><rect x="2" y="4" width="16" height="6" rx="0" fill="#FDE68A" opacity="0.7" transform="rotate(-5 10 7)"/><rect x="30" y="4" width="16" height="6" rx="0" fill="#FDE68A" opacity="0.7" transform="rotate(5 38 7)"/></svg>' },
  { id: 'f-stamp', name: 'Stamp Frame', tags: ['postal', 'mail', 'vintage'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="#FEF2F2"/><path d="M4 4H44V44H4V4Z" fill="none" stroke="#333" stroke-width="1"/><circle cx="4" cy="12" r="2" fill="#fff"/><circle cx="4" cy="20" r="2" fill="#fff"/><circle cx="4" cy="28" r="2" fill="#fff"/><circle cx="4" cy="36" r="2" fill="#fff"/><circle cx="44" cy="12" r="2" fill="#fff"/><circle cx="44" cy="20" r="2" fill="#fff"/><circle cx="44" cy="28" r="2" fill="#fff"/><circle cx="44" cy="36" r="2" fill="#fff"/><circle cx="12" cy="4" r="2" fill="#fff"/><circle cx="20" cy="4" r="2" fill="#fff"/><circle cx="28" cy="4" r="2" fill="#fff"/><circle cx="36" cy="4" r="2" fill="#fff"/><circle cx="12" cy="44" r="2" fill="#fff"/><circle cx="20" cy="44" r="2" fill="#fff"/><circle cx="28" cy="44" r="2" fill="#fff"/><circle cx="36" cy="44" r="2" fill="#fff"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// STICKERS
// ─────────────────────────────────────────────────────────────

const STICKERS_EMOJI: ElementItem[] = [
  { id: 'st-happy', name: 'Happy Face', tags: ['smile', 'joy', 'smiley'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><circle cx="16" cy="20" r="3" fill="#1F2937"/><circle cx="32" cy="20" r="3" fill="#1F2937"/><path d="M14 30C14 30 18 36 24 36C30 36 34 30 34 30" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-love', name: 'Love Eyes', tags: ['heart', 'love', 'adore'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><path d="M12 18C12 16 14 14 16 14C18 14 20 16 20 18C20 22 16 24 16 24C16 24 12 22 12 18Z" fill="#EF4444"/><path d="M28 18C28 16 30 14 32 14C34 14 36 16 36 18C36 22 32 24 32 24C32 24 28 22 28 18Z" fill="#EF4444"/><path d="M14 30C14 30 18 36 24 36C30 36 34 30 34 30" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-cool', name: 'Cool Face', tags: ['sunglasses', 'swag'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><rect x="8" y="16" width="14" height="8" rx="2" fill="#1F2937"/><rect x="26" y="16" width="14" height="8" rx="2" fill="#1F2937"/><line x1="22" y1="20" x2="26" y2="20" stroke="#1F2937" stroke-width="2"/><path d="M16 32C16 32 20 36 24 36C28 36 32 32 32 32" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-wink', name: 'Wink', tags: ['playful', 'flirt'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><circle cx="16" cy="20" r="3" fill="#1F2937"/><path d="M28 20C30 18 34 18 36 20" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M14 30C14 30 18 36 24 36C30 36 34 30 34 30" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-laugh', name: 'Laughing', tags: ['lol', 'funny', 'haha'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><path d="M12 18C14 16 18 16 20 18" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 18C30 16 34 16 36 18" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M12 28C12 28 16 38 24 38C32 38 36 28 36 28H12Z" fill="#1F2937"/><path d="M16 38C18 36 20 35 24 35C28 35 30 36 32 38" fill="#EF4444"/></svg>' },
  { id: 'st-sad', name: 'Sad Face', tags: ['cry', 'unhappy', 'frown'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><circle cx="16" cy="20" r="3" fill="#1F2937"/><circle cx="32" cy="20" r="3" fill="#1F2937"/><path d="M14 34C14 34 18 28 24 28C30 28 34 34 34 34" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-angry', name: 'Angry Face', tags: ['mad', 'furious'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#EF4444"/><circle cx="16" cy="22" r="3" fill="#1F2937"/><circle cx="32" cy="22" r="3" fill="#1F2937"/><path d="M12 16L20 20" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M36 16L28 20" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M16 34C16 34 20 30 24 30C28 30 32 34 32 34" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-surprised', name: 'Surprised', tags: ['shock', 'wow', 'amazed'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><circle cx="16" cy="18" r="4" fill="#1F2937"/><circle cx="32" cy="18" r="4" fill="#1F2937"/><circle cx="16" cy="17" r="1.5" fill="#FFF"/><circle cx="32" cy="17" r="1.5" fill="#FFF"/><ellipse cx="24" cy="34" rx="5" ry="6" fill="#1F2937"/></svg>' },
  { id: 'st-thinking', name: 'Thinking', tags: ['wonder', 'ponder', 'hmm'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><circle cx="16" cy="20" r="3" fill="#1F2937"/><circle cx="32" cy="20" r="3" fill="#1F2937"/><path d="M20 32C22 30 26 30 28 32" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M12 14C14 12 18 14 18 14" stroke="#1F2937" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-star-eyes', name: 'Star Eyes', tags: ['excited', 'amazing', 'wow'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><path d="M16 16L17.5 19.5L21 20L18 22.5L19 26L16 24L13 26L14 22.5L11 20L14.5 19.5L16 16Z" fill="#FBBF24" stroke="#1F2937" stroke-width="1"/><path d="M32 16L33.5 19.5L37 20L34 22.5L35 26L32 24L29 26L30 22.5L27 20L30.5 19.5L32 16Z" fill="#FBBF24" stroke="#1F2937" stroke-width="1"/><path d="M14 30C14 30 18 36 24 36C30 36 34 30 34 30" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
  { id: 'st-sleeping', name: 'Sleeping', tags: ['zzz', 'tired', 'sleep'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#FBBF24"/><path d="M12 22C14 20 18 20 20 22" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 22C30 20 34 20 36 22" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="32" rx="4" ry="3" fill="#1F2937"/><text x="36" y="12" font-family="Arial" font-size="8" font-weight="bold" fill="#6B7280">Z</text><text x="40" y="8" font-family="Arial" font-size="6" font-weight="bold" fill="#9CA3AF">z</text></svg>' },
]

const STICKERS_LABELS: ElementItem[] = [
  { id: 'st-sale', name: 'Sale', tags: ['discount', 'promo', 'deal'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#EF4444"/><text x="24" y="28" font-family="Arial" font-size="12" font-weight="bold" fill="#FFF" text-anchor="middle">SALE</text></svg>' },
  { id: 'st-new', name: 'New', tags: ['fresh', 'release', 'latest'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L28 14L38 6L32 18L46 18L36 26L44 36L32 30L34 44L24 34L14 44L16 30L4 36L12 26L2 18L16 18L10 6L20 14L24 2Z" fill="#22C55E"/><text x="24" y="26" font-family="Arial" font-size="9" font-weight="bold" fill="#FFF" text-anchor="middle">NEW</text></svg>' },
  { id: 'st-hot', name: 'Hot', tags: ['trending', 'popular', 'fire'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C24 4 32 14 32 24C32 32 28 40 24 40C20 40 16 32 16 24C16 14 24 4 24 4Z" fill="#F97316"/><path d="M24 16C24 16 28 22 28 28C28 32 26 36 24 36C22 36 20 32 20 28C20 22 24 16 24 16Z" fill="#FBBF24"/><text x="24" y="32" font-family="Arial" font-size="8" font-weight="bold" fill="#FFF" text-anchor="middle">HOT</text></svg>' },
  { id: 'st-best', name: 'Best Seller', tags: ['top', 'popular', 'award'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L30 16.5L44 18.5L34 28L36.5 42L24 35.5L11.5 42L14 28L4 18.5L18 16.5L24 4Z" fill="#FBBF24"/><text x="24" y="26" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">BEST</text></svg>' },
  { id: 'st-free', name: 'Free', tags: ['no cost', 'gratis', 'offer'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#3B82F6"/><text x="24" y="28" font-family="Arial" font-size="11" font-weight="bold" fill="#FFF" text-anchor="middle">FREE</text></svg>' },
  { id: 'st-limited', name: 'Limited', tags: ['exclusive', 'rare', 'special'], svg: '<svg viewBox="0 0 48 24"><rect x="2" y="2" width="44" height="20" rx="10" fill="#1F2937"/><text x="24" y="16" font-family="Arial" font-size="9" font-weight="bold" fill="#FFF" text-anchor="middle">LIMITED</text></svg>' },
  { id: 'st-premium', name: 'Premium', tags: ['quality', 'luxury', 'vip'], svg: '<svg viewBox="0 0 48 24"><rect x="2" y="2" width="44" height="20" rx="4" fill="#7C3AED"/><text x="24" y="16" font-family="Arial" font-size="8" font-weight="bold" fill="#FFF" text-anchor="middle">PREMIUM</text></svg>' },
  { id: 'st-percent-off', name: '% Off', tags: ['discount', 'sale', 'deal'], svg: '<svg viewBox="0 0 48 48"><rect x="2" y="8" width="44" height="32" rx="4" fill="#EF4444"/><text x="24" y="30" font-family="Arial" font-size="12" font-weight="bold" fill="#FFF" text-anchor="middle">% OFF</text></svg>' },
  { id: 'st-featured', name: 'Featured', tags: ['spotlight', 'highlight'], svg: '<svg viewBox="0 0 48 24"><path d="M0 2H40L48 12L40 22H0V2Z" fill="#F59E0B"/><text x="20" y="16" font-family="Arial" font-size="8" font-weight="bold" fill="#FFF" text-anchor="middle">FEATURED</text></svg>' },
  { id: 'st-top-pick', name: 'Top Pick', tags: ['recommendation', 'best'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L44 24L24 44L4 24L24 4Z" fill="#8B5CF6"/><text x="24" y="22" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">TOP</text><text x="24" y="30" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">PICK</text></svg>' },
]

const STICKERS_SPEECH: ElementItem[] = [
  { id: 'st-bubble-round', name: 'Round Bubble', tags: ['speech', 'dialog', 'chat'], svg: '<svg viewBox="0 0 48 48"><path d="M44 20C44 10 35 4 24 4C13 4 4 10 4 20C4 30 13 34 18 34L12 44L26 34C36 33 44 28 44 20Z" fill="#FFF" stroke="#333" stroke-width="2"/></svg>' },
  { id: 'st-bubble-rect', name: 'Rectangle Bubble', tags: ['speech', 'dialog', 'chat'], svg: '<svg viewBox="0 0 48 48"><path d="M4 4H44V30H22L12 42V30H4V4Z" fill="#FFF" stroke="#333" stroke-width="2" stroke-linejoin="round"/></svg>' },
  { id: 'st-bubble-cloud', name: 'Cloud Bubble', tags: ['thought', 'dream', 'think'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="26" cy="18" rx="18" ry="14" fill="#FFF" stroke="#333" stroke-width="2"/><circle cx="14" cy="36" r="4" fill="#FFF" stroke="#333" stroke-width="1.5"/><circle cx="8" cy="42" r="2.5" fill="#FFF" stroke="#333" stroke-width="1.5"/></svg>' },
  { id: 'st-bubble-shout', name: 'Shout Bubble', tags: ['yell', 'exclaim', 'loud'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L28 10L36 6L32 14L42 14L36 20L44 24L36 28L42 34L32 34L36 42L28 38L24 44L20 38L12 42L16 34L6 34L12 28L4 24L12 20L6 14L16 14L12 6L20 10L24 4Z" fill="#FFF" stroke="#333" stroke-width="1.5"/></svg>' },
  { id: 'st-bubble-whisper', name: 'Whisper Bubble', tags: ['quiet', 'secret', 'soft'], svg: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="20" rx="20" ry="16" fill="#FFF" stroke="#333" stroke-width="1.5" stroke-dasharray="4 2"/><circle cx="14" cy="38" r="2" fill="#FFF" stroke="#333" stroke-width="1" stroke-dasharray="2 2"/><circle cx="10" cy="42" r="1.5" fill="#FFF" stroke="#333" stroke-width="1" stroke-dasharray="2 2"/></svg>' },
  { id: 'st-bubble-pow', name: 'POW!', tags: ['action', 'comic', 'impact'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L28 14L38 6L32 18L46 18L36 26L44 36L32 30L34 44L24 34L14 44L16 30L4 36L12 26L2 18L16 18L10 6L20 14L24 2Z" fill="#FBBF24" stroke="#333" stroke-width="1.5"/><text x="24" y="26" font-family="Arial" font-size="8" font-weight="bold" fill="#333" text-anchor="middle">POW!</text></svg>' },
  { id: 'st-bubble-boom', name: 'BOOM!', tags: ['explosion', 'comic', 'action'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L28 12L40 4L34 16L46 16L36 24L44 34L34 28L36 42L24 34L12 42L14 28L4 34L12 24L2 16L14 16L8 4L20 12L24 2Z" fill="#F97316" stroke="#333" stroke-width="1.5"/><text x="24" y="26" font-family="Arial" font-size="7" font-weight="bold" fill="#FFF" text-anchor="middle">BOOM!</text></svg>' },
]

// ─────────────────────────────────────────────────────────────
// BADGES & LABELS
// ─────────────────────────────────────────────────────────────

const BADGES_CIRCLES: ElementItem[] = [
  { id: 'b-circle-1', name: 'Simple Circle Badge', tags: ['round', 'dot'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#5A3FFF"/><circle cx="24" cy="24" r="15" fill="none" stroke="#FFF" stroke-width="1.5"/></svg>' },
  { id: 'b-circle-2', name: 'Double Ring Badge', tags: ['round', 'elegant'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#1F2937"/><circle cx="24" cy="24" r="17" fill="none" stroke="#FBBF24" stroke-width="1"/><circle cx="24" cy="24" r="14" fill="none" stroke="#FBBF24" stroke-width="1"/></svg>' },
  { id: 'b-circle-gradient', name: 'Gradient Badge', tags: ['modern', 'vibrant'], svg: '<svg viewBox="0 0 48 48"><defs><radialGradient id="bg1"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#5A3FFF"/></radialGradient></defs><circle cx="24" cy="24" r="20" fill="url(#bg1)"/></svg>' },
]

const BADGES_STARS: ElementItem[] = [
  { id: 'b-star-1', name: 'Star Badge', tags: ['award', 'favorite'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L30 16.5L44 18.5L34 28L36.5 42L24 35.5L11.5 42L14 28L4 18.5L18 16.5L24 4Z" fill="#FBBF24" stroke="#F59E0B" stroke-width="1"/></svg>' },
  { id: 'b-star-filled', name: 'Filled Star Badge', tags: ['award', 'rating'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L30 16.5L46 18.5L34 28L37 44L24 36L11 44L14 28L2 18.5L18 16.5L24 2Z" fill="#FFD700"/><path d="M24 10L28 20L38 21L30 28L32 38L24 33L16 38L18 28L10 21L20 20L24 10Z" fill="#FFF" opacity="0.3"/></svg>' },
]

const BADGES_SHIELDS: ElementItem[] = [
  { id: 'b-shield-1', name: 'Shield Badge', tags: ['security', 'protection'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L8 12V24C8 36 16 42 24 44C32 42 40 36 40 24V12L24 4Z" fill="#3B82F6"/><path d="M24 8L12 14V24C12 34 18 38 24 40C30 38 36 34 36 24V14L24 8Z" fill="#60A5FA"/></svg>' },
  { id: 'b-shield-check', name: 'Verified Shield', tags: ['verified', 'approved', 'check'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L8 12V24C8 36 16 42 24 44C32 42 40 36 40 24V12L24 4Z" fill="#22C55E"/><path d="M18 24L22 28L30 18" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
]

const BADGES_RIBBONS: ElementItem[] = [
  { id: 'b-ribbon-1', name: 'Ribbon Banner', tags: ['banner', 'label', 'flag'], svg: '<svg viewBox="0 0 48 24"><path d="M0 4H48V20H0L6 12L0 4Z" fill="#EF4444"/><path d="M0 4H48V8H4L0 4Z" fill="#DC2626"/></svg>' },
  { id: 'b-ribbon-2', name: 'Folded Ribbon', tags: ['banner', 'elegant'], svg: '<svg viewBox="0 0 48 24"><path d="M4 2H44V18H4L8 10L4 2Z" fill="#5A3FFF"/><path d="M0 6L4 2V6H0Z" fill="#3730A3"/><path d="M48 6L44 2V6H48Z" fill="#3730A3"/><path d="M44 18V22L48 18H44Z" fill="#3730A3"/><path d="M4 18V22L0 18H4Z" fill="#3730A3"/></svg>' },
  { id: 'b-ribbon-curved', name: 'Curved Ribbon', tags: ['banner', 'wave'], svg: '<svg viewBox="0 0 48 20"><path d="M2 16L0 4H6L8 10H40L42 4H48L46 16C46 16 38 20 24 20C10 20 2 16 2 16Z" fill="#F97316"/><path d="M0 4H6L8 10H40L42 4H48L46 8H2L0 4Z" fill="#EA580C"/></svg>' },
  { id: 'b-ribbon-award', name: 'Award Ribbon', tags: ['prize', 'winner', 'medal'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="18" r="14" fill="#3B82F6"/><circle cx="24" cy="18" r="10" fill="#2563EB"/><path d="M24 10L26 14L30 14.5L27 17.5L28 22L24 20L20 22L21 17.5L18 14.5L22 14L24 10Z" fill="#FBBF24"/><path d="M16 30L12 46L20 40L24 46L28 40L36 46L32 30" fill="#EF4444"/></svg>' },
]

const BADGES_SEALS: ElementItem[] = [
  { id: 'b-seal-1', name: 'Wavy Seal', tags: ['stamp', 'official', 'certified'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4L27 8L32 6L33 11L38 11L37 16L42 18L39 22L42 26L38 28L38 33L33 33L30 38L26 36L24 40L22 36L18 38L15 33L10 33L10 28L6 26L9 22L6 18L10 16L11 11L16 11L18 6L22 8L24 4Z" fill="#FBBF24"/><circle cx="24" cy="22" r="10" fill="#F59E0B"/></svg>' },
  { id: 'b-seal-quality', name: 'Quality Seal', tags: ['guarantee', 'certified'], svg: '<svg viewBox="0 0 48 48"><path d="M24 2L28 10L36 4L34 14L44 14L38 22L46 28L38 32L40 42L32 38L28 46L24 38L20 46L16 38L8 42L10 32L2 28L10 22L4 14L14 14L12 4L20 10L24 2Z" fill="#1F2937"/><circle cx="24" cy="24" r="12" fill="#FBBF24"/><path d="M18 24L22 28L30 18" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// SOCIAL MEDIA
// ─────────────────────────────────────────────────────────────

const SOCIAL_ICONS: ElementItem[] = [
  { id: 'soc-heart', name: 'Like Heart', tags: ['love', 'instagram', 'favorite'], svg: '<svg viewBox="0 0 48 48"><path d="M24 42C24 42 4 30 4 16C4 10 9 4 15 4C19 4 22 6 24 10C26 6 29 4 33 4C39 4 44 10 44 16C44 30 24 42 24 42Z" fill="#EF4444"/></svg>' },
  { id: 'soc-thumbs-up', name: 'Thumbs Up', tags: ['like', 'approve', 'facebook'], svg: '<svg viewBox="0 0 48 48"><path d="M14 22H8V42H14V22Z" fill="#3B82F6"/><path d="M14 22L20 8C22 4 28 4 28 10V18H38C40 18 42 20 42 22L38 40C38 42 36 42 34 42H14V22Z" fill="#60A5FA"/></svg>' },
  { id: 'soc-share', name: 'Share', tags: ['send', 'forward', 'repost'], svg: '<svg viewBox="0 0 48 48"><circle cx="36" cy="10" r="6" fill="#5A3FFF"/><circle cx="12" cy="24" r="6" fill="#5A3FFF"/><circle cx="36" cy="38" r="6" fill="#5A3FFF"/><line x1="17" y1="21" x2="31" y2="13" stroke="#5A3FFF" stroke-width="2"/><line x1="17" y1="27" x2="31" y2="35" stroke="#5A3FFF" stroke-width="2"/></svg>' },
  { id: 'soc-comment', name: 'Comment', tags: ['chat', 'message', 'reply'], svg: '<svg viewBox="0 0 48 48"><path d="M44 20C44 10 35 4 24 4C13 4 4 10 4 20C4 30 13 34 18 34L12 44L26 34C36 33 44 28 44 20Z" fill="#3B82F6"/></svg>' },
  { id: 'soc-bookmark', name: 'Bookmark', tags: ['save', 'later', 'pin'], svg: '<svg viewBox="0 0 48 48"><path d="M10 4H38V44L24 34L10 44V4Z" fill="#FBBF24"/></svg>' },
  { id: 'soc-notification', name: 'Notification Bell', tags: ['alert', 'bell', 'notify'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4C24 4 14 8 14 20V30L8 36H40L34 30V20C34 8 24 4 24 4Z" fill="#F59E0B"/><circle cx="24" cy="40" r="4" fill="#F59E0B"/><rect x="22" y="2" width="4" height="4" rx="2" fill="#F59E0B"/></svg>' },
  { id: 'soc-play-btn', name: 'Play Button', tags: ['video', 'youtube', 'watch'], svg: '<svg viewBox="0 0 48 48"><rect x="2" y="8" width="44" height="32" rx="8" fill="#EF4444"/><path d="M20 16L34 24L20 32V16Z" fill="#FFF"/></svg>' },
  { id: 'soc-follow', name: 'Follow Button', tags: ['subscribe', 'add', 'user'], svg: '<svg viewBox="0 0 48 24"><rect x="2" y="2" width="44" height="20" rx="10" fill="#3B82F6"/><text x="24" y="16" font-family="Arial" font-size="9" font-weight="bold" fill="#FFF" text-anchor="middle">FOLLOW</text></svg>' },
  { id: 'soc-verified', name: 'Verified Check', tags: ['blue check', 'authentic', 'official'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#3B82F6"/><path d="M16 24L22 30L32 18" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'soc-hashtag', name: 'Hashtag', tags: ['tag', 'trend', 'topic'], svg: '<svg viewBox="0 0 48 48"><line x1="16" y1="6" x2="12" y2="42" stroke="#333" stroke-width="4" stroke-linecap="round"/><line x1="36" y1="6" x2="32" y2="42" stroke="#333" stroke-width="4" stroke-linecap="round"/><line x1="6" y1="16" x2="42" y2="16" stroke="#333" stroke-width="4" stroke-linecap="round"/><line x1="6" y1="32" x2="42" y2="32" stroke="#333" stroke-width="4" stroke-linecap="round"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────────

const CHARTS: ElementItem[] = [
  { id: 'ch-bar', name: 'Bar Chart', tags: ['data', 'analytics', 'graph'], svg: '<svg viewBox="0 0 48 48"><rect x="4" y="28" width="6" height="16" rx="1" fill="#3B82F6"/><rect x="13" y="18" width="6" height="26" rx="1" fill="#8B5CF6"/><rect x="22" y="10" width="6" height="34" rx="1" fill="#EC4899"/><rect x="31" y="22" width="6" height="22" rx="1" fill="#F97316"/><rect x="40" y="14" width="6" height="30" rx="1" fill="#22C55E"/><line x1="2" y1="46" x2="48" y2="46" stroke="#333" stroke-width="1"/></svg>' },
  { id: 'ch-line', name: 'Line Chart', tags: ['data', 'trend', 'graph'], svg: '<svg viewBox="0 0 48 48"><polyline points="4 36 12 28 20 32 28 16 36 20 44 8" stroke="#3B82F6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 36L12 28L20 32L28 16L36 20L44 8V44H4V36Z" fill="#3B82F6" opacity="0.1"/><line x1="2" y1="44" x2="46" y2="44" stroke="#D4D4D8" stroke-width="1"/></svg>' },
  { id: 'ch-pie', name: 'Pie Chart', tags: ['data', 'percentage', 'distribution'], svg: '<svg viewBox="0 0 48 48"><path d="M24 4A20 20 0 0 1 42 18L24 24Z" fill="#3B82F6"/><path d="M42 18A20 20 0 0 1 30 42L24 24Z" fill="#EC4899"/><path d="M30 42A20 20 0 0 1 8 34L24 24Z" fill="#FBBF24"/><path d="M8 34A20 20 0 0 1 14 8L24 24Z" fill="#22C55E"/><path d="M14 8A20 20 0 0 1 24 4L24 24Z" fill="#8B5CF6"/></svg>' },
  { id: 'ch-donut', name: 'Donut Chart', tags: ['data', 'ring', 'circle'], svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#3B82F6" stroke-width="8" stroke-dasharray="40 73.1"/><circle cx="24" cy="24" r="18" fill="none" stroke="#EC4899" stroke-width="8" stroke-dasharray="25 88.1" stroke-dashoffset="-40"/><circle cx="24" cy="24" r="18" fill="none" stroke="#FBBF24" stroke-width="8" stroke-dasharray="20 93.1" stroke-dashoffset="-65"/><circle cx="24" cy="24" r="18" fill="none" stroke="#22C55E" stroke-width="8" stroke-dasharray="28.1 85" stroke-dashoffset="-85"/></svg>' },
  { id: 'ch-progress', name: 'Progress Bar', tags: ['loading', 'percentage', 'meter'], svg: '<svg viewBox="0 0 48 16"><rect x="2" y="4" width="44" height="8" rx="4" fill="#E5E7EB"/><rect x="2" y="4" width="30" height="8" rx="4" fill="#3B82F6"/></svg>' },
  { id: 'ch-gauge', name: 'Gauge', tags: ['meter', 'speed', 'dashboard'], svg: '<svg viewBox="0 0 48 32"><path d="M4 28A20 20 0 0 1 44 28" fill="none" stroke="#E5E7EB" stroke-width="6" stroke-linecap="round"/><path d="M4 28A20 20 0 0 1 34 10" fill="none" stroke="#22C55E" stroke-width="6" stroke-linecap="round"/><circle cx="24" cy="28" r="3" fill="#333"/><line x1="24" y1="28" x2="32" y2="14" stroke="#333" stroke-width="2" stroke-linecap="round"/></svg>' },
]

// ─────────────────────────────────────────────────────────────
// PATTERNS & TEXTURES
// ─────────────────────────────────────────────────────────────

const PATTERNS: ElementItem[] = [
  { id: 'p-dots', name: 'Dot Pattern', tags: ['halftone', 'texture'], svg: '<svg viewBox="0 0 48 48"><g fill="#333"><circle cx="8" cy="8" r="2"/><circle cx="24" cy="8" r="2"/><circle cx="40" cy="8" r="2"/><circle cx="8" cy="24" r="2"/><circle cx="24" cy="24" r="2"/><circle cx="40" cy="24" r="2"/><circle cx="8" cy="40" r="2"/><circle cx="24" cy="40" r="2"/><circle cx="40" cy="40" r="2"/><circle cx="16" cy="16" r="1.5"/><circle cx="32" cy="16" r="1.5"/><circle cx="16" cy="32" r="1.5"/><circle cx="32" cy="32" r="1.5"/></g></svg>' },
  { id: 'p-stripes', name: 'Diagonal Stripes', tags: ['lines', 'texture'], svg: '<svg viewBox="0 0 48 48"><g stroke="#333" stroke-width="2"><line x1="0" y1="8" x2="8" y2="0"/><line x1="0" y1="16" x2="16" y2="0"/><line x1="0" y1="24" x2="24" y2="0"/><line x1="0" y1="32" x2="32" y2="0"/><line x1="0" y1="40" x2="40" y2="0"/><line x1="0" y1="48" x2="48" y2="0"/><line x1="8" y1="48" x2="48" y2="8"/><line x1="16" y1="48" x2="48" y2="16"/><line x1="24" y1="48" x2="48" y2="24"/><line x1="32" y1="48" x2="48" y2="32"/><line x1="40" y1="48" x2="48" y2="40"/></g></svg>' },
  { id: 'p-grid', name: 'Grid Pattern', tags: ['squares', 'mesh', 'table'], svg: '<svg viewBox="0 0 48 48"><g stroke="#D4D4D8" stroke-width="1"><line x1="12" y1="0" x2="12" y2="48"/><line x1="24" y1="0" x2="24" y2="48"/><line x1="36" y1="0" x2="36" y2="48"/><line x1="0" y1="12" x2="48" y2="12"/><line x1="0" y1="24" x2="48" y2="24"/><line x1="0" y1="36" x2="48" y2="36"/></g></svg>' },
  { id: 'p-chevrons', name: 'Chevron Pattern', tags: ['arrows', 'zigzag'], svg: '<svg viewBox="0 0 48 48"><g stroke="#5A3FFF" stroke-width="2" fill="none"><polyline points="4 12 24 4 44 12"/><polyline points="4 24 24 16 44 24"/><polyline points="4 36 24 28 44 36"/><polyline points="4 48 24 40 44 48"/></g></svg>' },
  { id: 'p-waves', name: 'Wave Pattern', tags: ['water', 'ocean', 'fluid'], svg: '<svg viewBox="0 0 48 48"><g stroke="#3B82F6" stroke-width="2" fill="none"><path d="M0 8Q6 4 12 8Q18 12 24 8Q30 4 36 8Q42 12 48 8"/><path d="M0 20Q6 16 12 20Q18 24 24 20Q30 16 36 20Q42 24 48 20"/><path d="M0 32Q6 28 12 32Q18 36 24 32Q30 28 36 32Q42 36 48 32"/><path d="M0 44Q6 40 12 44Q18 48 24 44Q30 40 36 44Q42 48 48 44"/></g></svg>' },
  { id: 'p-crosshatch', name: 'Crosshatch', tags: ['lines', 'sketch', 'texture'], svg: '<svg viewBox="0 0 48 48"><g stroke="#333" stroke-width="1" opacity="0.5"><line x1="0" y1="0" x2="48" y2="48"/><line x1="12" y1="0" x2="48" y2="36"/><line x1="24" y1="0" x2="48" y2="24"/><line x1="36" y1="0" x2="48" y2="12"/><line x1="0" y1="12" x2="36" y2="48"/><line x1="0" y1="24" x2="24" y2="48"/><line x1="0" y1="36" x2="12" y2="48"/><line x1="48" y1="0" x2="0" y2="48"/><line x1="36" y1="0" x2="0" y2="36"/><line x1="24" y1="0" x2="0" y2="24"/><line x1="12" y1="0" x2="0" y2="12"/><line x1="48" y1="12" x2="12" y2="48"/><line x1="48" y1="24" x2="24" y2="48"/><line x1="48" y1="36" x2="36" y2="48"/></g></svg>' },
  { id: 'p-hexagons', name: 'Hexagon Pattern', tags: ['honeycomb', 'geometric'], svg: '<svg viewBox="0 0 48 48"><g fill="none" stroke="#333" stroke-width="1"><path d="M12 4L20 8V16L12 20L4 16V8L12 4Z"/><path d="M36 4L44 8V16L36 20L28 16V8L36 4Z"/><path d="M24 16L32 20V28L24 32L16 28V20L24 16Z"/><path d="M12 28L20 32V40L12 44L4 40V32L12 28Z"/><path d="M36 28L44 32V40L36 44L28 40V32L36 28Z"/></g></svg>' },
  { id: 'p-triangles', name: 'Triangle Pattern', tags: ['geometric', 'mosaic'], svg: '<svg viewBox="0 0 48 48"><g fill="none" stroke="#333" stroke-width="1"><path d="M0 16L8 0L16 16H0Z"/><path d="M16 16L24 0L32 16H16Z"/><path d="M32 16L40 0L48 16H32Z"/><path d="M8 32L0 16L16 16L8 32Z"/><path d="M24 32L16 16L32 16L24 32Z"/><path d="M40 32L32 16L48 16L40 32Z"/><path d="M0 48L8 32L16 48H0Z"/><path d="M16 48L24 32L32 48H16Z"/><path d="M32 48L40 32L48 48H32Z"/></g></svg>' },
]

// ─────────────────────────────────────────────────────────────
// ASSEMBLE ALL CATEGORIES
// ─────────────────────────────────────────────────────────────

export const ELEMENT_LIBRARY: ElementCategory[] = [
  {
    id: 'shapes',
    name: 'Shapes',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><circle cx="17.5" cy="6.5" r="4.5"/><path d="M12 17l5 7H7l5-7z"/></svg>',
    subcategories: [
      { id: 'shapes-basic', name: 'Basic Shapes', elements: SHAPES_BASIC },
      { id: 'shapes-abstract', name: 'Abstract & Organic', elements: SHAPES_ABSTRACT },
      { id: 'shapes-geometric', name: 'Geometric', elements: SHAPES_GEOMETRIC },
      { id: 'shapes-outlined', name: 'Outlined', elements: SHAPES_OUTLINED },
    ],
  },
  {
    id: 'lines',
    name: 'Lines & Arrows',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    subcategories: [
      { id: 'lines-basic', name: 'Lines', elements: LINES_BASIC },
      { id: 'lines-arrows', name: 'Arrows', elements: LINES_ARROWS },
      { id: 'lines-dividers', name: 'Dividers', elements: LINES_DIVIDERS },
      { id: 'lines-connectors', name: 'Connectors', elements: LINES_CONNECTORS },
    ],
  },
  {
    id: 'graphics',
    name: 'Graphics',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    subcategories: [
      { id: 'graphics-nature', name: 'Nature', elements: GRAPHICS_NATURE },
      { id: 'graphics-food', name: 'Food & Drinks', elements: GRAPHICS_FOOD },
      { id: 'graphics-celebration', name: 'Celebration', elements: GRAPHICS_CELEBRATION },
      { id: 'graphics-travel', name: 'Travel', elements: GRAPHICS_TRAVEL },
      { id: 'graphics-business', name: 'Business', elements: GRAPHICS_BUSINESS },
      { id: 'graphics-tech', name: 'Technology', elements: GRAPHICS_TECH },
      { id: 'graphics-people', name: 'People', elements: GRAPHICS_PEOPLE },
    ],
  },
  {
    id: 'frames',
    name: 'Frames',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10"/></svg>',
    subcategories: [
      { id: 'frames-basic', name: 'Basic Frames', elements: FRAMES_BASIC },
      { id: 'frames-decorative', name: 'Decorative', elements: FRAMES_DECORATIVE },
      { id: 'frames-photo', name: 'Photo Frames', elements: FRAMES_PHOTO },
    ],
  },
  {
    id: 'stickers',
    name: 'Stickers',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    subcategories: [
      { id: 'stickers-emoji', name: 'Emoji', elements: STICKERS_EMOJI },
      { id: 'stickers-labels', name: 'Labels', elements: STICKERS_LABELS },
      { id: 'stickers-speech', name: 'Speech Bubbles', elements: STICKERS_SPEECH },
    ],
  },
  {
    id: 'badges',
    name: 'Badges',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    subcategories: [
      { id: 'badges-circles', name: 'Circle Badges', elements: BADGES_CIRCLES },
      { id: 'badges-stars', name: 'Star Badges', elements: BADGES_STARS },
      { id: 'badges-shields', name: 'Shields', elements: BADGES_SHIELDS },
      { id: 'badges-ribbons', name: 'Ribbons', elements: BADGES_RIBBONS },
      { id: 'badges-seals', name: 'Seals', elements: BADGES_SEALS },
    ],
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    subcategories: [
      { id: 'social-icons', name: 'Social Icons', elements: SOCIAL_ICONS },
    ],
  },
  {
    id: 'charts',
    name: 'Charts',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    subcategories: [
      { id: 'charts-all', name: 'Charts & Graphs', elements: CHARTS },
    ],
  },
  {
    id: 'patterns',
    name: 'Patterns',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    subcategories: [
      { id: 'patterns-all', name: 'Patterns & Textures', elements: PATTERNS },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// SEARCH & UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/** Flatten all elements for global search */
let _allElementsCache: (ElementItem & { categoryId: string; categoryName: string; subcategoryName: string })[] | null = null

export function getAllElements() {
  if (_allElementsCache) return _allElementsCache
  _allElementsCache = []
  for (const category of ELEMENT_LIBRARY) {
    for (const sub of category.subcategories) {
      for (const el of sub.elements) {
        _allElementsCache.push({
          ...el,
          categoryId: category.id,
          categoryName: category.name,
          subcategoryName: sub.name,
        })
      }
    }
  }
  return _allElementsCache
}

/** Search elements by query */
export function searchElements(query: string, limit = 60) {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const all = getAllElements()
  const results: typeof all = []

  // Exact name match first
  for (const el of all) {
    if (el.name.toLowerCase() === q) {
      results.push(el)
    }
  }

  // Name starts with
  for (const el of all) {
    if (!results.includes(el) && el.name.toLowerCase().startsWith(q)) {
      results.push(el)
    }
  }

  // Name contains
  for (const el of all) {
    if (!results.includes(el) && el.name.toLowerCase().includes(q)) {
      results.push(el)
    }
  }

  // Tag match
  for (const el of all) {
    if (!results.includes(el) && el.tags?.some(t => t.includes(q))) {
      results.push(el)
    }
  }

  // Category/subcategory match
  for (const el of all) {
    if (!results.includes(el) && (el.categoryName.toLowerCase().includes(q) || el.subcategoryName.toLowerCase().includes(q))) {
      results.push(el)
    }
  }

  return results.slice(0, limit)
}

/** Get total element count */
export function getTotalElementCount(): number {
  return getAllElements().length
}

/** Get popular/featured elements (curated selection) */
export function getPopularElements(): ElementItem[] {
  return [
    SHAPES_BASIC[0],   // Rectangle
    SHAPES_BASIC[3],   // Circle
    SHAPES_BASIC[16],  // Heart
    SHAPES_BASIC[14],  // Star
    SHAPES_ABSTRACT[0],  // Blob
    SHAPES_ABSTRACT[5],  // Teardrop
    SHAPES_ABSTRACT[12], // Lightning
    LINES_ARROWS[0],   // Arrow Right
    GRAPHICS_NATURE[0], // Sun
    GRAPHICS_NATURE[11], // Mountain
    GRAPHICS_FOOD[4],   // Coffee
    GRAPHICS_FOOD[5],   // Cake
    GRAPHICS_CELEBRATION[0], // Balloon
    GRAPHICS_CELEBRATION[3], // Trophy
    GRAPHICS_CELEBRATION[5], // Crown
    GRAPHICS_CELEBRATION[9], // Sparkle
    GRAPHICS_TRAVEL[6],  // Map Pin
    GRAPHICS_BUSINESS[0], // Lightbulb
    GRAPHICS_BUSINESS[1], // Rocket
    STICKERS_EMOJI[0],   // Happy
    STICKERS_EMOJI[1],   // Love Eyes
    STICKERS_LABELS[0],  // Sale
    BADGES_RIBBONS[3],   // Award Ribbon
    SOCIAL_ICONS[8],     // Verified Check
  ]
}
