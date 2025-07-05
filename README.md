# UXR Pain Point Analysis Tool

A powerful web-based tool for UX researchers to analyze and categorize pain points from user interview transcripts across the Statement of Work (SOW) lifecycle.

## 🚀 Features

- **📝 AI-Powered Transcript Processing**: Upload interview transcripts to automatically extract and categorize pain points using OpenAI
- **🎯 10 Lifecycle Stages**: Organize pain points across the complete SOW lifecycle from requirements to retrospective
- **🔥 Heat Map Visualization**: Visual indicators showing problem areas with 5 levels of color-coded intensity
- **🤖 Comprehensive Analysis**: Get AI-powered insights including themes, severity analysis, root causes, and recommendations
- **💾 Persistent Storage**: Pain points and analysis are saved locally between sessions
- **🎨 Drag & Drop Interface**: Easily reorganize pain points between lifecycle stages
- **📊 Priority Matrix**: 2x2 matrix visualization showing impact vs effort for identified issues
- **🎛️ Model Selection**: Choose from available OpenAI models (GPT-4, GPT-3.5, O1, O3, O4 series)
- **🍎 Apple-Inspired Design**: Clean, professional interface following Apple's design principles

## 📋 Lifecycle Stages

1. **Requirements Gathering** - Understanding client needs and expectations
2. **Stakeholder Alignment** - Getting team and stakeholder buy-in
3. **Initial Creation** - Drafting the SOW document
4. **Internal Review** - Quality check and approval process
5. **Client Presentation** - Presenting to the client
6. **Negotiation & Revisions** - Working through changes
7. **Signature Collection** - Getting final approvals
8. **Handoff to Delivery** - Transitioning to execution
9. **Project Tracking** - Monitoring progress
10. **Retrospective** - Learning and improvement

## 🛠️ Installation

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn
- OpenAI API key with access to GPT-4 (required for transcript analysis)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/uxr-pain-point-analysis.git
cd uxr
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.local.example .env.local
```

4. **Edit `.env.local` and add your OpenAI API key**
```
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> **Getting an API Key:**
> 1. Visit [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> 2. Sign up or log in to your OpenAI account
> 3. Click "Create new secret key"
> 4. Copy the key (you won't be able to see it again!)
> 5. Make sure your account has credits or a payment method

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

> **Note:** If port 3000 is busy, Next.js will automatically use the next available port (3001, 3002, etc.)

### Troubleshooting Setup

**"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**OpenAI API errors:**
- Verify your API key is correct in `.env.local`
- Check that your OpenAI account has available credits
- Ensure the API key has the necessary permissions

**Port already in use:**
```bash
# Find what's using port 3000
lsof -i :3000
# Kill the process or use a different port
npm run dev -- -p 3001
```

### First Time Setup - Testing the App

1. **Use example transcripts** (located in `examples/` folder):
   - Click "Upload Transcript"
   - Select `examples/sample-interview.txt`
   - Watch as AI extracts and categorizes pain points

2. **Or create manual pain points** to test:
   - Click "+ Add Pain Point"
   - Example entries:
     - Title: "Requirements unclear"
     - Details: "Client keeps changing requirements after initial meetings"
     - Severity: High
     - Stage: Requirements Gathering
     - Source: "Initial testing"

3. **Test the analysis feature**:
   - Add 5-10 pain points across different stages
   - Click "Analyze Pain Points"
   - Review the AI-generated insights

## 📖 Usage Guide

### Adding Pain Points Manually
1. Click the **"+ Add Pain Point"** button
2. Fill in the pain point details:
   - **Title**: Brief description (2-5 words)
   - **Details**: Full context and description
   - **Severity**: Low, Medium, or High
   - **Stage**: Select the lifecycle stage
   - **Source**: Reference (e.g., "User Interview #3")
3. Click **"Add Pain Point"** to save

### Processing Interview Transcripts
1. Click **"Upload Transcript"**
2. Select a text file containing interview transcripts
3. The AI will automatically:
   - Extract pain points from conversations
   - Categorize by lifecycle stage
   - Assign severity levels
   - Add source references
4. Review and adjust categorization as needed

### Analyzing Pain Points
1. Click **"Analyze Pain Points"** after collecting several pain points
2. View comprehensive analysis including:
   - **Common Themes**: Patterns across pain points
   - **Severity Distribution**: Heat map by stage
   - **Root Causes**: Underlying issues
   - **Priority Matrix**: Impact vs Effort quadrants
   - **Recommendations**: Actionable next steps

### Model Selection
- Use the dropdown menu in the header to select different AI models
- Models are automatically fetched from your OpenAI account
- Different models may provide varying analysis quality and speed

### Managing Pain Points
- **Drag & Drop**: Click and drag pain points between stages
- **Delete**: Click the × button on any pain point card
- **Clear All**: Remove all pain points and start fresh
- **Export**: Download your analysis as JSON

## 🏗️ Project Structure

```
uxr/
├── app/
│   ├── api/
│   │   ├── analyze-painpoints/    # Pain point analysis endpoint
│   │   ├── extract-painpoints/    # Transcript processing endpoint
│   │   └── models/                # OpenAI model listing
│   ├── components/
│   │   ├── AnalysisModal.tsx      # Analysis results display
│   │   ├── LifecycleStage.tsx     # Stage column component
│   │   ├── PainPointCard.tsx      # Individual pain point
│   │   ├── PainPointModal.tsx     # Add/edit pain point form
│   │   └── PainPointStack.tsx     # Grouped pain points
│   ├── types/
│   │   └── index.ts               # TypeScript definitions
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   ├── lifecycle-stages.json      # Stage configuration
│   └── page.tsx                   # Main application
├── public/                        # Static assets
├── transcripts/                   # Example transcript files (ignored by git)
├── examples/                      # Example files for testing
├── .env.local.example            # Environment template
├── .env.local                    # Your API keys (ignored by git)
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── README.md                     # This file
```

## 💻 Development

### Common Development Tasks

**Running tests:**
```bash
npm run test        # Run tests (if configured)
npm run lint        # Check code style
npm run type-check  # Check TypeScript types
```

**Building for production:**
```bash
npm run build       # Create production build
npm run start       # Run production server
```

**Updating dependencies:**
```bash
npm update          # Update to latest minor versions
npm outdated        # Check for outdated packages
```

### Making Changes

1. **Modifying lifecycle stages:**
   - Edit `app/lifecycle-stages.json`
   - Update TypeScript types in `app/types/index.ts`

2. **Changing AI prompts:**
   - Transcript analysis: `app/api/extract-painpoints/route.ts`
   - Pain point analysis: `app/api/analyze-painpoints/route.ts`

3. **Updating styles:**
   - Global styles: `app/globals.css`
   - Component styles are inline using Tailwind classes

4. **Adding new features:**
   - Create new components in `app/components/`
   - Add API routes in `app/api/`
   - Update types in `app/types/index.ts`

## 🛡️ Security Considerations

- API keys are stored in `.env.local` and never committed to version control
- All API calls are made server-side to protect credentials
- `.gitignore` is configured to exclude sensitive files
- No sensitive data is stored in localStorage

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add `OPENAI_API_KEY` environment variable
4. Deploy

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Self-hosted with Node.js

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add TypeScript types for new features
- Test with multiple transcript formats
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- AI powered by [OpenAI](https://openai.com/)
- Design inspired by [Apple Human Interface Guidelines](https://developer.apple.com/design/)
- Icons from [Heroicons](https://heroicons.com/)

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: [matt.kim@me.com]

---

Made with ❤️ for UX Researchers