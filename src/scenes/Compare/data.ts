/**
 * Head-to-head comparison articles. Competitor details are limited to stable,
 * public facts (no prices — plans change too often to keep them honest), and
 * every page says plainly where the other tool is the better pick.
 */

export interface Comparison {
  slug: string
  name: string
  /** One-line description of what the competitor is. */
  kind: string
  title: string
  description: string
  headline: [string, string]
  intro: string[]
  /** [feature, Marketifyall, competitor] */
  table: [string, string, string][]
  theyWin: string[]
  weWin: string[]
  pickThem: string
  pickUs: string
  faq: [string, string][]
}

export const REVIEWED = 'October 2026'

export const COMPARISONS: Comparison[] = [
  {
    slug: 'canva-alternative',
    name: 'Canva',
    kind: 'All-in-one online design platform',
    title: 'Marketifyall vs Canva — a free, open-source Canva alternative',
    description:
      'Marketifyall vs Canva compared: templates, Magic Resize, Brand Kit, video, export and price. Where Canva is better, and where a free, open-source editor makes more sense.',
    headline: ['Marketifyall vs', 'Canva'],
    intro: [
      'Canva is the default answer for “I need a graphic by lunch”. It has an enormous template and stock library, real-time collaboration, native mobile apps and a deep set of AI features. Several of its best tools — Magic Resize, Brand Kit, background removal and most premium content — sit behind the paid Pro plan.',
      'Marketifyall covers the same everyday workflow: templates, text effects, photo editing, resizing, brand colours and fonts, video and export. Every tool is free, there is no watermark, and the whole editor is open source under MIT, so you can self-host it or embed it in your own product.',
    ],
    table: [
      ['Price', 'Free, every feature', 'Free plan; Pro and Teams are paid'],
      ['Magic Resize', 'Free', 'Pro'],
      ['Brand Kit', 'Free', 'Pro (one basic kit on free)'],
      ['Background remover', 'Free, runs on your device', 'Pro'],
      ['Template library', '128 templates', 'Hundreds of thousands'],
      ['Video editing', 'Multi-track timeline, MP4 / WebM / GIF up to 4K', 'Timeline editor; 4K export on paid plans'],
      ['Real-time collaboration', 'No (pinned comments only)', 'Yes'],
      ['AI generation', 'No', 'Yes (Magic Studio)'],
      ['Mobile', 'Mobile-friendly web editor', 'Native iOS and Android apps'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
      ['Embed in your product', 'Yes, one iframe', 'Via Canva’s partner APIs'],
    ],
    theyWin: [
      'Far larger template, photo, video and audio library.',
      'Live multiplayer editing and team workspaces.',
      'Generative AI tools for images, copy and video.',
      'Native mobile apps and print ordering.',
    ],
    weWin: [
      'Pro-level tools — Magic Resize, Brand Kit, background removal — cost nothing.',
      'Open source: read the code, self-host it, change it.',
      'Embeddable: put the full editor inside your own SaaS with one iframe.',
      'Video and audio uploads stay in your browser instead of a cloud account.',
    ],
    pickThem:
      'You work in a team that edits together every day, you lean on a huge stock library, or you want AI to generate first drafts.',
    pickUs:
      'You want Canva’s core tools without a subscription, you care about owning your files and tools, or you need an editor inside your own product.',
    faq: [
      [
        'Is Marketifyall a Canva clone?',
        'No. It covers similar everyday tasks — templates, resizing, brand kits, video — but it is its own open-source editor with its own design and file format (plain JSON).',
      ],
      [
        'Can I open my Canva designs in Marketifyall?',
        'Not directly. Canva doesn’t export an editable file format. Export your Canva design as PDF, PNG or SVG and bring the assets in as uploads.',
      ],
      [
        'Is there a watermark on free exports?',
        'No. Every export — PNG, JPG, SVG, PDF, MP4, WebM and GIF — is watermark-free.',
      ],
    ],
  },
  {
    slug: 'adobe-express-alternative',
    name: 'Adobe Express',
    kind: 'Adobe’s quick-design and social content app',
    title: 'Marketifyall vs Adobe Express — free alternative compared',
    description:
      'Marketifyall vs Adobe Express: templates, resizing, brand tools, video, AI and price. An honest comparison of Adobe’s quick-design app and a free, open-source editor.',
    headline: ['Marketifyall vs', 'Adobe Express'],
    intro: [
      'Adobe Express is Adobe’s answer to quick social graphics and short videos. It brings Adobe Fonts, Adobe Stock and Firefly generative AI into a simple editor, with one-tap “quick actions” such as background removal and video trimming. The full font and stock library, resizing and brand kits are part of the Premium plan.',
      'Marketifyall is a lighter, fully free editor. It doesn’t carry Adobe’s stock or AI, but it gives you resizing, a Brand Kit, text effects, on-device background removal and a multi-track video timeline with no plan to buy and no Adobe ID to create.',
    ],
    table: [
      ['Price', 'Free, every feature', 'Free plan; Premium is paid'],
      ['Account required', 'No (demo works without sign-in)', 'Yes, Adobe ID'],
      ['Resize to other formats', 'Free (Magic Resize)', 'Premium'],
      ['Brand Kit', 'Free', 'Premium'],
      ['Fonts', 'Google Fonts library', 'Adobe Fonts (full library on Premium)'],
      ['Generative AI', 'No', 'Yes (Firefly)'],
      ['Video editing', 'Multi-track timeline with transitions', 'Scene-based video editor'],
      ['Photoshop / Illustrator hand-off', 'No', 'Yes, via Creative Cloud'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
      ['Embed in your product', 'Yes, one iframe', 'Yes, Adobe Express Embed SDK'],
    ],
    theyWin: [
      'Adobe Fonts and Adobe Stock built in.',
      'Firefly generative fill, text-to-image and text effects.',
      'Smooth hand-off to Photoshop, Illustrator and the rest of Creative Cloud.',
    ],
    weWin: [
      'No account and no paid tier — open it and start.',
      'A real multi-track timeline with split, trim, snapping and J/K/L shortcuts.',
      'Open source, so you can host and customise the whole editor.',
      'Background removal and Magic Eraser run on your device.',
    ],
    pickThem:
      'You already pay for Creative Cloud, you want Firefly AI, or your work moves on to Photoshop and Illustrator.',
    pickUs:
      'You want a free, no-sign-up editor for social graphics and short videos, or you need one you can self-host and embed without a vendor SDK agreement.',
    faq: [
      [
        'Does Marketifyall have Adobe Fonts?',
        'No. It uses the Google Fonts library, and your Brand Kit keeps your heading, subheading and body fonts one click away.',
      ],
      [
        'Can I export a PDF for print?',
        'Yes. Multi-page designs export as a single PDF, and images export at up to 4× resolution.',
      ],
      [
        'Is my work stored on Adobe-style cloud storage?',
        'In demo mode, designs save to your browser. Signed-in users can save designs to their Marketifyall account; video and audio uploads stay in the browser either way.',
      ],
    ],
  },
  {
    slug: 'clipchamp-alternative',
    name: 'Clipchamp',
    kind: 'Microsoft’s browser-based video editor',
    title: 'Marketifyall vs Clipchamp — video editor comparison',
    description:
      'Marketifyall vs Clipchamp: timeline, transitions, audio, export quality and design tools compared. A free, open-source editor that does both video and graphics.',
    headline: ['Marketifyall vs', 'Clipchamp'],
    intro: [
      'Clipchamp is Microsoft’s video editor, built into Windows and available in the browser. It is a focused, polished video tool: drag-and-drop timeline, transitions, a stock library, text-to-speech voiceovers and auto-captions, with 1080p exports on the free plan and 4K and premium stock on paid plans.',
      'Our video editor took a lot of cues from Clipchamp — the magnetic main track, snapping, split with S, J/K/L playback. The difference is that Marketifyall is a design editor first: the same canvas makes posters, social posts and presentations, and video is one more thing a page can do.',
    ],
    table: [
      ['Price', 'Free, every feature', 'Free plan; Premium is paid'],
      ['Timeline', 'Multi-track, magnetic main track, snapping', 'Multi-track, magnetic'],
      ['Max export', 'Up to 4K, free', '1080p free; 4K on Premium'],
      ['Export formats', 'MP4, WebM, GIF', 'MP4'],
      ['Auto-captions', 'No', 'Yes'],
      ['Text-to-speech voiceover', 'No', 'Yes'],
      ['Static design (posters, social, PDF)', 'Yes, full design editor', 'No'],
      ['Where media is processed', 'In your browser', 'In your browser'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
      ['Embed in your product', 'Yes, one iframe', 'No'],
    ],
    theyWin: [
      'Auto-captions and AI voiceovers.',
      'A larger stock video and music library.',
      'Built into Windows, with OneDrive integration.',
    ],
    weWin: [
      'Graphics and video in one editor — no switching tools for a thumbnail.',
      '4K and GIF export without a paid plan.',
      'Open source and embeddable.',
    ],
    pickThem: 'Video is all you make, and you want captions and voiceovers done for you.',
    pickUs:
      'You make video and graphics together — a reel plus its cover and a carousel — or you need a video editor inside your own product.',
    faq: [
      [
        'Will my exported video flicker?',
        'No. Exports are rendered frame by frame and encoded in the browser, so every frame is drawn completely before it is written.',
      ],
      [
        'Can I add music and voice tracks?',
        'Yes. Add audio from uploads, set volume and fades, and the export mixes every track.',
      ],
      ['Does it work on a phone?', 'Yes. The editor switches to a phone layout with a bottom toolbar and touch gestures.'],
    ],
  },
  {
    slug: 'kapwing-alternative',
    name: 'Kapwing',
    kind: 'Collaborative online video editor',
    title: 'Marketifyall vs Kapwing — online video editor comparison',
    description:
      'Marketifyall vs Kapwing compared: video timeline, AI tools, collaboration, export limits and design features. A free, open-source alternative for social video and graphics.',
    headline: ['Marketifyall vs', 'Kapwing'],
    intro: [
      'Kapwing is a browser video editor built for teams making social content. It leans hard into AI — subtitles, translation, dubbing, clip finding and smart cuts — and its projects live in a shared cloud workspace. The free plan limits export length and quality; the paid plans lift them.',
      'Marketifyall has no AI and no cloud workspace for video. What it does have is a full timeline, free 4K export and a design editor alongside it, with your media kept in your browser and the entire editor open source.',
    ],
    table: [
      ['Price', 'Free, every feature', 'Free plan with limits; paid plans'],
      ['Timeline', 'Multi-track, magnetic, snapping', 'Multi-track'],
      ['Export limits', 'Up to 4K, no length cap', 'Limited on free plan'],
      ['AI subtitles / dubbing', 'No', 'Yes'],
      ['Team workspace', 'No', 'Yes'],
      ['Static design (posters, social, PDF)', 'Yes, full design editor', 'Basic image editing'],
      ['Where media lives', 'Your browser', 'Kapwing cloud'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
      ['Embed in your product', 'Yes, one iframe', 'No'],
    ],
    theyWin: [
      'Strong AI tools: subtitles, translation, dubbing, smart cut.',
      'Shared cloud workspace for teams.',
      'Better for long-form talking-head editing.',
    ],
    weWin: [
      'No export caps on the free tier.',
      'Graphics editor and video editor in the same app.',
      'Your footage stays on your device.',
      'Open source and embeddable.',
    ],
    pickThem: 'Your team edits talking-head or podcast clips and wants AI to subtitle and trim them.',
    pickUs: 'You want unlimited free exports, keep media private, or need graphics and short video in one place.',
    faq: [
      [
        'Are video uploads sent to a server?',
        'No. Video and audio uploads are stored in your browser (IndexedDB) and the export happens on your device.',
      ],
      ['Is there a length limit on exports?', 'No hard limit. Longer videos simply take longer to render on your machine.'],
      [
        'Does it add subtitles automatically?',
        'Not today. You can add and animate text on the timeline by hand.',
      ],
    ],
  },
  {
    slug: 'vistacreate-alternative',
    name: 'VistaCreate',
    kind: 'Template-based graphic design tool (formerly Crello)',
    title: 'Marketifyall vs VistaCreate — free design tool comparison',
    description:
      'Marketifyall vs VistaCreate (formerly Crello): templates, animation, brand kits, background removal and price compared. A free, open-source alternative.',
    headline: ['Marketifyall vs', 'VistaCreate'],
    intro: [
      'VistaCreate, once called Crello, is a template-led design tool from the VistaPrint family. Its strength is a large library of static and animated templates for social media, plus a direct path to printing through VistaPrint. Background removal, resizing and brand kits are on the Pro plan.',
      'Marketifyall has a much smaller template library, but every tool is free, its animation and video editing go further than template-level animation, and it is open source.',
    ],
    table: [
      ['Price', 'Free, every feature', 'Free plan; Pro is paid'],
      ['Templates', '128 templates', 'Large static and animated library'],
      ['Resize', 'Free (Magic Resize)', 'Pro'],
      ['Background remover', 'Free, on-device', 'Pro'],
      ['Brand Kit', 'Free', 'Pro'],
      ['Animation', 'Animation presets + multi-track timeline', 'Animated templates and objects'],
      ['Print ordering', 'No', 'Yes, via VistaPrint'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
      ['Embed in your product', 'Yes, one iframe', 'No'],
    ],
    theyWin: ['Many more templates, especially animated ones.', 'Order prints straight from the design.'],
    weWin: [
      'Resize, Brand Kit and background removal are free.',
      'Real video editing, not only animated templates.',
      'Open source and embeddable.',
    ],
    pickThem: 'You start every design from a template and want to print it through VistaPrint.',
    pickUs: 'You want the Pro tools for free, need proper video editing, or want to run the editor yourself.',
    faq: [
      [
        'Can I make animated social posts?',
        'Yes. Apply animation presets to any element and export as MP4, WebM or GIF.',
      ],
      ['Can I print my designs?', 'Export a print-ready PDF or a high-resolution PNG and send it to any printer.'],
      [
        'How many templates are there?',
        '128 today, covering social posts, stories, presentations, posters and more. Every template is free.',
      ],
    ],
  },
  {
    slug: 'polotno-alternative',
    name: 'Polotno',
    kind: 'JavaScript SDK for building design editors',
    title: 'Marketifyall vs Polotno — embeddable design editor comparison',
    description:
      'Marketifyall vs Polotno SDK: embedding, licensing, customisation, video and features compared for teams adding a design editor to their product.',
    headline: ['Marketifyall vs', 'Polotno'],
    intro: [
      'Polotno is a JavaScript SDK for building your own Canva-style editor inside a web app. You assemble it from React components, control it through a store API, and get a design editor that looks like part of your product. Commercial use requires a paid licence; Polotno Studio is its free hosted demo app.',
      'Marketifyall comes at the same problem from the other end: it is a finished, open-source editor you drop in with one iframe and talk to with postMessage. You trade some of Polotno’s fine-grained control for zero integration work and an MIT licence.',
    ],
    table: [
      ['What it is', 'Complete editor app', 'SDK of editor components'],
      ['Licence', 'MIT, free for commercial use', 'Commercial licence required'],
      ['Integration', 'One iframe + postMessage', 'npm package, React components'],
      ['UI customisation', 'Fork the source, or use as-is', 'Compose your own UI in code'],
      ['Video timeline', 'Multi-track timeline with MP4 export', 'Animations and video export'],
      ['Design format', 'Plain JSON', 'Plain JSON'],
      ['Self-host', 'Yes', 'Yes (inside your app)'],
      ['Server-side rendering', 'No', 'Yes, via its cloud render API'],
    ],
    theyWin: [
      'Fine-grained control: build exactly the UI you want in React.',
      'Server-side rendering API for automated image and video generation.',
      'Commercial support with the licence.',
    ],
    weWin: [
      'MIT licence — no per-domain or per-seat fees.',
      'Works in an afternoon: one iframe, no build changes.',
      'A full editor out of the box, video timeline included.',
    ],
    pickThem:
      'The editor is the core of your product, your team will build its UI in React, and you need server-side rendering.',
    pickUs: 'You want a complete editor in your product quickly, with no licence fees, and you’re happy to fork the source if you need changes.',
    faq: [
      [
        'How do I embed Marketifyall?',
        'Add an iframe pointing at /embed, then load images, set the canvas size and trigger exports through postMessage. See the developer docs for the message reference.',
      ],
      [
        'Can I white-label it?',
        'Yes. It is MIT-licensed, so you can fork it and change the branding, panels and features.',
      ],
      [
        'Can I generate images on a server?',
        'Not with a built-in API. Designs are plain JSON, so you can render them with your own headless browser setup.',
      ],
    ],
  },
  {
    slug: 'pixlr-alternative',
    name: 'Pixlr',
    kind: 'Online photo editor and quick-design suite',
    title: 'Marketifyall vs Pixlr — online editor comparison',
    description:
      'Marketifyall vs Pixlr: photo editing, templates, AI tools, video and ads compared. A free, ad-free, open-source design and video editor.',
    headline: ['Marketifyall vs', 'Pixlr'],
    intro: [
      'Pixlr is a family of browser editors — Pixlr E for detailed photo editing, Pixlr X for quick edits and Pixlr Express for templates — with a growing set of AI tools. The free tier is supported by ads and has daily limits on some features; Premium removes them.',
      'Marketifyall is a layout and video editor rather than a pixel editor. It handles the photo jobs most social designs need — crop, filters, adjustments, background removal, Magic Eraser, frames — with no ads and no daily caps.',
    ],
    table: [
      ['Price', 'Free, every feature', 'Free with ads; Premium is paid'],
      ['Ads', 'None', 'On the free tier'],
      ['Layer-based photo editing', 'Basic (crop, filters, adjust)', 'Advanced (Pixlr E)'],
      ['Background removal', 'Free, on-device', 'Yes, limited on free tier'],
      ['Generative AI', 'No', 'Yes'],
      ['Templates and layout', 'Full design editor, 128 templates', 'Templates in Pixlr Express'],
      ['Video editing', 'Multi-track timeline', 'Limited'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
    ],
    theyWin: [
      'Deeper photo editing: brushes, masks, healing, layer blend modes.',
      'Generative AI fill and image generation.',
    ],
    weWin: [
      'No ads and no daily limits.',
      'A proper layout editor with multi-page designs and PDF export.',
      'A real video timeline.',
      'Open source and embeddable.',
    ],
    pickThem: 'You retouch photos pixel by pixel or want AI image generation.',
    pickUs: 'You build social posts, slides and short videos from photos, and want it free with no ads.',
    faq: [
      [
        'Can I remove a background?',
        'Yes. Select a photo and choose Remove background. It runs on your device, so the photo isn’t uploaded.',
      ],
      ['Can I remove objects from a photo?', 'Yes, with Magic Eraser: brush over the object and it is filled from its surroundings.'],
      ['Are there ads?', 'No.'],
    ],
  },
  {
    slug: 'photopea-alternative',
    name: 'Photopea',
    kind: 'Free browser image editor with PSD support',
    title: 'Marketifyall vs Photopea — which free browser editor fits?',
    description:
      'Marketifyall vs Photopea: PSD editing, layout, templates, video and export compared. Two free browser editors built for different jobs.',
    headline: ['Marketifyall vs', 'Photopea'],
    intro: [
      'Photopea is a remarkably complete Photoshop-style editor that runs in the browser. It opens PSD, XCF, Sketch and many other files, and supports layers, masks, smart objects and adjustment layers. It is free with ads, and a paid account removes them.',
      'Both tools are free and run in the browser, but they answer different questions. Photopea is for editing an image in depth. Marketifyall is for laying out a design or video quickly — from a template, with brand fonts and colours, resized for every platform.',
    ],
    table: [
      ['Price', 'Free, no ads', 'Free with ads; paid removes ads'],
      ['Opens PSD files', 'No', 'Yes'],
      ['Layers, masks, adjustment layers', 'Layers, basic adjustments', 'Full Photoshop-style set'],
      ['Templates', '128 templates', 'No template library'],
      ['Magic Resize to other formats', 'Yes', 'No'],
      ['Brand Kit', 'Yes', 'No'],
      ['Video editing', 'Multi-track timeline', 'No'],
      ['Multi-page PDF', 'Yes', 'No'],
      ['Open source / self-host', 'Yes, MIT', 'No'],
    ],
    theyWin: ['Opens and edits PSD and other pro formats.', 'Deep pixel editing with masks and adjustment layers.'],
    weWin: [
      'Start from a template and resize to any platform in one click.',
      'Brand colours and fonts one click away.',
      'Video, animation and multi-page PDF.',
      'No ads, and open source.',
    ],
    pickThem: 'You need to open a PSD or do Photoshop-level retouching without installing Photoshop.',
    pickUs: 'You need finished social posts, slides or videos, fast and on-brand.',
    faq: [
      ['Can I use both?', 'Yes. Retouch an image in Photopea, export a PNG, then upload it to Marketifyall for layout.'],
      ['Can Marketifyall open PSD files?', 'No. Export your PSD layers as PNG or SVG and upload them.'],
      ['Does it export SVG?', 'Yes, alongside PNG, JPG, PDF, MP4, WebM and GIF.'],
    ],
  },
]

export const comparisonBySlug = (slug: string) => COMPARISONS.find(c => c.slug === slug)
