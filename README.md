# Mindmap PM - Linear Issues Viewer

A web application for viewing and visualizing Linear issues with interactive mindmap functionality.

## Features

- **Linear API Integration**: Fetch and display issues from Linear
- **Table View**: Traditional table display of issues with sorting and filtering
- **Interactive Mindmap**: D3.js-powered mindmap visualization of issues
- **Token Caching**: Automatically cache Linear API tokens for convenience
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
mindmap-pm/
├── src/
│   ├── server/                 # Backend Express server
│   │   ├── app.js             # Main Express application
│   │   ├── routes/            # API route handlers
│   │   │   └── api.js         # Linear API proxy routes
│   │   └── middleware/        # Express middleware
│   │       └── cors.js        # CORS configuration
│   ├── client/                # Frontend application
│   │   ├── index.html         # Main HTML page
│   │   ├── css/               # Stylesheets
│   │   │   └── style.css      # Main styles
│   │   └── js/                # JavaScript modules
│   │       ├── main.js        # Main application logic
│   │       ├── utils/         # Utility functions
│   │       │   └── api.js     # API communication utilities
│   │       └── components/    # UI components
│   │           ├── mindmap/   # Mindmap visualization
│   │           │   ├── mindmap-d3.js    # D3.js mindmap implementation
│   │           │   └── mindmap-utils.js # Mindmap utilities
│   │           └── dialogs/   # Modal dialogs
│   │               └── issue-dialog.js  # Issue editing dialog
│   └── shared/                # Shared constants and utilities
│       └── constants.js       # Application constants
├── tests/                     # Test files
├── public/                    # Static assets (if needed)
├── package.json              # Dependencies and scripts
└── server.js                 # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Linear API token

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mindmap-pm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file (or modify the path in server.js):
   ```
   LINEAR_API_KEY=your_linear_api_token_here
   ```

4. Start the development server:
   ```bash
   node server.js /path/to/.env
   ```
or set the env variable LINEAR_API_KEY in some different way and then run

```bash
node server.js
```

5. Open your browser and navigate to `http://localhost:3000`

### Usage

1. **Enter Linear API Token**: if neither .env file was passed nor env var set 
2. **View Issues**: Issues will be displayed in a table format
3. **Switch to Mindmap**: Use the tab navigation to switch to the interactive mindmap view
4. **Interact with Mindmap**:
   - Double-click nodes to edit
   - Drag nodes to reposition
   - Right-click for context menu options
   - Use keyboard shortcuts (Tab, Delete)

### API Endpoints

- `GET /api/token-status` - Check if a cached token is available
- `GET /api/cached-token` - Retrieve cached Linear API token
- `POST /api/linear` - Proxy requests to Linear GraphQL API

### Development

The application is organized into logical modules:

- **Server**: Express.js backend with API proxy functionality
- **Client**: Vanilla JavaScript frontend with modular components
- **Shared**: Common constants and utilities

### Testing

Run the test suite:
```bash
npm test
```

Individual test suites:
```bash
npm run test:pagination
npm run test:integration
```

## Contributing

1. Follow the established folder structure
2. Keep components modular and focused
3. Add tests for new functionality
4. Update documentation as needed

## License

Private project - All rights reserved.