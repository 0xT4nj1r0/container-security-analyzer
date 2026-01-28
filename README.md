# Container Security Analyzer

A web-based tool that analyzes docker-compose files for security vulnerabilities and automatically generates patched configurations with highlighted vulnerable lines.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-5.4.2-646cff.svg)

## 🌐 Live Demo

**Try it now:** [https://container-security-analyzer.vercel.app/](https://container-security-analyzer.vercel.app/)

## 🎯 What Does It Do?

This tool analyzes your `docker-compose.yml` files to identify security vulnerabilities such as privileged mode, dangerous volume mounts, and host namespace sharing. It then generates a **secure, patched version** while preserving all safe configurations and functionality.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/container-security-analyzer.git
   cd container-security-analyzer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173
   ```

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder, ready to deploy to any static hosting service.

## 📁 Project Structure

```
container-security-analyzer/
├── index.html                      # Entry HTML file
├── package.json                    # Dependencies and scripts
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
│
└── src/
    ├── main.jsx                    # React entry point
    ├── App.jsx                     # Root component
    ├── index.css                   # Global styles (Tailwind)
    │
    ├── components/                 # React components
    │   ├── ContainerSecurityAnalyzer.jsx   # Main application component
    │   ├── InputTab.jsx                    # Input interface for compose files
    │   ├── AnalysisTab.jsx                 # Security analysis results with severity tabs
    │   └── PatchedTab.jsx                  # Side-by-side diff viewer
    │
    ├── utils/                      # Utility functions
    │   ├── yamlParser.js                   # YAML parsing and serialization
    │   ├── securityAnalyzer.js             # Security vulnerability detection
    │   └── patcher.js                      # Line-by-line patching logic
    │
    └── constants/                  # Constants and configurations
        └── index.js                        # Severity metadata & sample files
```

## 🔧 How It Works

1. **Input Tab:** Paste your `docker-compose.yml` file or click "Load Sample" to test
2. **Analysis Tab:** View detected vulnerabilities organized by severity (Critical, High, Medium, Low)
3. **Patched Output Tab:** See side-by-side comparison with vulnerable lines highlighted in red

### Key Features

✅ **Line-by-line patching** - Preserves formatting, comments, and blank lines  
✅ **Smart highlighting** - Only vulnerable lines are marked in red  
✅ **Severity-based tabs** - Organize issues by Critical, High, Medium, Low  
✅ **Dynamic tabs** - Only show severity levels that have issues  
✅ **Copy patched output** - One-click copy of the secure configuration  
✅ **Preserves functionality** - Keeps all safe volumes, ports, and configurations  

## 🧪 Example

**Original (Vulnerable):**
```yaml
webapp:
  image: nginx:alpine
  privileged: true              # ← Highlighted in RED
  volumes:
    - /:/host                   # ← Highlighted in RED (dangerous)
    - ./html:/usr/share/nginx   # ← Safe, preserved
```

**Patched (Secure):**
```yaml
webapp:
  image: nginx:alpine
  volumes:
    - ./html:/usr/share/nginx   # ← Safe volume preserved
  user: "1000:1000"              # ← Added for security
  read_only: true                # ← Added for security
```

## 📦 Dependencies

### Production
- `react` - UI framework
- `react-dom` - React DOM rendering
- `js-yaml` - YAML parsing and serialization
- `lucide-react` - Icon library

### Development
- `vite` - Build tool and dev server
- `@vitejs/plugin-react` - React plugin for Vite
- `tailwindcss` - Utility-first CSS framework
- `autoprefixer` - PostCSS plugin for vendor prefixes
- `postcss` - CSS processing

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server (with hot reload)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Code Style

This project uses:
- **ES6+ JavaScript**
- **React Hooks** for state management
- **Tailwind CSS** for styling
- **Modular architecture** for maintainability

## 🔐 Security Checks

The analyzer detects the following vulnerabilities:

| Severity | Check |
|----------|-------|
| 🔴 Critical | Privileged mode enabled |
| 🔴 Critical | Docker socket exposed |
| 🔴 Critical | Host root filesystem mounted |
| 🟠 High | Host network mode |
| 🟠 High | Host PID namespace shared |
| 🟡 Medium | Host IPC namespace shared |
| 🟡 Medium | Seccomp disabled |
| 🟡 Medium | AppArmor disabled |
| 🟡 Medium | Running as root (no user set) |
| ⚪ Low | Host UTS namespace shared |
| ⚪ Low | Root filesystem not read-only |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Vite](https://vitejs.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Made with ❤️ for container security**
