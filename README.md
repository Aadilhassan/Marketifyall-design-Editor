# 🎨 Design Editor by Marketifyall

<div align="center">

![Design Editor](https://img.shields.io/badge/Design-Editor-FF6B5B?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open-Source-2ECC71?style=for-the-badge)
![Free Forever](https://img.shields.io/badge/Free-Forever-667eea?style=for-the-badge)

**A free, open-source Canva alternative with AI-powered design features**

[🚀 Try Live Demo](https://design.marketifyall.com/) • [📖 Documentation](#features) • [🐛 Report Bug](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues) • [✨ Request Feature](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues)

</div>

---

## 🌟 Overview

**Design Editor by Marketifyall** is a powerful, free, and open-source graphic design tool that brings professional design capabilities to everyone. Built as a true Canva alternative, it combines intuitive design tools with AI-powered features to help you create stunning visuals without any restrictions.

### Why Design Editor?

- ✅ **100% Free** - No subscriptions, no hidden costs, no feature paywalls
- ✅ **Open Source** - Transparent, community-driven development
- ✅ **AI-Powered** - Built-in GPT-4 and Claude integration for smart design
- ✅ **No Watermarks** - Export clean, professional designs every time
- ✅ **No Limits** - Unlimited designs, unlimited exports, unlimited creativity
- ✅ **Batteries Included** - Stock photos, 1000+ fonts, templates, and more

---

## ✨ Features

### 🤖 AI-Powered Design
- **Text-to-Design Generation** - Describe your vision, let AI create it
- **Smart Element Placement** - Intelligent layout suggestions
- **Color Palette Generation** - AI-suggested color schemes
- **Multiple AI Models** - GPT-4 and Claude integration

### 📸 Stock Photos & Assets
- **Millions of Free Photos** - Direct Pexels integration
- **1000+ Google Fonts** - Complete typography library
- **Design Elements** - Icons, shapes, illustrations
- **Professional Templates** - Ready-to-use designs for every need

### 🎬 Video Editor
- **Timeline-Based Editing** - Multi-track video composition
- **Drag & Resize** - Intuitive video manipulation
- **Multiple Export Formats** - MP4, WebM, GIF support
- **Frame-by-Frame Control** - Precise video editing

### 🎨 Professional Tools
- **Advanced Layer Management** - Group, lock, blend modes
- **Smart Alignment** - Guides and snap-to-grid
- **Background Removal** - AI-powered image editing
- **Custom Dimensions** - Any size, any format
- **Export Options** - PNG, JPG, PDF, SVG, MP4, WebM, GIF
- **Copy/Paste & Duplicate** - Efficient workflow
- **Undo/Redo Support** - Never lose your progress
- **Context Menus** - Quick access to actions
- **Animation Effects** - Fade, Bounce, Shake, Scale, Rotate, Flash

### ☁️ Cloud & Collaboration
- **Auto-Save** - Never lose your work
- **Cloud Storage** - Access designs anywhere
- **Real-Time Collaboration** - Work together seamlessly
- **Version History** - Track design changes

---

## 🚀 Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Aadilhassan/Marketifyall-design-Editor.git
cd Marketifyall-design-Editor
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm start
```

4. **Open in browser**
```
http://localhost:3000
```

The app will automatically open in your default browser at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

The optimized production build will be in the `build/` directory, ready for deployment.

---

## 🛠️ Tech Stack

- **Frontend Framework**: React 17 + TypeScript
- **UI Library**: BaseUI 10 (from MUI)
- **Canvas Engine**: @nkyo/scenify-sdk + FabricJS
- **State Management**: Redux Toolkit
- **Routing**: React Router
- **Styling**: BaseUI Styled Components + Styletron
- **AI Integration**: OpenAI GPT-4, Anthropic Claude
- **Stock Photos**: Pexels API
- **Video Processing**: MediaRecorder API, Canvas API

---

## 📂 Project Structure

```
Marketifyall-design-Editor/
├── public/              # Static assets
│   ├── data/            # JSON data files
│   └── index.html       # HTML template
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Navigation/  # Header navigation
│   │   ├── Loading/     # Loading states
│   │   ├── Login/       # Authentication
│   │   └── ...
│   ├── scenes/          # Page components
│   │   ├── Landing/     # Home page
│   │   ├── About/       # About page
│   │   ├── Features/    # Features page
│   │   ├── Contact/     # Contact page
│   │   ├── Editor/      # Main design editor
│   │   │   ├── components/
│   │   │   │   ├── Navbar/
│   │   │   │   ├── Footer/
│   │   │   │   ├── Panels/
│   │   │   │   └── Toolbox/
│   │   └── Dashboard/   # User dashboard
│   ├── store/           # Redux store & slices
│   │   └── slices/      # Redux slices
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   ├── contexts/        # React contexts
│   ├── constants/       # App constants
│   └── hooks/           # Custom React hooks
├── database/            # Database schemas
│   └── migrations/      # SQL migrations
└── packages/            # Monorepo packages
    └── design-editor-kit/
```

---

## 🎯 Usage Examples

### Creating a Social Media Post

1. Click "Start Designing" from the homepage
2. Choose a template or start from scratch
3. Select custom dimensions (1080x1080 for Instagram)
4. Add text, images, and design elements
5. Apply animations and effects
6. Export as PNG or JPG

### Using AI Design Generation

1. Open the AI panel in the editor
2. Describe your design idea in natural language
3. Select AI model (GPT-4 or Claude)
4. Review and customize the AI-generated design
5. Export or continue editing

### Creating Video Content

1. Add video to canvas from the Video panel
2. Use timeline editor to arrange clips
3. Drag and resize video overlay on canvas
4. Add graphics, text, and effects
5. Adjust duration and FPS settings
6. Export as MP4, WebM, or GIF

### Working with Layers

1. Add multiple elements to your canvas
2. Use the layers panel to organize
3. Group related elements together
4. Lock layers to prevent accidental edits
5. Adjust z-index by dragging layers
6. Show/hide layers as needed

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Report Bugs** - Found an issue? [Create a bug report](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues)
- ✨ **Suggest Features** - Have an idea? [Request a feature](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues)
- 📖 **Improve Documentation** - Help others understand the project better
- 💻 **Submit Pull Requests** - Fix bugs or add new features

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Use TypeScript for type safety
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Ensure all lint checks pass

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏢 About

**Design Editor** is built and maintained by:

### QuickShift Labs
Technology company focused on building tools that accelerate creative workflows and empower businesses.

🌐 [quickshiftlabs.com](http://quickshiftlabs.com/)

### Marketifyall
Complete marketing and creative toolkit for businesses, creators, and marketers.

🌐 [marketifyall.com](https://marketifyall.com/)

---

## 🔗 Links

- **Live Demo**: [design.marketifyall.com](https://design.marketifyall.com/)
- **GitHub**: [github.com/Aadilhassan/Marketifyall-design-Editor](https://github.com/Aadilhassan/Marketifyall-design-Editor)
- **Homepage**: [marketifyall.com](https://marketifyall.com/)
- **Company**: [quickshiftlabs.com](http://quickshiftlabs.com/)

---

## 🙏 Acknowledgments

- **Pexels** - Free stock photos API
- **Google Fonts** - Typography library
- **Scenify SDK** - Canvas engine with rich features
- **FabricJS** - Interactive object model for canvas
- **BaseUI** - UI component library from MUI
- **React Community** - Amazing ecosystem and tools

---

## 📊 Project Status

![GitHub Stars](https://img.shields.io/github/stars/Aadilhassan/Marketifyall-design-Editor?style=social)
![GitHub Forks](https://img.shields.io/github/forks/Aadilhassan/Marketifyall-design-Editor?style=social)
![GitHub Issues](https://img.shields.io/github/issues/Aadilhassan/Marketifyall-design-Editor)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/Aadilhassan/Marketifyall-design-Editor)

---

## 💬 Community & Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues)
- 💡 **Discussions**: [GitHub Discussions](https://github.com/Aadilhassan/Marketifyall-design-Editor/discussions)
- 📧 **Email**: support@marketifyall.com
- 🐦 **Twitter**: [@marketifyall](https://twitter.com/marketifyall)

---

## 🗺️ Roadmap

### Current Features
- ✅ AI-powered design generation
- ✅ Stock photo integration (Pexels)
- ✅ 1000+ Google Fonts
- ✅ Video editor with timeline
- ✅ Layer management
- ✅ Animation effects
- ✅ Multiple export formats
- ✅ Undo/redo support
- ✅ Guidelines and snapping

### Upcoming Features
- [ ] Real-time collaboration
- [ ] Mobile app (iOS & Android)
- [ ] Plugin/Extension system
- [ ] Advanced animation timeline
- [ ] Brand kit management
- [ ] Team workspaces
- [ ] API for integrations
- [ ] Desktop app (Electron)
- [ ] Background removal AI
- [ ] Magic resize for multiple formats
- [ ] Template marketplace

---

## 📸 Screenshots

<img width="960" alt="Design Editor Interface" src="https://raw.githubusercontent.com/Aadilhassan/Marketifyall-design-Editor/refs/heads/main/public/screenshot/brave_screenshot_localhost.png">

<img width="960" alt="Video Editor Interface" src="https://raw.githubusercontent.com/Aadilhassan/Marketifyall-design-Editor/refs/heads/main/public/screenshot/screenshot2.png">

*Main design editor interface with panels and canvas*

---

## 🚦 Quick Start Guide

### For Designers
1. Visit [design.marketifyall.com](https://design.marketifyall.com/)
2. Click "Start Designing"
3. Choose a template or custom size
4. Start creating!

### For Developers
1. Clone and install dependencies
2. Run `npm start` to start dev server
3. Make your changes
4. Submit a pull request

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ by [QuickShift Labs](http://quickshiftlabs.com/) & [Marketifyall](https://marketifyall.com/)

[Report Bug](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues) • [Request Feature](https://github.com/Aadilhassan/Marketifyall-design-Editor/issues) • [Contribute](https://github.com/Aadilhassan/Marketifyall-design-Editor/pulls)

</div>
