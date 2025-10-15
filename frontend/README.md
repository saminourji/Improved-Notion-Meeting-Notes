# Frontend - Improved Notion Meeting Notes

Next.js frontend for the Improved Notion Meeting Notes application with speaker detection and AI-powered meeting analysis.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **React 18** - UI library with hooks and context
- **BlockNote** - Rich text editor for meeting notes
- **Tailwind CSS** - Utility-first styling
- **Convex** - Real-time database and backend
- **TypeScript** - Type-safe development

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Key Components

- **Meeting Blocks** - Interactive meeting recording and processing
- **Speaker Management** - Voice profile enrollment and management
- **Transcript Display** - Searchable transcript with speaker identification
- **Action Items** - Personalized task lists per speaker
- **Document Editor** - BlockNote-powered rich text editing

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
├── lib/                    # Utilities and API services
├── hooks/                  # Custom React hooks
├── convex/                 # Convex database schema and functions
└── public/                 # Static assets
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

## API Integration

The frontend communicates with the FastAPI backend for:
- Meeting audio processing
- Speaker diarization and matching
- AI-powered summary generation
- Action item extraction

## Documentation

For complete setup instructions and project overview, see the [main README](../README.md).

For backend documentation, see [backend/README.md](../backend/README.md).